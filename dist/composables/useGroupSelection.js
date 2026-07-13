/**
 * Composable for managing selection state on groups
 * Provides reactive selection without mutating the original data
 */
import { ref, computed, isRef } from 'vue';
import _ from 'lodash';
/**
 * Group selection composable
 * @param groupResult - Result from useGrouping
 * @returns Selection state and methods
 */
export function useGroupSelection(groupResult) {
    const groupRef = isRef(groupResult) ? groupResult : ref(groupResult);
    // Track selected values - use any to avoid Vue's unwrap issues
    const selectedValues = ref([]);
    // Track highlighted values (for hover, etc.)
    const highlightedValues = ref([]);
    /**
     * Select a value
     */
    const selectValue = (value) => {
        if (!selectedValues.value.includes(value)) {
            selectedValues.value.push(value);
        }
    };
    /**
     * Deselect a value
     */
    const deselectValue = (value) => {
        const index = selectedValues.value.indexOf(value);
        if (index > -1) {
            selectedValues.value.splice(index, 1);
        }
    };
    /**
     * Toggle value selection
     */
    const toggleValue = (value) => {
        if (selectedValues.value.includes(value)) {
            deselectValue(value);
        }
        else {
            selectValue(value);
        }
    };
    /**
     * Clear all selections
     */
    const clearSelection = () => {
        selectedValues.value = [];
    };
    /**
     * Select multiple values
     */
    const selectMany = (values) => {
        values.forEach(v => selectValue(v));
    };
    /**
     * Check if value is selected
     */
    const isSelected = (value) => {
        return selectedValues.value.includes(value);
    };
    /**
     * Get all records from selected values
     */
    const selectedRecords = computed(() => {
        return _.chain(selectedValues.value)
            .map('records')
            .flatten()
            .value();
    });
    /**
     * Get count of selected values
     */
    const selectedCount = computed(() => {
        return selectedValues.value.length;
    });
    /**
     * Highlight a value (for hover effects, etc.)
     */
    const highlightValue = (value) => {
        if (!highlightedValues.value.includes(value)) {
            highlightedValues.value.push(value);
        }
    };
    /**
     * Remove highlight from value
     */
    const unhighlightValue = (value) => {
        const index = highlightedValues.value.indexOf(value);
        if (index > -1) {
            highlightedValues.value.splice(index, 1);
        }
    };
    /**
     * Clear all highlights
     */
    const clearHighlights = () => {
        highlightedValues.value = [];
    };
    /**
     * Check if value is highlighted
     */
    const isHighlighted = (value) => {
        return highlightedValues.value.includes(value);
    };
    /**
     * Select by filter function
     */
    const selectByFilter = (filterFn) => {
        const group = groupRef.value;
        if (!group)
            return;
        const values = group.values || [];
        // Flatten tree and filter
        const flatValues = [];
        const flatten = (vals) => {
            vals.forEach((v) => {
                flatValues.push(v);
                const childProp = group.childProp || 'children';
                const children = v[childProp];
                if (children) {
                    flatten(children);
                }
            });
        };
        flatten(values);
        const matching = flatValues.filter(filterFn);
        selectMany(matching);
    };
    /**
     * Select all leaf nodes
     */
    const selectLeafNodes = () => {
        const group = groupRef.value;
        if (!group)
            return;
        const childProp = group.childProp || 'children';
        const leaves = [];
        const findLeaves = (vals) => {
            vals.forEach((v) => {
                const children = v[childProp];
                if (!children || children.length === 0) {
                    leaves.push(v);
                }
                else {
                    findLeaves(children);
                }
            });
        };
        findLeaves(group.values || []);
        selectMany(leaves);
    };
    /**
     * Select values at specific depth
     */
    const selectAtDepth = (depth) => {
        selectByFilter(v => v.depth === depth);
    };
    /**
     * Get selection state summary
     */
    const selectionSummary = computed(() => {
        return {
            count: selectedCount.value,
            recordCount: selectedRecords.value.length,
            values: selectedValues.value.map((v) => v.value)
        };
    });
    return {
        // State
        selectedValues: selectedValues,
        highlightedValues: highlightedValues,
        // Selection methods
        selectValue,
        deselectValue,
        toggleValue,
        clearSelection,
        selectMany,
        isSelected,
        // Computed
        selectedRecords,
        selectedCount,
        selectionSummary,
        // Highlight methods
        highlightValue,
        unhighlightValue,
        clearHighlights,
        isHighlighted,
        // Advanced selection
        selectByFilter,
        selectLeafNodes,
        selectAtDepth
    };
}
