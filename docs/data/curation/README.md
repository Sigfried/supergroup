# Curation: synthea/vocab clinical demo extracts

`curate.sh` rebuilds four demo datasets in `docs/data/` from the public
synthea1k OMOP extract joined against a local OMOP vocabulary (SNOMED,
ATC, RxNorm) in postgres. Re-run it whenever the source data or the
join logic changes:

```sh
sh docs/data/curation/curate.sh
```

## Requirements

- `curl` (fetches the synthea1k CSVs from the public AWS open-data S3
  bucket — no credentials needed)
- `duckdb` (CSV shaping and JSON export)
- `psql` reaching a postgres database `n3c` with an OMOP vocabulary
  loaded in schema `n3c` (tables `concept`, `concept_ancestor`,
  `concept_relationship`)

## Outputs

- `docs/data/synthea-conditions.csv` — one row per condition era
  (`person_id, start_date, concept_id, condition`), SNOMED condition
  names joined in.
- `docs/data/synthea-drugs.csv` — one row per drug era (`person_id,
  start_date, concept_id, drug`), RxNorm drug names joined in.
- `docs/data/synthea-persons.csv` — one row per patient (`person_id,
  gender, year_of_birth, race`); gender is normalized to `M`/`F`/`other`.
- `docs/data/drug-classes.json` — the ATC + RxNorm classification
  closure over every drug concept used by the cohort: a JSON array of
  `{id, name, vocab, class, parentIds}` objects (string ids,
  `parentIds` always an array), ready for `fromParentIds`.

## Notes on the classification closure

The drug closure starts as the set of demo drug concept ids plus every
ATC/RxNorm ancestor of those ids in `concept_ancestor`. Because
`concept_ancestor` records ancestor-of-a-raw-id pairs rather than a
fully materialized transitive closure, that first pass can miss
mid-hierarchy ATC nodes whose only path back to a demo drug id runs
through another non-demo ancestor (e.g. ATC4 reachable only via an
ATC5 node that isn't itself a drug era concept). `curate.sh` runs one
additional closure pass over the seed set to pull those in; this was
verified to reach a fixed point after a single extra pass on this
vocabulary snapshot. Without it, ATC 3rd/4th/5th-level classes show up
as spurious roots (empty `parentIds`) instead of just the 14 ATC
1st-level classes.

Edges use `concept_ancestor` rows with `min_levels_of_separation = 1`
restricted to node ids present in the closure (direct-parent edges,
not the full transitive closure — `fromParentIds` reconstructs
ancestry itself).

## Future scaling

This extract is intentionally small (synthea1k, three OMOP tables:
`person`, `condition_era`, `drug_era`). Scaling up to a larger cohort
(e.g. synthea100k) and/or pulling in more OMOP tables (visits,
measurements, procedures) is intended for a future lifeflow/timelines
demo, not this task.
