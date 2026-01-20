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
export { useGrouping, useGroupValue, useGroupList, useGroupSelection };
export { isNumericGroup, filterOutEmpty, createDimPath, createAggregator, calculatePct, multiValuedGroupBy, findRootNodes };
export type { PathOptions, GroupingOptions, Dimension, GroupValue, GroupResult, UseGroupingReturn, UseGroupValueReturn, UseGroupListReturn, UseGroupSelectionReturn, D3NestEntry, D3NestMap, SelectionSummary } from './types';
/**
 * Convenience function for quick grouping without Vue composable
 * Useful for non-reactive contexts or server-side use
 */
export declare function supergroup<T extends Record<string, any>>(records: T[], dimensions: import('./types').Dimension<T>, options?: import('./types').GroupingOptions): import('./types').GroupResult<T>;
//# sourceMappingURL=index.d.ts.map