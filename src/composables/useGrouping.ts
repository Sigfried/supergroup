/**
 * Core grouping composable for Vue.js applications
 * Provides reactive grouping functionality
 */

import { ref, computed, isRef, type Ref, type ComputedRef } from 'vue';
import _ from 'lodash';
import { 
  isNumericGroup, 
  filterOutEmpty, 
  multiValuedGroupBy 
} from '../utils/groupHelpers';
import type {
  GroupingOptions,
  GroupValue,
  GroupResult,
  Dimension,
  UseGroupingReturn
} from '../types';

/**
 * Main grouping composable
 * @param records - Records to group (can be reactive)
 * @param dimensions - Single dimension or array for multi-level
 * @param options - Grouping options
 * @returns Reactive grouping result with helper methods
 */
export function useGrouping<T extends Record<string, any>>(
  records: T[] | Ref<T[]>,
  dimensions: Dimension<T> | Ref<Dimension<T>>,
  options: GroupingOptions | Ref<GroupingOptions> = {}
): UseGroupingReturn<T> {
  // Keep reactivity by checking if already a ref
  const recordsRef = isRef(records) ? records : ref(records);
  const dimensionsRef = isRef(dimensions) ? dimensions : ref(dimensions);
  const optionsRef = isRef(options) ? options : ref(options);

  /**
   * Core grouping logic for single dimension
   */
  const groupByDimension = (
    recs: T[],
    dim: keyof T | ((record: T) => string | number),
    opts: GroupingOptions
  ): GroupResult<T> => {
    const childProp = opts.childProp || 'children';
    
    // Clone records with index tracking
    const clonedRecs = recs.map((rec, i) => ({
      ...rec,
      _recIdx: i
    }));

    // Apply pre-processing hook if provided
    const processedRecs = opts.preListRecsHook ? 
      opts.preListRecsHook(clonedRecs) : clonedRecs;

    // Perform grouping
    let groups: Record<string, T[]>;
    if (opts.multiValuedGroup) {
      const dimFunc = typeof dim === 'function' ? dim : (d: T) => d[dim as keyof T];
      const arrayDim = (val: T): (string | number)[] => {
        const retVal = dimFunc(val);
        return Array.isArray(retVal) ? retVal : [retVal];
      };
      groups = multiValuedGroupBy(processedRecs, arrayDim);
    } else {
      if (opts.truncateBranchOnEmptyVal) {
        const filtered = filterOutEmpty(processedRecs, dim);
        groups = _.groupBy(filtered, dim as any);
      } else {
        groups = _.groupBy(processedRecs, dim as any);
      }
    }

    // Exclude specific values if specified
    if (opts.excludeValues) {
      opts.excludeValues.forEach(val => {
        delete groups[String(val)];
      });
    }

    // Determine if group is numeric
    const isNumeric = _.has(opts, 'isNumeric') ? 
      opts.isNumeric! : isNumericGroup(groups);

    // Create group values
    const groupValues: GroupValue<T>[] = _.map(_.toPairs(groups), ([key, groupRecs]) => {
      const value: GroupValue<T> = {
        value: isNumeric ? Number(key) : String(key),
        rawValue: key,
        records: groupRecs,
        dim: opts.dimName || dim,
        depth: opts.parent ? (opts.parent.depth + 1) : 0,
        parent: opts.parent || null,
        [childProp]: null
      };

      return value;
    });

    // Create list metadata
    const result: GroupResult<T> = {
      values: groupValues,
      records: clonedRecs,
      dim: opts.dimName || dim,
      isNumeric,
      childProp
    };

    return result;
  };

  /**
   * Multi-level grouping
   */
  const groupByMultipleDimensions = (
    recs: T[],
    dims: (keyof T | ((record: T) => string | number))[],
    opts: GroupingOptions
  ): GroupResult<T> => {
    let currentGroup = groupByDimension(recs, dims[0], opts);
    
    // Add subsequent levels
    for (let i = 1; i < dims.length; i++) {
      const dim = dims[i];
      currentGroup.values.forEach(val => {
        const childGroup = groupByDimension(
          val.records, 
          dim, 
          { ...opts, parent: val }
        );
        val[currentGroup.childProp] = childGroup.values;
      });
    }
    
    return currentGroup;
  };

  /**
   * Computed grouped result
   */
  const grouped: ComputedRef<GroupResult<T>> = computed(() => {
    const recs = recordsRef.value as T[];
    const dims = dimensionsRef.value;
    const opts = optionsRef.value;

    if (!recs || recs.length === 0) {
      return {
        values: [],
        records: [],
        dim: null as any,
        isNumeric: false,
        childProp: opts.childProp || 'children'
      };
    }

    if (Array.isArray(dims)) {
      return groupByMultipleDimensions(recs, dims, opts);
    } else {
      return groupByDimension(recs, dims, opts);
    }
  });

  /**
   * Helper methods
   */
  const methods = {
    // Get all values as plain array
    rawValues: computed(() => 
      grouped.value.values.map(v => v.value)
    ),

    // Get all records
    allRecords: computed(() => grouped.value.records),

    // Lookup a value
    lookup: (query: string | number | (string | number)[]): GroupValue<T> | undefined => {
      const values = grouped.value.values;
      
      if (Array.isArray(query)) {
        // Path lookup for hierarchical groups
        let result = values.find(v => v.value == query[0]);
        for (let i = 1; i < query.length && result; i++) {
          const children = result[grouped.value.childProp] as GroupValue<T>[];
          if (!children) break;
          result = children.find(v => v.value == query[i]);
        }
        return result;
      } else {
        // Single value lookup
        return values.find(v => v.value == query);
      }
    },

    // Add another level of grouping
    addLevel: (newDim: Dimension<T>, newOpts: GroupingOptions = {}): void => {
      const current = grouped.value;
      const childProp = current.childProp;
      
      current.values.forEach(val => {
        if (!val[childProp]) {
          const childGroup = groupByDimension(
            val.records,
            newDim as any,
            { ...newOpts, parent: val }
          );
          val[childProp] = childGroup.values;
        }
      });
    },

    // Get leaf nodes
    leafNodes: computed(() => {
      const childProp = grouped.value.childProp;
      const leaves: GroupValue<T>[] = [];
      
      const findLeaves = (values: GroupValue<T>[]) => {
        values.forEach(val => {
          const children = val[childProp] as GroupValue<T>[];
          if (!children || children.length === 0) {
            leaves.push(val);
          } else {
            findLeaves(children);
          }
        });
      };
      
      findLeaves(grouped.value.values);
      return leaves;
    }),

    // Flatten entire tree
    flattenTree: computed(() => {
      const childProp = grouped.value.childProp;
      const flat: GroupValue<T>[] = [];
      
      const flatten = (values: GroupValue<T>[]) => {
        values.forEach(val => {
          flat.push(val);
          const children = val[childProp] as GroupValue<T>[];
          if (children && children.length > 0) {
            flatten(children);
          }
        });
      };
      
      flatten(grouped.value.values);
      return flat;
    })
  };

  return {
    grouped,
    ...methods
  };
}
