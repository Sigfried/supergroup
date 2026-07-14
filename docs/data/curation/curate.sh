#!/bin/sh
# Rebuild the synthea/vocab demo extracts in docs/data/.
# Requires: curl, duckdb, psql with an OMOP vocabulary at db n3c, schema n3c.
# Data: synthea1k from the AWS open-data bucket (public, no credentials).
set -e
cd "$(dirname "$0")"
work=$(mktemp -d)
base=https://synthea-omop.s3.amazonaws.com/synthea1k
for t in person condition_era drug_era; do
  curl -s "$base/$t.csv" -o "$work/$t.csv"
done

duckdb -c "
COPY (SELECT DISTINCT condition_concept_id FROM '$work/condition_era.csv') TO '$work/cond_ids.csv' (HEADER false);
COPY (SELECT DISTINCT drug_concept_id FROM '$work/drug_era.csv') TO '$work/drug_ids.csv' (HEADER false);
"

psql -X -d n3c -At <<SQL
\\set ON_ERROR_STOP on
create temp table demo_drug_ids (concept_id bigint);
\\copy demo_drug_ids from '$work/drug_ids.csv' with (format csv)
create temp table demo_cond_ids (concept_id bigint);
\\copy demo_cond_ids from '$work/cond_ids.csv' with (format csv)

-- Direct ancestors of the demo drug ids, restricted to ATC/RxNorm.
create temp table drug_closure_seed as
  select distinct ca.ancestor_concept_id as concept_id
  from n3c.concept_ancestor ca
  join demo_drug_ids d on ca.descendant_concept_id = d.concept_id
  join n3c.concept c on c.concept_id = ca.ancestor_concept_id
    and c.vocabulary_id in ('ATC','RxNorm')
  union
  select concept_id from demo_drug_ids;

-- concept_ancestor only records ancestor-of-a-*demo-id* pairs, not
-- ancestor-of-an-ancestor: e.g. an ATC5 node reached above may itself have
-- ATC4/3/2/1 ancestors that never appear because they aren't ancestors of a
-- raw demo id directly. One more closure pass over the seed set pulls those
-- in (verified to reach a fixed point after a single extra pass on this
-- vocabulary snapshot); without it, mid-hierarchy ATC classes wrongly show
-- up as roots in drug-classes.json.
create temp table drug_closure as
  select distinct ca.ancestor_concept_id as concept_id
  from n3c.concept_ancestor ca
  join drug_closure_seed d on ca.descendant_concept_id = d.concept_id
  join n3c.concept c on c.concept_id = ca.ancestor_concept_id
    and c.vocabulary_id in ('ATC','RxNorm')
  union
  select concept_id from drug_closure_seed;

create temp table drug_edges as
  select ca.ancestor_concept_id as parent_id, ca.descendant_concept_id as child_id
  from n3c.concept_ancestor ca
  where ca.min_levels_of_separation = 1
    and ca.ancestor_concept_id in (select concept_id from drug_closure)
    and ca.descendant_concept_id in (select concept_id from drug_closure);

\\copy (select c.concept_id, c.concept_name, c.vocabulary_id, c.concept_class_id from n3c.concept c join drug_closure cl on c.concept_id = cl.concept_id) to '$work/drug_nodes.csv' with (format csv, header)
\\copy (select parent_id, child_id from drug_edges) to '$work/drug_edges.csv' with (format csv, header)
\\copy (select c.concept_id, c.concept_name from n3c.concept c join demo_cond_ids d on c.concept_id = d.concept_id) to '$work/cond_names.csv' with (format csv, header)
\\copy (select c.concept_id, c.concept_name from n3c.concept c join demo_drug_ids d on c.concept_id = d.concept_id) to '$work/drug_names.csv' with (format csv, header)
SQL

duckdb -c "
COPY (
  SELECT e.person_id, e.condition_era_start_date AS start_date,
         e.condition_concept_id AS concept_id, n.concept_name AS condition
  FROM '$work/condition_era.csv' e
  JOIN '$work/cond_names.csv' n ON e.condition_concept_id = n.concept_id
  ORDER BY e.person_id, start_date
) TO '../synthea-conditions.csv' (HEADER);
COPY (
  SELECT e.person_id, e.drug_era_start_date AS start_date,
         e.drug_concept_id AS concept_id, n.concept_name AS drug
  FROM '$work/drug_era.csv' e
  JOIN '$work/drug_names.csv' n ON e.drug_concept_id = n.concept_id
  ORDER BY e.person_id, start_date
) TO '../synthea-drugs.csv' (HEADER);
COPY (
  SELECT person_id,
         CASE gender_concept_id WHEN 8507 THEN 'M' WHEN 8532 THEN 'F' ELSE 'other' END AS gender,
         year_of_birth, race_source_value AS race
  FROM '$work/person.csv'
) TO '../synthea-persons.csv' (HEADER);
COPY (
  SELECT CAST(n.concept_id AS VARCHAR) AS id,
         n.concept_name AS name,
         n.vocabulary_id AS vocab,
         n.concept_class_id AS \"class\",
         coalesce(list(CAST(e.parent_id AS VARCHAR)) FILTER (e.parent_id IS NOT NULL), []) AS \"parentIds\"
  FROM '$work/drug_nodes.csv' n
  LEFT JOIN '$work/drug_edges.csv' e ON n.concept_id = e.child_id
  GROUP BY 1, 2, 3, 4
  ORDER BY 1
) TO '../drug-classes.json' (FORMAT json, ARRAY true);
"
rm -rf "$work"
echo "done; extracts written to docs/data/"
