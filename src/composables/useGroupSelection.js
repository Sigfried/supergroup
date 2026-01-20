/**
 * Composable for managing selection state on groups
 * Provides reactive selection without mutating the original data
 */

import { ref, computed } from 'vue';
import _ from 'lodash';

/**
 * Group selection composable
 * @param {Object} groupResult - Result from useGrouping
 * @returns {Object} Selection state and methods
 */
export function useGroupSelection(groupResult) {
  // Track selected values
  const selectedValues = ref([]);
  
  // Track highlighted values (for hover, etc.)
  const highlightedValues = ref([]);

  /**
   * Select a value
   */
  const selectValue = (value) => {
    if (!selectedValues.value.includes(value)) {
      selectedValues.value.push(value);
    }
  };

  /**
   * Deselect a value
   */
  const deselectValue = (value) => {
    const index = selectedValues.value.indexOf(value);
    if (index > -1) {
      selectedValues.value.splice(index, 1);
    }
  };

  /**
   * Toggle value selection
   */
  const toggleValue = (value) => {
    if (selectedValues.value.includes(value)) {
      deselectValue(value);
    } else {
      selectValue(value);
    }
  };

  /**
   * Clear all selections
   */
  const clearSelection = () => {
    selectedValues.value = [];
  };

  /**
   * Select multiple values
   */
  const selectMany = (values) => {
    values.forEach(v => selectValue(v));
  };

  /**
   * Check if value is selected
   */
  const isSelected = (value) => {
    return selectedValues.value.includes(value);
  };

  /**
   * Get all records from selected values
   */
  const selectedRecords = computed(() => {
    return _.chain(selectedValues.value)
      .map('records')
      .flatten()
      .value();
  });

  /**
   * Get count of selected values
   */
  const selectedCount = computed(() => {
    return selectedValues.value.length;
  });

  /**
   * Highlight a value (for hover effects, etc.)
   */
  const highlightValue = (value) => {
    if (!highlightedValues.value.includes(value)) {
      highlightedValues.value.push(value);
    }
  };

  /**
   * Remove highlight from value
   */
  const unhighlightValue = (value) => {
    const index = highlightedValues.value.indexOf(value);
    if (index > -1) {
      highlightedValues.value.splice(index, 1);
    }
  };

  /**
   * Clear all highlights
   */
  const clearHighlights = () => {
    highlightedValues.value = [];
  };

  /**
   * Check if value is highlighted
   */
  const isHighlighted = (value) => {
    return highlightedValues.value.includes(value);
  };

  /**
   * Select by filter function
   */
  const selectByFilter = (filterFn) => {
    if (!groupResult.value) return;
    
    const values = groupResult.value.values || [];
    
    // Flatten tree and filter
    const flatValues = [];
    const flatten = (vals) => {
      vals.forEach(v => {
        flatValues.push(v);
        const childProp = groupResult.value.childProp || 'children';
        if (v[childProp]) {
          flatten(v[childProp]);
        }
      });
    };
    
    flatten(values);
    
    const matching = flatValues.filter(filterFn);
    selectMany(matching);
  };

  /**
   * Select all leaf nodes
   */
  const selectLeafNodes = () => {
    if (!groupResult.value) return;
    
    const childProp = groupResult.value.childProp || 'children';
    const leaves = [];
    
    const findLeaves = (vals) => {
      vals.forEach(v => {
        if (!v[childProp] || v[childProp].length === 0) {
          leaves.push(v);
        } else {
          findLeaves(v[childProp]);
        }
      });
    };
    
    findLeaves(groupResult.value.values || []);
    selectMany(leaves);
  };

  /**
   * Select values at specific depth
   */
  const selectAtDepth = (depth) => {
    selectByFilter(v => v.depth === depth);
  };

  /**
   * Get selection state summary
   */
  const selectionSummary = computed(() => {
    return {
      count: selectedCount.value,
      recordCount: selectedRecords.value.length,
      values: selectedValues.value.map(v => v.value)
    };
  });

  return {
    // State
    selectedValues,
    highlightedValues,

    // Selection methods
    selectValue,
    deselectValue,
    toggleValue,
    clearSelection,
    selectMany,
    isSelected,

    // Computed
    selectedRecords,
    selectedCount,
    selectionSummary,

    // Highlight methods
    highlightValue,
    unhighlightValue,
    clearHighlights,
    isHighlighted,

    // Advanced selection
    selectByFilter,
    selectLeafNodes,
    selectAtDepth
  };
}
