# Supergroup Vue Composables

A modular, reactive grouping utility for Vue.js applications. Provides powerful data grouping and hierarchical organization with Vue 3's Composition API.

## Installation

```bash
npm install supergroup vue
```

## Quick Start

### Basic Usage

```javascript
import { ref } from 'vue';
import { useGrouping } from 'supergroup/composables';

const data = ref([
  { name: 'Alice', dept: 'Engineering', grade: 'A' },
  { name: 'Bob', dept: 'Engineering', grade: 'B' },
  { name: 'Carol', dept: 'Sales', grade: 'A' }
]);

const grouping = useGrouping(data, 'dept');

// Access grouped values
console.log(grouping.rawValues.value); // ['Engineering', 'Sales']

// Each group has records
const engineering = grouping.lookup('Engineering');
console.log(engineering.records.length); // 2
```

### Multi-Level Grouping

```javascript
// Create hierarchical groups
const multiGroup = useGrouping(data, ['dept', 'grade']);

// Navigate the hierarchy
const engGradeA = multiGroup.lookup(['Engineering', 'A']);
console.log(engGradeA.records); // [{ name: 'Alice', ... }]
```

## Core Composables

### `useGrouping(records, dimensions, options)`

Main composable for creating reactive groups.

**Parameters:**
- `records` - Array or Ref<Array> of records to group
- `dimensions` - String, Function, Array, or Ref for grouping dimension(s)
- `options` - Optional configuration object

**Returns:**
- `grouped` - Computed group result
- `rawValues` - Computed array of group values
- `lookup(query)` - Function to find specific values
- `leafNodes` - Computed array of leaf nodes
- `flattenTree` - Computed flattened tree structure

**Example:**
```javascript
const { grouped, rawValues, lookup, leafNodes } = useGrouping(
  data,
  ['category', 'subcategory'],
  { 
    excludeValues: ['Unknown'],
    multiValuedGroup: false
  }
);
```

### `useGroupList(groupResult)`

Provides operations on a group list.

**Parameters:**
- `groupResult` - The grouped result from useGrouping

**Returns:**
- `values` - Computed array of group values
- `lookup(query)` - Single or path lookup
- `lookupMany(queries)` - Multiple lookups
- `rawValues` - Computed plain values array
- `flattenTree` - Flattened tree structure
- `leafNodes` - All leaf nodes
- `nodesAtLevel(level)` - Nodes at specific depth
- `aggregates(func, field, type)` - Apply aggregation
- `toD3Entries()` - Convert to D3 nest format
- `toD3Map()` - Convert to D3 map format

**Example:**
```javascript
const list = useGroupList(grouping.grouped);

// Aggregation
const sums = list.aggregates((vals) => vals.reduce((a,b) => a+b, 0), 'amount');

// D3 format conversion
const d3Data = list.toD3Entries();
```

### `useGroupValue(value, childProp)`

Work with individual group values.

**Parameters:**
- `value` - A group value object
- `childProp` - Name of children property (default: 'children')

**Returns:**
- `children` - Computed child values
- `hasChildren` - Computed boolean
- `descendants` - All descendant values
- `leafNodes` - Leaf descendant values
- `pedigree` - Path from root to this value
- `namePath(opts)` - String path representation
- `dimPath(opts)` - Dimension path string
- `aggregate(func, field)` - Aggregate this value's records
- `pct` - Percentage of parent records
- `previous()` - Previous sibling
- `next()` - Next sibling

**Example:**
```javascript
const value = grouping.lookup('Engineering');
const valueOps = useGroupValue(value);

console.log(valueOps.namePath()); // 'Engineering'
console.log(valueOps.pct.value); // 0.66 (if 2 of 3 records)

const sum = valueOps.aggregate(
  (vals) => vals.reduce((a,b) => a+b, 0),
  'salary'
);
```

### `useGroupSelection(groupResult)`

Manage selection state without mutating data.

**Parameters:**
- `groupResult` - The grouped result from useGrouping

