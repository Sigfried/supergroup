/**
 * Core helper utilities for grouping operations
 * These are pure functions without Vue dependencies
 */
import type { GroupValue, PathOptions } from '../types';
/**
 * Check if entire group list is numeric
 */
export declare function isNumericGroup(groups: Record<string, any[]>): boolean;
/**
 * Filter out empty values from records
 */
export declare function filterOutEmpty<T>(recs: T[], dim: keyof T | ((record: T) => any)): T[];
/**
 * Create dimension path string
 */
export declare function createDimPath<T>(val: GroupValue<T>, opts?: PathOptions): string;
/**
 * Create aggregation function
 */
export declare function createAggregator<T, R>(records: T[], func: (values: any[]) => R, field?: keyof T | ((record: T) => any)): R;
/**
 * Calculate percentage of parent
 */
export declare function calculatePct<T>(records: T[], parentRecords: T[]): number;
/**
 * Multi-valued groupBy - allows records to appear in multiple groups
 */
export declare function multiValuedGroupBy<T>(recs: T[], dimFunc: (record: T) => (string | number)[]): Record<string, T[]>;
/**
 * Find root nodes from hierarchical data (nodes that are parents but not children)
 */
export declare function findRootNodes<T>(data: T[], parentProp: keyof T, childProp: keyof T): string[];
//# sourceMappingURL=groupHelpers.d.ts.map