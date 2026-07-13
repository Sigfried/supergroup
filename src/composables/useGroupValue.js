/**
 * Composable for working with individual group values
 * Provides methods for paths, aggregates, and navigation
 */

import { computed, unref } from 'vue';
import _ from 'lodash';
import { createAggregator, calculatePct } from '../utils/groupHelpers.js';

/**
 * Group value composable
 * @param {Object} value - Group value object
 * @param {String} childProp - Property name for children (default: 'children')
 * @returns {Object} Methods and computed properties for the value
 */
export function useGroupValue(value, childProp = 'children') {
  const val = unref(value);

  /**
   * Get value's children
   */
  const children = computed(() => {
    return val[childProp] || [];
  });

  /**
   * Check if value has children
   */
  const hasChildren = computed(() => {
    return children.value && children.value.length > 0;
  });

  /**
   * Get all descendants (recursive)
   */
  const descendants = computed(() => {
    if (!hasChildren.value) return [];
    
    const result = [];
    const traverse = (vals) => {
      vals.forEach(v => {
        result.push(v);
        if (v[childProp] && v[childProp].length > 0) {
          traverse(v[childProp]);
        }
      });
    };
    
    traverse(children.value);
    return result;
  });

  /**
   * Get leaf nodes (values with no children)
   */
  const leafNodes = computed(() => {
    if (!hasChildren.value) return [val];
    
    return descendants.value.filter(v => 
      !v[childProp] || v[childProp].length === 0
    );
  });

  /**
   * Get path from root to this value
   */
  const pedigree = computed(() => {
    const path = [];
    let ptr = val;
    
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
  const namePath = (opts = {}) => {
    const delim = opts.delim || '/';
    const path = pedigree.value.map(v => v.value);
    
    if (opts.noRoot) path.shift();
    if (opts.backwards) path.reverse();
    
    return opts.asArray ? path : path.join(delim);
  };

  /**
   * Get dimension path
   */
  const dimPath = (opts = {}) => {
    const delim = opts.delim || '/';
    const path = pedigree.value.map(v => v.dim);
    
    if (opts.noRoot) path.shift();
    if (opts.backwards) path.reverse();
    
    return opts.asArray ? path : path.join(delim);
  };

  /**
   * Calculate aggregate on records
   */
  const aggregate = (func, field) => {
    return createAggregator(val.records, func, field);
  };

  /**
   * Get percentage of parent
   */
  const pct = computed(() => {
    if (!val.parent || !val.parent.records) return 1;
    return calculatePct(val.records, val.parent.records);
  });

  /**
   * Get previous sibling
   */
  const previous = () => {
    if (!val.parent || !val.parent[childProp]) return null;
    
    const siblings = val.parent[childProp];
    const index = siblings.indexOf(val);
    
    return index > 0 ? siblings[index - 1] : null;
  };

  /**
   * Get next sibling
   */
  const next = () => {
    if (!val.parent || !val.parent[childProp]) return null;
    
    const siblings = val.parent[childProp];
    const index = siblings.indexOf(val);
    
    return index < siblings.length - 1 ? siblings[index + 1] : null;
  };

  /**
   * Lookup child by value or path
   */
  const lookup = (query) => {
    if (!hasChildren.value) {
      throw new Error("Cannot lookup on value without children");
    }

    if (Array.isArray(query)) {
      // Path lookup
      if (val.value == query[0]) {
        query = query.slice(1);
        if (query.length === 0) return val;
      }
      
      let result = children.value.find(c => c.value == query[0]);
      for (let i = 1; i < query.length && result; i++) {
        const childVals = result[childProp];
        if (!childVals) break;
        result = childVals.find(c => c.value == query[i]);
      }
      return result;
    } else {
      // Single value lookup
      return children.value.find(c => c.value == query);
    }
  };

  /**
   * Get root list
   */
  const rootValue = computed(() => {
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
