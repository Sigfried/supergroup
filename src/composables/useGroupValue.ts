/**
 * Composable for working with individual group values
 * Provides methods for paths, aggregates, and navigation
 */

import { computed, type ComputedRef } from 'vue';
import _ from 'lodash';
import { createAggregator, calculatePct } from '../utils/groupHelpers';
import type { GroupValue, PathOptions, UseGroupValueReturn } from '../types';

/**
 * Group value composable
 * @param value - Group value object
 * @param childProp - Property name for children (default: 'children')
 * @returns Methods and computed properties for the value
 */
export function useGroupValue<T extends Record<string, any>>(
  value: GroupValue<T>,
  childProp: string = 'children'
): UseGroupValueReturn<T> {
  const val = value;

  /**
   * Get value's children
   */
  const children: ComputedRef<GroupValue<T>[]> = computed(() => {
    return (val[childProp] as GroupValue<T>[]) || [];
  });

  /**
   * Check if value has children
   */
  const hasChildren: ComputedRef<boolean> = computed(() => {
    return children.value && children.value.length > 0;
  });

  /**
   * Get all descendants (recursive)
   */
  const descendants: ComputedRef<GroupValue<T>[]> = computed(() => {
    if (!hasChildren.value) return [];
    
    const result: GroupValue<T>[] = [];
    const traverse = (vals: GroupValue<T>[]) => {
      vals.forEach(v => {
        result.push(v);
        const kids = v[childProp] as GroupValue<T>[];
        if (kids && kids.length > 0) {
          traverse(kids);
        }
      });
    };
    
    traverse(children.value);
    return result;
  });

  /**
   * Get leaf nodes (values with no children)
   */
  const leafNodes: ComputedRef<GroupValue<T>[]> = computed(() => {
    if (!hasChildren.value) return [val];
    
    return descendants.value.filter(v => {
      const kids = v[childProp] as GroupValue<T>[];
      return !kids || kids.length === 0;
    });
  });

  /**
   * Get path from root to this value
   */
  const pedigree: ComputedRef<GroupValue<T>[]> = computed(() => {
    const path: GroupValue<T>[] = [];
    let ptr: GroupValue<T> | null = val;
    
    path.push(ptr);
    while (ptr.parent) {
      ptr = ptr.parent;
      path.unshift(ptr);
    }
    
    return path;
  });

  /**
   * Get name path (string representation)
   */
  const namePath = (opts: PathOptions = {}): string | (string | number)[] => {
    const delim = opts.delim || '/';
    const path = pedigree.value.map(v => v.value);
    
    if (opts.noRoot) path.shift();
    if (opts.backwards) path.reverse();
    
    return opts.asArray ? path : path.join(delim);
  };

  /**
   * Get dimension path
   */
  const dimPath = (opts: PathOptions = {}): string | string[] => {
    const delim = opts.delim || '/';
    const path = pedigree.value.map(v => String(v.dim));
    
    if (opts.noRoot) path.shift();
    if (opts.backwards) path.reverse();
    
    return opts.asArray ? path : path.join(delim);
  };

  /**
   * Calculate aggregate on records
   */
  const aggregate = <R>(
    func: (values: any[]) => R,
    field?: keyof T | ((record: T) => any)
  ): R => {
    return createAggregator(val.records, func, field);
  };

  /**
   * Get percentage of parent
   */
  const pct: ComputedRef<number> = computed(() => {
    if (!val.parent || !val.parent.records) return 1;
    return calculatePct(val.records, val.parent.records);
  });

  /**
   * Get previous sibling
   */
  const previous = (): GroupValue<T> | null => {
    if (!val.parent) return null;
    
    const siblings = val.parent[childProp] as GroupValue<T>[];
    if (!siblings) return null;
    
    const index = siblings.indexOf(val);
    return index > 0 ? siblings[index - 1] : null;
  };

  /**
   * Get next sibling
   */
  const next = (): GroupValue<T> | null => {
    if (!val.parent) return null;
    
    const siblings = val.parent[childProp] as GroupValue<T>[];
    if (!siblings) return null;
    
    const index = siblings.indexOf(val);
    return index < siblings.length - 1 ? siblings[index + 1] : null;
  };

  /**
   * Lookup child by value or path
   */
  const lookup = (query: string | number | (string | number)[]): GroupValue<T> | undefined => {
    if (!hasChildren.value) {
      throw new Error("Cannot lookup on value without children");
    }

    if (Array.isArray(query)) {
      // Path lookup
      if (val.value == query[0]) {
        const newQuery = query.slice(1);
        if (newQuery.length === 0) return val;
        query = newQuery;
      }
      
      const queryArray = query as (string | number)[];
      let result = children.value.find(c => c.value == queryArray[0]);
      for (let i = 1; i < queryArray.length && result; i++) {
        const childVals = result[childProp] as GroupValue<T>[];
        if (!childVals) break;
        result = childVals.find(c => c.value == queryArray[i]);
      }
      return result;
    } else {
      // Single value lookup
      return children.value.find(c => c.value == query);
    }
  };

  /**
   * Get root value
   */
  const rootValue: ComputedRef<GroupValue<T>> = computed(() => {
    let ptr = val;
    while (ptr.parent) {
      ptr = ptr.parent;
    }
    return ptr;
  });

  return {
    value: val,
    children,
    hasChildren,
    descendants,
    leafNodes,
    pedigree,
    namePath,
    dimPath,
    aggregate,
    pct,
    previous,
    next,
    lookup,
    rootValue
  };
}
