/**
 * Core helper utilities for grouping operations
 * These are pure functions without Vue dependencies
 */

import _ from 'lodash';
import type { GroupValue, PathOptions } from '../types';

/**
 * Check if entire group list is numeric
 */
export function isNumericGroup(groups: Record<string, any[]>): boolean {
  return _.every(_.keys(groups), (k) => {
    return k === null ||
           k === undefined ||
           (!isNaN(Number(k))) ||
           ["null", ".", "undefined"].indexOf(k.toLowerCase()) > -1;
  });
}

/**
 * Filter out empty values from records
 */
export function filterOutEmpty<T>(
  recs: T[],
  dim: keyof T | ((record: T) => any)
): T[] {
  const func = _.isFunction(dim) ? dim : (d: T) => d[dim];
  return recs.filter(r => 
    !_.isEmpty(func(r)) || 
    (_.isNumber(func(r)) && isFinite(func(r)))
  );
}

/**
 * Create dimension path string
 */
export function createDimPath<T>(
  val: GroupValue<T>,
  opts: PathOptions = {}
): string {
  const delim = opts.delim || '/';
  const path: GroupValue<T>[] = [];
  let ptr: GroupValue<T> | null = val;
  
  path.push(val);
  while ((ptr = ptr.parent)) {
    path.unshift(ptr);
  }
  
  if (opts.noRoot) path.shift();
  if (opts.backwards) path.reverse();
  
  return opts.dimName ? 
    path.map(v => String(v.dim)).join(delim) :
    path.map(v => String(v.value || v)).join(delim);
}

/**
 * Create aggregation function
 */
export function createAggregator<T, R>(
  records: T[],
  func: (values: any[]) => R,
  field?: keyof T | ((record: T) => any)
): R {
  const values = field
    ? (_.isFunction(field) ? _.map(records, field) : _.map(records, field))
    : records;
  return func(values);
}

/**
 * Calculate percentage of parent
 */
export function calculatePct<T>(records: T[], parentRecords: T[]): number {
  return records.length / parentRecords.length;
}

/**
 * Multi-valued groupBy - allows records to appear in multiple groups
 */
export function multiValuedGroupBy<T>(
  recs: T[],
  dimFunc: (record: T) => (string | number)[]
): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  
  recs.forEach(rec => {
    const keys = dimFunc(rec);
    
    if (!Array.isArray(keys)) {
      throw new Error("multiValuedGroupBy requires array keys");
    }
    
    keys.forEach(key => {
      const keyStr = String(key);
      if (!result[keyStr]) {
        result[keyStr] = [];
      }
      if (!result[keyStr].includes(rec)) {
        result[keyStr].push(rec);
      }
    });
  });
  
  return result;
}

/**
 * Find root nodes from hierarchical data (nodes that are parents but not children)
 */
export function findRootNodes<T>(
  data: T[],
  parentProp: keyof T,
  childProp: keyof T
): string[] {
  const byParent = _.groupBy(data, parentProp as string);
  const byChild = _.groupBy(data, childProp as string);
  
  // Find root nodes (appear as parent but not as child)
  return Object.keys(byParent).filter(
    parent => !byChild[parent]
  );
}
