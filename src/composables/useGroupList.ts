/**
 * Composable for working with group lists
 * Provides lookup, sorting, aggregation, and navigation
 */

import { computed, ref, isRef, type Ref, type ComputedRef } from 'vue';
import _ from 'lodash';
import type {
  GroupResult,
  GroupValue,
  PathOptions,
  D3NestEntry,
  D3NestMap,
  UseGroupListReturn
} from '../types';

/**
 * Group list composable
 * @param groupResult - Result from useGrouping (can be a computed ref)
 * @returns List operations and utilities
 */
export function useGroupList<T extends Record<string, any>>(
  groupResult: GroupResult<T> | Ref<GroupResult<T>> | ComputedRef<GroupResult<T>>
): UseGroupListReturn<T> {
  // Keep reactivity - if it's a ref, use it directly
  const groupRef = isRef(groupResult) ? groupResult : ref(groupResult);

  /**
   * Get values array
   */
  const values = computed(() => {
    const group = groupRef.value;
    return (group.values || []) as GroupValue<T>[];
  });

  /**
   * Get child property name
   */
  const childProp: ComputedRef<string> = computed(() => {
    const group = groupRef.value;
    return group.childProp || 'children';
  });

  /**
   * Lookup single value
   */
  const singleLookup = (query: string | number): GroupValue<T> | undefined => {
    return values.value.find(v => v.value == query);
  };

  /**
   * Lookup value or path
   */
  const lookup = (query: string | number | (string | number)[]): GroupValue<T> | undefined => {
    if (Array.isArray(query)) {
      // Path lookup for hierarchical groups
      let result = singleLookup(query[0]);
      
      for (let i = 1; i < query.length && result; i++) {
        const children = result[childProp.value] as GroupValue<T>[];
        if (!children) break;
        result = children.find(v => v.value == query[i]);
      }
      
      return result;
    } else {
      // Single value lookup
      return singleLookup(query);
    }
  };

  /**
   * Lookup multiple values
   */
  const lookupMany = (queries: (string | number)[]): GroupValue<T>[] => {
    return queries
      .map(q => singleLookup(q))
      .filter((v): v is GroupValue<T> => v !== undefined);
  };

  /**
   * Get raw values array
   */
  const rawValues: ComputedRef<(string | number)[]> = computed(() => {
    return values.value.map(v => v.value);
  });

  /**
   * Flatten entire tree into single array
   */
  const flattenTree: ComputedRef<GroupValue<T>[]> = computed(() => {
    const result: GroupValue<T>[] = [];
    const prop = childProp.value;
    
    const flatten = (vals: GroupValue<T>[]) => {
      vals.forEach(val => {
        result.push(val);
        const children = val[prop] as GroupValue<T>[];
        if (children && children.length > 0) {
          flatten(children);
        }
      });
    };
    
    flatten(values.value);
    return result;
  });

  /**
   * Get all leaf nodes
   */
  const leafNodes: ComputedRef<GroupValue<T>[]> = computed(() => {
    const prop = childProp.value;
    return flattenTree.value.filter(v => {
      const children = v[prop] as GroupValue<T>[];
      return !children || children.length === 0;
    });
  });

  /**
   * Get nodes at specific level
   */
  const nodesAtLevel = (level: number): GroupValue<T>[] => {
    if (level === 0) return values.value;
    
    const result: GroupValue<T>[] = [];
    const prop = childProp.value;
    
    const traverse = (vals: GroupValue<T>[], currentLevel: number) => {
      if (currentLevel === level) {
        result.push(...vals);
        return;
      }
      
      vals.forEach(v => {
        const children = v[prop] as GroupValue<T>[];
        if (children && children.length > 0) {
          traverse(children, currentLevel + 1);
        }
      });
    };
    
    traverse(values.value, 0);
    return result;
  };

  /**
   * Get name paths for all values
   */
  const namePaths = (opts: PathOptions = {}): string[] => {
    const delim = opts.delim || '/';
    
    return values.value.map(v => {
      const path: (string | number)[] = [];
      let ptr: GroupValue<T> | null = v;
      
      path.push(ptr.value);
      while (ptr.parent) {
        ptr = ptr.parent;
        path.unshift(ptr.value);
      }
      
      if (opts.noRoot) path.shift();
      if (opts.backwards) path.reverse();
      
      return path.join(delim);
    });
  };

  /**
   * Apply aggregation to all values
   */
  const aggregates = <R>(
    func: (values: any[]) => R,
    field?: keyof T | ((record: T) => any),
    returnType: 'array' | 'dict' = 'array'
  ): R[] | Record<string | number, R> => {
    const results = values.value.map(val => {
      const fieldValues = field
        ? (_.isFunction(field) ? _.map(val.records, field) : _.map(val.records, field))
        : val.records;
      return func(fieldValues);
    });

    if (returnType === 'dict') {
      return _.zipObject(rawValues.value, results) as Record<string | number, R>;
    }
    
    return results;
  };

  /**
   * Sort values
   */
  const sort = (compareFn: (a: GroupValue<T>, b: GroupValue<T>) => number): GroupValue<T>[] => {
    return [...values.value].sort(compareFn);
  };

  /**
   * Sort values by function
   */
  const sortBy = (iteratee: ((value: GroupValue<T>) => any) | keyof GroupValue<T>): GroupValue<T>[] => {
    return _.sortBy(values.value, iteratee as any);
  };

  /**
   * Convert to D3 nest entries format
   */
  const toD3Entries = (): D3NestEntry<T>[] => {
    const prop = childProp.value;
    
    const convert = (vals: GroupValue<T>[]): D3NestEntry<T>[] => {
      return vals.map(val => {
        const children = val[prop] as GroupValue<T>[];
        if (children && children.length > 0) {
          return {
            key: String(val.value),
            values: convert(children)
          };
        }
        return {
          key: String(val.value),
          values: val.records
        };
      });
    };
    
    return convert(values.value);
  };

  /**
   * Convert to D3 nest map format
   */
  const toD3Map = (): D3NestMap<T> => {
    const prop = childProp.value;
    
    const convert = (vals: GroupValue<T>[]): D3NestMap<T> => {
      const result: D3NestMap<T> = {};
      
      vals.forEach(val => {
        const key = String(val.value);
        const children = val[prop] as GroupValue<T>[];
        if (children && children.length > 0) {
          result[key] = convert(children);
        } else {
          result[key] = [...val.records];
        }
      });
      
      return result;
    };
    
    return convert(values.value);
  };

  /**
   * Create root value wrapper
   */
  const asRootVal = (name: string = 'Root', dimName: string = 'root'): GroupValue<T> => {
    const prop = childProp.value;
    const group = groupRef.value;
    
    const rootVal: any = {
      value: name,
      rawValue: name,
      dim: dimName,
      depth: 0,
      records: group.records as T[],
      parent: null,
      [prop]: values.value
    };

    // Update children to reference new root
    values.value.forEach(v => {
      v.parent = rootVal;
      // Update all descendant depths
      const updateDepth = (val: GroupValue<T>, increment: number) => {
        val.depth += increment;
        const children = val[prop] as GroupValue<T>[];
        if (children) {
          children.forEach(child => updateDepth(child, increment));
        }
      };
      updateDepth(v, 1);
    });

    return rootVal;
  };

  /**
   * Get summary string for debugging
   */
  const summary = (depth: number = 0): string => {
    const group = groupRef.value;
    const prop = childProp.value;
    const indent = '    '.repeat(depth);
    const dim = group.dim || 'unknown';
    const vals = values.value.length;
    const recs = group.records ? group.records.length : 0;

    const lines = [`${indent}${String(dim)}, ${recs} recs (${depth}) ${vals} vals:`];
    
    values.value.forEach(val => {
      const valRecs = val.records ? val.records.length : 0;
      const valIndent = '    '.repeat(depth + 1);
      lines.push(`${valIndent}${val.value}, ${valRecs} recs`);
      
      const children = val[prop] as GroupValue<T>[];
      if (children && children.length > 0) {
        lines.push(`${valIndent}has ${children.length} children`);
      }
    });

    return lines.join('\n');
  };

  return {
    values,
    lookup,
    lookupMany,
    rawValues,
    flattenTree,
    leafNodes,
    nodesAtLevel,
    namePaths,
    aggregates,
    sort,
    sortBy,
    toD3Entries,
    toD3Map,
    asRootVal,
    summary
  };
}
