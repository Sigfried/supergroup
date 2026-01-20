/**
 * Composable for managing selection state on groups
 * Provides reactive selection without mutating the original data
 */

import { ref, computed, isRef, type Ref, type ComputedRef } from 'vue';
import _ from 'lodash';
import type { GroupResult, GroupValue, UseGroupSelectionReturn, SelectionSummary } from '../types';

/**
 * Group selection composable
 * @param groupResult - Result from useGrouping
 * @returns Selection state and methods
 */
export function useGroupSelection<T extends Record<string, any>>(
  groupResult: GroupResult<T> | Ref<GroupResult<T>> | ComputedRef<GroupResult<T>>
): UseGroupSelectionReturn<T> {
  const groupRef = isRef(groupResult) ? groupResult : ref(groupResult);
  
  // Track selected values - use any to avoid Vue's unwrap issues
  const selectedValues = ref<any[]>([]);
  
  // Track highlighted values (for hover, etc.)
  const highlightedValues = ref<any[]>([]);

  /**
   * Select a value
   */
  const selectValue = (value: GroupValue<T>): void => {
    if (!selectedValues.value.includes(value)) {
      selectedValues.value.push(value);
    }
  };

  /**
   * Deselect a value
   */
  const deselectValue = (value: GroupValue<T>): void => {
    const index = selectedValues.value.indexOf(value);
    if (index > -1) {
      selectedValues.value.splice(index, 1);
    }
  };

  /**
   * Toggle value selection
   */
  const toggleValue = (value: GroupValue<T>): void => {
    if (selectedValues.value.includes(value)) {
      deselectValue(value);
    } else {
      selectValue(value);
    }
  };

  /**
   * Clear all selections
   */
  const clearSelection = (): void => {
    selectedValues.value = [];
  };

  /**
   * Select multiple values
   */
  const selectMany = (values: GroupValue<T>[]): void => {
    values.forEach(v => selectValue(v));
  };

  /**
   * Check if value is selected
   */
  const isSelected = (value: GroupValue<T>): boolean => {
    return selectedValues.value.includes(value);
  };

  /**
   * Get all records from selected values
   */
  const selectedRecords: ComputedRef<T[]> = computed(() => {
    return _.chain(selectedValues.value)
      .map('records')
      .flatten()
      .value() as T[];
  });

  /**
   * Get count of selected values
   */
  const selectedCount: ComputedRef<number> = computed(() => {
    return selectedValues.value.length;
  });

  /**
   * Highlight a value (for hover effects, etc.)
   */
  const highlightValue = (value: GroupValue<T>): void => {
    if (!highlightedValues.value.includes(value)) {
      highlightedValues.value.push(value);
    }
  };

  /**
   * Remove highlight from value
   */
  const unhighlightValue = (value: GroupValue<T>): void => {
    const index = highlightedValues.value.indexOf(value);
    if (index > -1) {
      highlightedValues.value.splice(index, 1);
    }
  };

  /**
   * Clear all highlights
   */
  const clearHighlights = (): void => {
    highlightedValues.value = [];
  };

  /**
   * Check if value is highlighted
   */
  const isHighlighted = (value: GroupValue<T>): boolean => {
    return highlightedValues.value.includes(value);
  };

  /**
   * Select by filter function
   */
  const selectByFilter = (filterFn: (value: GroupValue<T>) => boolean): void => {
    const group = groupRef.value;
    if (!group) return;
    
    const values = group.values || [];
    
    // Flatten tree and filter
    const flatValues: GroupValue<T>[] = [];
    const flatten = (vals: any[]) => {
      vals.forEach((v: any) => {
        flatValues.push(v);
        const childProp = group.childProp || 'children';
        const children = v[childProp];
        if (children) {
          flatten(children);
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
  const selectLeafNodes = (): void => {
    const group = groupRef.value;
    if (!group) return;
    
    const childProp = group.childProp || 'children';
    const leaves: GroupValue<T>[] = [];
    
    const findLeaves = (vals: any[]) => {
      vals.forEach((v: any) => {
        const children = v[childProp];
        if (!children || children.length === 0) {
          leaves.push(v);
        } else {
          findLeaves(children);
        }
      });
    };
    
    findLeaves(group.values || []);
    selectMany(leaves);
  };

  /**
   * Select values at specific depth
   */
  const selectAtDepth = (depth: number): void => {
    selectByFilter(v => v.depth === depth);
  };

  /**
   * Get selection state summary
   */
  const selectionSummary: ComputedRef<SelectionSummary> = computed(() => {
    return {
      count: selectedCount.value,
      recordCount: selectedRecords.value.length,
      values: selectedValues.value.map((v: any) => v.value)
    };
  });

  return {
    // State
    selectedValues: selectedValues as Ref<GroupValue<T>[]>,
    highlightedValues: highlightedValues as Ref<GroupValue<T>[]>,

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
