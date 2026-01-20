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
import { isNumericGroup, filterOutEmpty, createDimPath, createAggregator, calculatePct, multiValuedGroupBy, findRootNodes } from './utils/groupHelpers';
// Export all composables
export { useGrouping, useGroupValue, useGroupList, useGroupSelection };
// Export utility functions
export { isNumericGroup, filterOutEmpty, createDimPath, createAggregator, calculatePct, multiValuedGroupBy, findRootNodes };
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
