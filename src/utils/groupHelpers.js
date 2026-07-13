/**
 * Core helper utilities for grouping operations
 * These are pure functions without Vue dependencies
 */

import _ from 'lodash';

/**
 * Check if entire group list is numeric
 */
export function isNumericGroup(groups) {
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
export function filterOutEmpty(recs, dim) {
  const func = _.isFunction(dim) ? dim : d => d[dim];
  return recs.filter(r => 
    !_.isEmpty(func(r)) || 
    (_.isNumber(func(r)) && isFinite(func(r)))
  );
}

/**
 * Create dimension path string
 */
export function createDimPath(val, opts = {}) {
  const delim = opts.delim || '/';
  const path = [];
  let ptr = val;
  
  path.push(val);
  while ((ptr = ptr.parent)) {
    path.unshift(ptr);
  }
  
  if (opts.noRoot) path.shift();
  if (opts.backwards) path.reverse();
  
  return opts.dimName ? 
    path.map(v => v.dim).join(delim) :
    path.map(v => String(v.value || v)).join(delim);
}

/**
 * Create aggregation function
 */
export function createAggregator(records, func, field) {
  const values = _.isFunction(field) ? _.map(records, field) : _.map(records, field);
  return func(values);
}

/**
 * Calculate percentage of parent
 */
export function calculatePct(records, parentRecords) {
  return records.length / parentRecords.length;
}

/**
 * Multi-valued groupBy - allows records to appear in multiple groups
 */
export function multiValuedGroupBy(recs, dimFunc) {
  const result = {};
  
  recs.forEach(rec => {
    const keys = dimFunc(rec);
    
    if (!Array.isArray(keys)) {
      throw new Error("multiValuedGroupBy requires array keys");
    }
    
    keys.forEach(key => {
      if (!result[key]) {
        result[key] = [];
      }
      if (!result[key].includes(rec)) {
        result[key].push(rec);
      }
    });
  });
  
  return result;
}

/**
 * Find root nodes from hierarchical data (nodes that are parents but not children)
 */
export function findRootNodes(data, parentProp, childProp) {
  const byParent = _.groupBy(data, parentProp);
  const byChild = _.groupBy(data, childProp);
  
  // Find root nodes (appear as parent but not as child)
  return Object.keys(byParent).filter(
    parent => !byChild[parent]
  );
}
