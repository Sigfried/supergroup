/**
 * Supergroup Vue Composables
 * 
 * A modular, reactive grouping utility for Vue.js applications
 * 
 * @example
 * import { ref } from 'vue';
 * import { useGrouping, useGroupList } from 'supergroup/composables';
 * 
 * const data = ref<MyRecord[]>([...]);
 * const grouping = useGrouping(data, ['category', 'subcategory']);
 * const list = useGroupList(grouping.grouped);
 */

import { useGrouping } from './composables/useGrouping';
import { useGroupValue } from './composables/useGroupValue';
import { useGroupList } from './composables/useGroupList';
import { useGroupSelection } from './composables/useGroupSelection';

import {
  isNumericGroup,
  filterOutEmpty,
  createDimPath,
  createAggregator,
  calculatePct,
  multiValuedGroupBy,
  findRootNodes
} from './utils/groupHelpers';

// Export all composables
export {
  useGrouping,
  useGroupValue,
  useGroupList,
  useGroupSelection
};

// Export utility functions
export {
  isNumericGroup,
  filterOutEmpty,
  createDimPath,
  createAggregator,
  calculatePct,
  multiValuedGroupBy,
  findRootNodes
};

// Export types
export type {
  PathOptions,
  GroupingOptions,
  Dimension,
  GroupValue,
  GroupResult,
  UseGroupingReturn,
  UseGroupValueReturn,
  UseGroupListReturn,
  UseGroupSelectionReturn,
  D3NestEntry,
  D3NestMap,
  SelectionSummary
} from './types';

/**
 * Convenience function for quick grouping without Vue composable
 * Useful for non-reactive contexts or server-side use
 */
export function supergroup<T extends Record<string, any>>(
  records: T[],
  dimensions: import('./types').Dimension<T>,
  options: import('./types').GroupingOptions = {}
): import('./types').GroupResult<T> {
  // Non-reactive version - just returns the grouped data
  // Create a temporary ref-like wrapper
  const recordsRef = { value: records };
  const dimensionsRef = { value: dimensions };
  const optionsRef = { value: options };
  
  // Use the grouping composable
  const grouping = useGrouping(recordsRef as any, dimensionsRef as any, optionsRef as any);
  
  // Return just the grouped value, not reactive
  return grouping.grouped.value as import('./types').GroupResult<T>;
}
