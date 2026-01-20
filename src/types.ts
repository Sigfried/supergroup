/**
 * Core type definitions for supergroup
 */

import { Ref, ComputedRef } from 'vue';

/**
 * Options for path formatting
 */
export interface PathOptions {
  delim?: string;
  dimName?: boolean;
  noRoot?: boolean;
  backwards?: boolean;
  asArray?: boolean;
}

/**
 * Options for grouping
 */
export interface GroupingOptions {
  childProp?: string;
  excludeValues?: (string | number)[];
  dimName?: string;
  truncateBranchOnEmptyVal?: boolean;
  multiValuedGroup?: boolean;
  preListRecsHook?: <T>(records: T[]) => T[];
  isNumeric?: boolean;
  parent?: GroupValue<any>;
}

/**
 * Dimension type - can be a property key, function, or array of dimensions
 */
export type Dimension<T> = keyof T | ((record: T) => string | number) | Array<keyof T | ((record: T) => string | number)>;

/**
 * A group value with records and metadata
 */
export interface GroupValue<T> {
  value: string | number;
  rawValue: string;
  records: T[];
  dim: string | Dimension<T>;
  depth: number;
  parent: GroupValue<T> | null;
  children?: GroupValue<T>[];
  [key: string]: any;
}

/**
 * Result of grouping operation
 */
export interface GroupResult<T> {
  values: GroupValue<T>[];
  records: T[];
  dim: string | Dimension<T>;
  isNumeric: boolean;
  childProp: string;
}

/**
 * Return type from useGrouping composable
 */
export interface UseGroupingReturn<T> {
  grouped: ComputedRef<GroupResult<T>>;
  rawValues: ComputedRef<(string | number)[]>;
  allRecords: ComputedRef<T[]>;
  lookup: (query: string | number | (string | number)[]) => GroupValue<T> | undefined;
  addLevel: (newDim: Dimension<T>, newOpts?: GroupingOptions) => void;
  leafNodes: ComputedRef<GroupValue<T>[]>;
  flattenTree: ComputedRef<GroupValue<T>[]>;
}

/**
 * Return type from useGroupValue composable
 */
export interface UseGroupValueReturn<T> {
  value: GroupValue<T>;
  children: ComputedRef<GroupValue<T>[]>;
  hasChildren: ComputedRef<boolean>;
  descendants: ComputedRef<GroupValue<T>[]>;
  leafNodes: ComputedRef<GroupValue<T>[]>;
  pedigree: ComputedRef<GroupValue<T>[]>;
  namePath: (opts?: PathOptions) => string | (string | number)[];
  dimPath: (opts?: PathOptions) => string | string[];
  aggregate: <R>(func: (values: any[]) => R, field?: keyof T | ((record: T) => any)) => R;
  pct: ComputedRef<number>;
  previous: () => GroupValue<T> | null;
  next: () => GroupValue<T> | null;
  lookup: (query: string | number | (string | number)[]) => GroupValue<T> | undefined;
  rootValue: ComputedRef<GroupValue<T>>;
}

/**
 * D3 nest entry format
 */
export interface D3NestEntry<T> {
  key: string;
  values: D3NestEntry<T>[] | T[];
}

/**
 * D3 nest map format
 */
export type D3NestMap<T> = {
  [key: string]: D3NestMap<T> | T[];
};

/**
 * Return type from useGroupList composable
 */
export interface UseGroupListReturn<T> {
  values: ComputedRef<GroupValue<T>[]>;
  lookup: (query: string | number | (string | number)[]) => GroupValue<T> | undefined;
  lookupMany: (queries: (string | number)[]) => GroupValue<T>[];
  rawValues: ComputedRef<(string | number)[]>;
  flattenTree: ComputedRef<GroupValue<T>[]>;
  leafNodes: ComputedRef<GroupValue<T>[]>;
  nodesAtLevel: (level: number) => GroupValue<T>[];
  namePaths: (opts?: PathOptions) => string[];
  aggregates: <R>(func: (values: any[]) => R, field?: keyof T | ((record: T) => any), returnType?: 'array' | 'dict') => R[] | Record<string | number, R>;
  sort: (compareFn: (a: GroupValue<T>, b: GroupValue<T>) => number) => GroupValue<T>[];
  sortBy: (iteratee: ((value: GroupValue<T>) => any) | keyof GroupValue<T>) => GroupValue<T>[];
  toD3Entries: () => D3NestEntry<T>[];
  toD3Map: () => D3NestMap<T>;
  asRootVal: (name?: string, dimName?: string) => GroupValue<T>;
  summary: (depth?: number) => string;
}

/**
 * Selection summary
 */
export interface SelectionSummary {
  count: number;
  recordCount: number;
  values: (string | number)[];
}

/**
 * Return type from useGroupSelection composable
 */
export interface UseGroupSelectionReturn<T> {
  selectedValues: Ref<GroupValue<T>[]>;
  highlightedValues: Ref<GroupValue<T>[]>;
  selectValue: (value: GroupValue<T>) => void;
  deselectValue: (value: GroupValue<T>) => void;
  toggleValue: (value: GroupValue<T>) => void;
  clearSelection: () => void;
  selectMany: (values: GroupValue<T>[]) => void;
  isSelected: (value: GroupValue<T>) => boolean;
  selectedRecords: ComputedRef<T[]>;
  selectedCount: ComputedRef<number>;
  selectionSummary: ComputedRef<SelectionSummary>;
  highlightValue: (value: GroupValue<T>) => void;
  unhighlightValue: (value: GroupValue<T>) => void;
  clearHighlights: () => void;
  isHighlighted: (value: GroupValue<T>) => boolean;
  selectByFilter: (filterFn: (value: GroupValue<T>) => boolean) => void;
  selectLeafNodes: () => void;
  selectAtDepth: (depth: number) => void;
}
