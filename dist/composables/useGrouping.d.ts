/**
 * Core grouping composable for Vue.js applications
 * Provides reactive grouping functionality
 */
import { type Ref } from 'vue';
import type { GroupingOptions, Dimension, UseGroupingReturn } from '../types';
/**
 * Main grouping composable
 * @param records - Records to group (can be reactive)
 * @param dimensions - Single dimension or array for multi-level
 * @param options - Grouping options
 * @returns Reactive grouping result with helper methods
 */
export declare function useGrouping<T extends Record<string, any>>(records: T[] | Ref<T[]>, dimensions: Dimension<T> | Ref<Dimension<T>>, options?: GroupingOptions | Ref<GroupingOptions>): UseGroupingReturn<T>;
//# sourceMappingURL=useGrouping.d.ts.map