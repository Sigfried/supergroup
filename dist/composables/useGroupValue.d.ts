/**
 * Composable for working with individual group values
 * Provides methods for paths, aggregates, and navigation
 */
import type { GroupValue, UseGroupValueReturn } from '../types';
/**
 * Group value composable
 * @param value - Group value object
 * @param childProp - Property name for children (default: 'children')
 * @returns Methods and computed properties for the value
 */
export declare function useGroupValue<T extends Record<string, any>>(value: GroupValue<T>, childProp?: string): UseGroupValueReturn<T>;
//# sourceMappingURL=useGroupValue.d.ts.map