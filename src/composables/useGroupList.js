/**
 * Composable for working with group lists
 * Provides lookup, sorting, aggregation, and navigation
 */

import { computed, ref, unref } from 'vue';
import _ from 'lodash';

/**
 * Group list composable
 * @param {Object} groupResult - Result from useGrouping
 * @returns {Object} List operations and utilities
 */
export function useGroupList(groupResult) {
  const group = unref(groupResult);

  /**
   * Get values array
   */
  const values = computed(() => group.values || []);

  /**
   * Get child property name
   */
  const childProp = group.childProp || 'children';

  /**
   * Lookup single value
   */
  const singleLookup = (query) => {
    return values.value.find(v => v.value == query);
  };

  /**
   * Lookup value or path
   */
  const lookup = (query) => {
    if (Array.isArray(query)) {
      // Path lookup for hierarchical groups
      let result = singleLookup(query[0]);
      
      for (let i = 1; i < query.length && result; i++) {
        const children = result[childProp];
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
  const lookupMany = (queries) => {
    return queries
      .map(q => singleLookup(q))
      .filter(v => v !== undefined);
  };

  /**
   * Get raw values array
   */
  const rawValues = computed(() => {
    return values.value.map(v => v.value);
  });

  /**
   * Flatten entire tree into single array
   */
  const flattenTree = computed(() => {
    const result = [];
    
    const flatten = (vals) => {
      vals.forEach(val => {
        result.push(val);
        if (val[childProp] && val[childProp].length > 0) {
          flatten(val[childProp]);
        }
      });
    };
    
    flatten(values.value);
    return result;
  });

  /**
   * Get all leaf nodes
   */
  const leafNodes = computed(() => {
    return flattenTree.value.filter(v => 
      !v[childProp] || v[childProp].length === 0
    );
  });

  /**
   * Get nodes at specific level
   */
  const nodesAtLevel = (level) => {
    if (level === 0) return values.value;
    
    const result = [];
    
    const traverse = (vals, currentLevel) => {
      if (currentLevel === level) {
        result.push(...vals);
        return;
      }
      
      vals.forEach(v => {
        if (v[childProp] && v[childProp].length > 0) {
          traverse(v[childProp], currentLevel + 1);
        }
      });
    };
    
    traverse(values.value, 0);
    return result;
  };

  /**
   * Get name paths for all values
   */
  const namePaths = (opts = {}) => {
    const delim = opts.delim || '/';
    
    return values.value.map(v => {
      const path = [];
      let ptr = v;
      
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
  const aggregates = (func, field, returnType = 'array') => {
    const results = values.value.map(val => {
      if (_.isFunction(field)) {
        return func(_.map(val.records, field));
      }
      return func(_.map(val.records, field));
    });

    if (returnType === 'dict') {
      return _.zipObject(rawValues.value, results);
    }
    
    return results;
  };

  /**
   * Sort values
   */
  const sort = (compareFn) => {
    return [...values.value].sort(compareFn);
  };

  /**
   * Sort values by function
   */
  const sortBy = (iteratee) => {
    return _.sortBy(values.value, iteratee);
  };

  /**
   * Convert to D3 nest entries format
   */
  const toD3Entries = () => {
    const convert = (vals) => {
      return vals.map(val => {
        if (val[childProp] && val[childProp].length > 0) {
          return {
            key: String(val.value),
            values: convert(val[childProp])
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
  const toD3Map = () => {
    const convert = (vals) => {
      const result = {};
      
      vals.forEach(val => {
        const key = String(val.value);
        if (val[childProp] && val[childProp].length > 0) {
          result[key] = convert(val[childProp]);
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
  const asRootVal = (name = 'Root', dimName = 'root') => {
    const rootVal = {
      value: name,
      dim: dimName,
      depth: 0,
      records: group.records,
      parent: null,
      [childProp]: values.value
    };

    // Update children to reference new root
    values.value.forEach(v => {
      v.parent = rootVal;
      // Update all descendant depths
      const updateDepth = (val, increment) => {
        val.depth += increment;
        if (val[childProp]) {
          val[childProp].forEach(child => updateDepth(child, increment));
        }
      };
      updateDepth(v, 1);
    });

    return rootVal;
  };

  /**
   * Get summary string for debugging
   */
  const summary = (depth = 0) => {
    const indent = '    '.repeat(depth);
    const dim = group.dim || 'unknown';
    const vals = values.value.length;
    const recs = group.records ? group.records.length : 0;

    const lines = [`${indent}${dim}, ${recs} recs (${depth}) ${vals} vals:`];
    
    values.value.forEach(val => {
      const valRecs = val.records ? val.records.length : 0;
      const valIndent = '    '.repeat(depth + 1);
      lines.push(`${valIndent}${val.value}, ${valRecs} recs`);
      
      if (val[childProp] && val[childProp].length > 0) {
        // Recursively summarize children
        lines.push(`${valIndent}has ${val[childProp].length} children`);
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
