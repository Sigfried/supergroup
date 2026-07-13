/**
 * Basic tests for Vue composables
 * Run with: node --experimental-vm-modules test/composables.test.js
 */

import { ref, computed, nextTick, effectScope } from 'vue';
import { useGrouping, useGroupList, useGroupValue, useGroupSelection } from '../src/index.js';

// Test data
const gradeBook = [
    {lastName: "Gold",    firstName: "Sigfried", class: "Remedial Programming",           grade: "C", num: 2},
    {lastName: "Gold",    firstName: "Sigfried", class: "Literary Posturing",             grade: "B", num: 3},
    {lastName: "Gold",    firstName: "Sigfried", class: "Documenting with Pretty Colors", grade: "B", num: 3},
    {lastName: "Sassoon", firstName: "Sigfried", class: "Remedial Programming",           grade: "A", num: 4},
    {lastName: "Androy",  firstName: "Sigfried", class: "Remedial Programming",           grade: "B", num: 3}
];

// Helper to run tests
function assert(condition, message) {
  if (!condition) {
    console.error('❌ FAIL:', message);
    process.exit(1);
  } else {
    console.log('✓ PASS:', message);
  }
}

function deepEqual(a, b, message) {
  const aStr = JSON.stringify(a);
  const bStr = JSON.stringify(b);
  if (aStr !== bStr) {
    console.error('❌ FAIL:', message);
    console.error('  Expected:', bStr);
    console.error('  Got:     ', aStr);
    process.exit(1);
  } else {
    console.log('✓ PASS:', message);
  }
}

// Run tests in an effect scope (simulates Vue component context)
async function runTests() {
  const scope = effectScope();
  
  await scope.run(async () => {
    console.log('\n🧪 Testing Vue Composables\n');

    // Test 1: Basic grouping
    console.log('Test Suite: Basic Grouping');
    const records = ref(gradeBook);
    const grouping = useGrouping(records, 'lastName');
    
    assert(grouping.grouped.value.values.length === 3, 
      'Should create 3 groups by lastName');
    
    deepEqual(
      grouping.rawValues.value.sort(),
      ["Gold", "Sassoon", "Androy"].sort(),
      'Raw values should match expected last names'
    );

    // Test 2: Multi-level grouping
    console.log('\nTest Suite: Multi-level Grouping');
    const multiGroup = useGrouping(records, ['grade', 'lastName']);
    
    assert(multiGroup.grouped.value.values.length === 3,
      'Should create 3 top-level groups by grade');
    
    deepEqual(
      multiGroup.rawValues.value.sort(),
      ["A", "B", "C"].sort(),
      'Top-level values should be grades'
    );

    // Test 3: Lookup
    console.log('\nTest Suite: Lookup Operations');
    const gradeB = multiGroup.lookup('B');
    assert(gradeB !== undefined, 'Should find grade B');
    assert(gradeB.value === 'B', 'Found value should be B');

    // Test 4: List operations
    console.log('\nTest Suite: List Operations');
    const list = useGroupList(grouping.grouped);
    
    assert(list.values.value.length === 3, 
      'List should have 3 values');
    
    deepEqual(
      list.rawValues.value.sort(),
      ["Gold", "Sassoon", "Androy"].sort(),
      'List rawValues should match'
    );

    // Test 5: Leaf nodes
    console.log('\nTest Suite: Tree Navigation');
    const multiList = useGroupList(multiGroup.grouped);
    const leaves = multiList.leafNodes.value;
    
    assert(leaves.length === 4,
      'Should have 4 leaf nodes in multi-level group');

    // Test 6: Selection
    console.log('\nTest Suite: Selection Management');
    const selection = useGroupSelection(grouping.grouped);
    
    const firstValue = grouping.grouped.value.values[0];
    selection.selectValue(firstValue);
    
    assert(selection.selectedCount.value === 1,
      'Should have 1 selected value');
    
    assert(selection.isSelected(firstValue),
      'First value should be selected');
    
    selection.clearSelection();
    assert(selection.selectedCount.value === 0,
      'Selection should be cleared');

    // Test 7: Reactivity
    console.log('\nTest Suite: Reactivity');
    const reactiveRecords = ref([...gradeBook]);
    const reactiveGroup = useGrouping(reactiveRecords, 'lastName');
    
    const initialCount = reactiveGroup.grouped.value.values.length;
    
    // Add a new record
    reactiveRecords.value.push({
      lastName: "NewPerson",
      firstName: "Test",
      class: "Test Class",
      grade: "A",
      num: 4
    });
    
    // Wait for reactivity
    await nextTick();
    
    assert(reactiveGroup.grouped.value.values.length === initialCount + 1,
      'Should reactively update when records change');
    
    console.log('\n✅ All tests passed!\n');
  });
  
  scope.stop();
}

// Run tests
runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
