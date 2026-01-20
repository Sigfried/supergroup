/**
 * Supergroup Vue Composables
 * 
 * A modular, reactive grouping utility for Vue.js applications
 * 
 * @example
 * import { useGrouping, useGroupList } from 'supergroup/composables'
 * 
 * const data = ref([...])
 * const grouping = useGrouping(data, ['category', 'subcategory'])
 * const list = useGroupList(grouping.grouped)
 */

import { useGrouping } from './composables/useGrouping.js';
import { useGroupValue } from './composables/useGroupValue.js';
import { useGroupList } from './composables/useGroupList.js';
import { useGroupSelection } from './composables/useGroupSelection.js';

import {
  isNumericGroup,
  filterOutEmpty,
  createDimPath,
  createAggregator,
  calculatePct,
  multiValuedGroupBy,
  findRootNodes
} from './utils/groupHelpers.js';

export {
  useGrouping,
  useGroupValue,
  useGroupList,
  useGroupSelection,
  isNumericGroup,
  filterOutEmpty,
  createDimPath,
  createAggregator,
  calculatePct,
  multiValuedGroupBy,
  findRootNodes
};

/**
 * Convenience function for quick grouping without Vue composable
 * Useful for non-reactive contexts or server-side use
 */
export function supergroup(records, dimensions, options = {}) {
  // Non-reactive version - just returns the grouped data
  // Create a temporary ref-like wrapper
  const recordsRef = { value: records };
  const dimensionsRef = { value: dimensions };
  const optionsRef = { value: options };
  
  // Use the grouping composable
  const grouping = useGrouping(recordsRef, dimensionsRef, optionsRef);
  
  // Return just the grouped value, not reactive
  return grouping.grouped.value;
}

