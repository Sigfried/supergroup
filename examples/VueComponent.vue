<!--
  Example Vue 3 component using Supergroup composables
  
  This demonstrates how to use Supergroup in a real Vue application
  for interactive data grouping and visualization.
-->

<template>
  <div class="supergroup-demo">
    <h1>Olympic Athletes Grouping Demo</h1>
    
    <!-- Controls -->
    <div class="controls">
      <label>
        Group By:
        <select v-model="dimension">
          <option value="Country">Country</option>
          <option value="Sport">Sport</option>
          <option value="Year">Year</option>
        </select>
      </label>
      
      <label>
        <input type="checkbox" v-model="multiLevel" />
        Multi-level (Country > Sport)
      </label>
    </div>

    <!-- Stats -->
    <div class="stats">
      <p>Total Records: {{ allRecords.length }}</p>
      <p>Groups: {{ grouped.values.length }}</p>
      <p v-if="selection.selectedCount.value > 0">
        Selected: {{ selection.selectedCount.value }} groups, 
        {{ selection.selectedRecords.value.length }} records
      </p>
    </div>

    <!-- Groups List -->
    <div class="groups">
      <div 
        v-for="group in grouped.values" 
        :key="group.value"
        class="group"
        :class="{ selected: selection.isSelected(group) }"
        @click="selection.toggleValue(group)"
      >
        <h3>{{ group.value }}</h3>
        <p>{{ group.records.length }} athletes</p>
        
        <!-- Show children if multi-level -->
        <div v-if="group.children" class="children">
          <div 
            v-for="child in group.children" 
            :key="child.value"
            class="child"
          >
            {{ child.value }} ({{ child.records.length }})
          </div>
        </div>
      </div>
    </div>

    <!-- Selected Records -->
    <div v-if="selection.selectedRecords.value.length > 0" class="selected-records">
      <h2>Selected Athletes</h2>
      <table>
        <thead>
          <tr>
            <th>Athlete</th>
            <th>Country</th>
            <th>Sport</th>
            <th>Year</th>
            <th>Medals</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(record, i) in selection.selectedRecords.value.slice(0, 10)" :key="i">
            <td>{{ record.Athlete }}</td>
            <td>{{ record.Country }}</td>
            <td>{{ record.Sport }}</td>
            <td>{{ record.Year }}</td>
            <td>{{ record['Total Medals'] }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="selection.selectedRecords.value.length > 10">
        ... and {{ selection.selectedRecords.value.length - 10 }} more
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useGrouping, useGroupSelection } from 'supergroup/composables';

// Sample data (in real app, this would come from API/props)
const athleteData = ref([
  {Athlete: "Michael Phelps", Country: "United States", Sport: "Swimming", Year: "2008", "Total Medals": "8"},
  {Athlete: "Michael Phelps", Country: "United States", Sport: "Swimming", Year: "2004", "Total Medals": "8"},
  {Athlete: "Usain Bolt", Country: "Jamaica", Sport: "Athletics", Year: "2008", "Total Medals": "3"},
  {Athlete: "Usain Bolt", Country: "Jamaica", Sport: "Athletics", Year: "2012", "Total Medals": "3"},
  {Athlete: "Simone Biles", Country: "United States", Sport: "Gymnastics", Year: "2016", "Total Medals": "5"},
  {Athlete: "Katie Ledecky", Country: "United States", Sport: "Swimming", Year: "2016", "Total Medals": "4"},
  // ... more data would be here
]);

// Grouping controls
const dimension = ref('Country');
const multiLevel = ref(false);

// Computed dimension for grouping
const groupDimension = computed(() => {
  return multiLevel.value ? ['Country', 'Sport'] : dimension.value;
});

// Create reactive grouping
const { grouped, allRecords } = useGrouping(athleteData, groupDimension);

// Selection management
const selection = useGroupSelection(grouped);

// Reset selection when dimension changes
watch(groupDimension, () => {
  selection.clearSelection();
});
</script>

<style scoped>
.supergroup-demo {
  font-family: Arial, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.controls {
  background: #f5f5f5;
  padding: 15px;
  margin: 20px 0;
  border-radius: 4px;
}

.controls label {
  margin-right: 20px;
}

.controls select {
  padding: 5px;
  margin-left: 5px;
}

.stats {
  background: #e3f2fd;
  padding: 15px;
  margin: 20px 0;
  border-radius: 4px;
}

.stats p {
  margin: 5px 0;
}

.groups {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.group {
  border: 2px solid #ddd;
  padding: 15px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.group:hover {
  border-color: #2196f3;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.group.selected {
  border-color: #2196f3;
  background-color: #e3f2fd;
}

.group h3 {
  margin: 0 0 10px 0;
  color: #1976d2;
}

.group p {
  margin: 0;
  color: #666;
}

.children {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #ddd;
}

.child {
  padding: 5px;
  margin: 2px 0;
  background: white;
  border-radius: 2px;
  font-size: 0.9em;
}

.selected-records {
  margin-top: 30px;
  border-top: 2px solid #ddd;
  padding-top: 20px;
}

.selected-records table {
  width: 100%;
  border-collapse: collapse;
  margin: 15px 0;
}

.selected-records th,
.selected-records td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.selected-records th {
  background: #f5f5f5;
  font-weight: bold;
}

.selected-records tr:hover {
  background: #f9f9f9;
}
</style>
