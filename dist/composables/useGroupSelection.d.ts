/**
 * Composable for managing selection state on groups
 * Provides reactive selection without mutating the original data
 */
import { type Ref, type ComputedRef } from 'vue';
import type { GroupResult, UseGroupSelectionReturn } from '../types';
/**
 * Group selection composable
 * @param groupResult - Result from useGrouping
 * @returns Selection state and methods
 */
export declare function useGroupSelection<T extends Record<string, any>>(groupResult: GroupResult<T> | Ref<GroupResult<T>> | ComputedRef<GroupResult<T>>): UseGroupSelectionReturn<T>;
//# sourceMappingURL=useGroupSelection.d.ts.map