**Returns:**
- `selectedValues` - Ref array of selected values
- `selectValue(value)` - Select a value
- `deselectValue(value)` - Deselect a value
- `toggleValue(value)` - Toggle selection
- `clearSelection()` - Clear all selections
- `isSelected(value)` - Check if selected
- `selectedRecords` - Computed array of records from selected values
- `selectedCount` - Computed count of selections
- `selectByFilter(fn)` - Select matching values
- `selectLeafNodes()` - Select all leaves
- `selectAtDepth(depth)` - Select at specific level

**Example:**
```javascript
const selection = useGroupSelection(grouping.grouped);

// Select a value
const eng = grouping.lookup('Engineering');
selection.selectValue(eng);

// Check selection
console.log(selection.isSelected(eng)); // true
console.log(selection.selectedCount.value); // 1
console.log(selection.selectedRecords.value); // All Engineering records

// Select by criteria
selection.selectByFilter(v => v.records.length > 5);
```

## Advanced Features

### Reactive Updates

All composables work with reactive data sources:

```javascript
const data = ref([...initialData]);
const grouping = useGrouping(data, 'category');

// Reactively updates when data changes
data.value.push({ category: 'New', value: 100 });
```

### Custom Dimension Functions

```javascript
const grouping = useGrouping(
  data,
  (record) => `${record.firstName} ${record.lastName}`,
  { dimName: 'fullName' }
);
```

### Multi-Valued Groups

Allow records to appear in multiple groups:

```javascript
const data = ref([
  { tags: ['vue', 'javascript'], title: 'Vue Guide' },
  { tags: ['javascript', 'node'], title: 'Node Basics' }
]);

const grouping = useGrouping(
  data,
  'tags',
  { multiValuedGroup: true }
);

// 'javascript' group contains both records
```

### Working with D3.js

```javascript
const list = useGroupList(grouping.grouped);

// D3 hierarchy format
const d3Hierarchy = list.toD3Entries();

// D3 map format
const d3Map = list.toD3Map();
```

## Options

### Grouping Options

```javascript
{
  // Property name for children (default: 'children')
  childProp: 'children',
  
  // Exclude specific values
  excludeValues: ['Unknown', null],
  
  // Custom dimension name
  dimName: 'MyDimension',
  
  // Truncate branches with empty values
  truncateBranchOnEmptyVal: true,
  
  // Allow multi-valued grouping
  multiValuedGroup: false,
  
  // Pre-process records before grouping
  preListRecsHook: (records) => records.filter(r => r.active),
  
  // Specify if dimension is numeric
  isNumeric: false
}
```

## Migration from Legacy API

The new composables are designed to work alongside the legacy API:

### Legacy (lodash mixin):
```javascript
import _ from 'lodash';
import 'supergroup/legacy';

const groups = _.supergroup(data, 'category');
groups.lookup('Engineering');
```

### New (Vue composables):
```javascript
import { useGrouping } from 'supergroup/composables';

const grouping = useGrouping(data, 'category');
grouping.lookup('Engineering');
```

## Vue Component Example

```vue
<template>
  <div>
    <h2>Groups</h2>
    <div v-for="value in grouping.grouped.value.values" :key="value.value">
      <div 
        @click="selection.toggleValue(value)"
        :class="{ selected: selection.isSelected(value) }"
      >
        {{ value.value }} ({{ value.records.length }} records)
      </div>
    </div>
    
    <div v-if="selection.selectedCount.value > 0">
      Selected: {{ selection.selectedCount.value }} groups,
      {{ selection.selectedRecords.value.length }} records
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useGrouping, useGroupSelection } from 'supergroup/composables';

const data = ref([
  // your data
]);

const grouping = useGrouping(data, 'category');
const selection = useGroupSelection(grouping.grouped);
</script>

<style>
.selected {
  background-color: #e3f2fd;
  font-weight: bold;
}
</style>
```

## TypeScript Support

TypeScript definitions are included:

```typescript
import { Ref } from 'vue';
import { useGrouping } from 'supergroup/composables';

interface MyRecord {
  name: string;
  category: string;
  value: number;
}

const data: Ref<MyRecord[]> = ref([...]);
const grouping = useGrouping(data, 'category');
```

## License

MIT - See LICENSE file for details
