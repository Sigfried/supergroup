/**
 * Composable for working with group lists
 * Provides lookup, sorting, aggregation, and navigation
 */
import { type Ref, type ComputedRef } from 'vue';
import type { GroupResult, UseGroupListReturn } from '../types';
/**
 * Group list composable
 * @param groupResult - Result from useGrouping (can be a computed ref)
 * @returns List operations and utilities
 */
export declare function useGroupList<T extends Record<string, any>>(groupResult: GroupResult<T> | Ref<GroupResult<T>> | ComputedRef<GroupResult<T>>): UseGroupListReturn<T>;
//# sourceMappingURL=useGroupList.d.ts.map