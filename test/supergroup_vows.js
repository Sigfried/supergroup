'use strict';
var vows = require("vows");
var assert = require("assert");
//XMLHttpRequest = require('xhr2');
var d3 = require("d3");
var _ = require("lodash");
require("../supergroup.js");
var fs = require('fs');

var suite = vows.describe("supergroup");

var gradeBook = [
    {lastName: "Gold",    firstName: "Sigfried", class: "Remedial Programming",           grade: "C", num: 2},
    {lastName: "Gold",    firstName: "Sigfried", class: "Literary Posturing",             grade: "B", num: 3},
    {lastName: "Gold",    firstName: "Sigfried", class: "Documenting with Pretty Colors", grade: "B", num: 3},
    {lastName: "Sassoon", firstName: "Sigfried", class: "Remedial Programming",           grade: "A", num: 3},
    {lastName: "Androy",  firstName: "Sigfried", class: "Remedial Programming",           grade: "B", num: 3}
];
var gradesByLastName = _.supergroup(gradeBook, 'lastName');

var gradesByName = _.supergroup(gradeBook,  function(d) { 
    return d.firstName + ' ' + d.lastName; },  {dimName: 'fullName'});

var gradesByGradeLastName = _.supergroup(gradeBook, ['grade','lastName']);

var goodStudentsByGrade = _.supergroup(gradeBook, 
            [function(d) { return d.grade.match(/[AB]/) ? d.grade : null },'lastName'],
            { truncateBranchOnEmptyVal: true });

suite.addBatch({
  "supergroup state": {
    topic: gradesByGradeLastName.state(),
    "should be a Supergroup State": function(selector) {
        var a = {};
        var b = a;
        assert.equal(a, b);
        assert.instanceOf(selector, _.stateClass);
    },
    "should allow selection by value": function(selector) {
        selector.selectByVal(gradesByGradeLastName.lookup("A"));
        assert.deepEqual(selector.selectedRecs(), [gradeBook[3]]);
    },
    /*
    "should allow selection by filter": function(selector) {
        selector.selectByVal(gradesByGradeLastName.lookup("A"));
        assert.deepEqual(selector.selectedRecs(), [gradeBook[3]]);
    },
    */
  }
});

suite.addBatch({
  "supergroup general": {
    "rawValues and map(String)": function() {
      assert.deepEqual(gradesByLastName.rawValues(), ["Gold","Sassoon","Androy"]);
      function get_raw(array) {
          var groups = _.addSupergroupMethods(array);
          return groups.rawValues();
      }
      function get_strings(array) {
          var groups = _.addSupergroupMethods(array);
          return groups.map(String);
      }
      assert.deepEqual(get_raw([]), []);
      assert.deepEqual(get_raw(['one', 'two']), ['one', 'two']);
      assert.deepEqual(get_raw([1, 2]), [1, 2]);
      assert.deepEqual(get_raw([true, false]), [true, false]);
      assert.deepEqual(get_strings([1, 2]), ['1', '2']);
      assert.deepEqual(get_strings([true, false]), ['true', 'false']);
    },
    "dimensions can be functions": function() {
        assert.deepEqual(gradesByName.rawValues(), ["Sigfried Gold","Sigfried Sassoon","Sigfried Androy"]);
    },
    "multi-level supergroups have top-level rawValues": function() {
        assert.deepEqual(gradesByGradeLastName.rawValues().sort(), ["A","B","C"]);
    },
    "first group contains three raw records": function() {
        assert.deepEqual(gradesByLastName[0].records.slice(0), [
            {"lastName":"Gold","firstName":"Sigfried","class":"Remedial Programming","grade":"C","num":2},
            {"lastName":"Gold","firstName":"Sigfried","class":"Literary Posturing","grade":"B","num":3},
            {"lastName":"Gold","firstName":"Sigfried","class":"Documenting with Pretty Colors","grade":"B","num":3}
        ]); 
    },
    "lookup finds the right thing": function() {
        assert.equal(gradesByLastName.lookup("Sassoon").records[0], gradeBook[3])
    },
    "two groups for 'B'": function() {
        assert.deepEqual(gradesByGradeLastName.lookup("B").children.rawValues(), ["Gold","Androy"]);
    },
    "leafnodes": function() {
        assert.deepEqual(gradesByGradeLastName.leafNodes().namePaths(), 
                ["C/Gold","B/Gold","B/Androy","A/Sassoon"]);
    },
    "sort": function() {
        assert.deepEqual(gradesByGradeLastName.leafNodes().sort(function(a,b){
                    return a.namePath() < b.namePath() ? -1 : 
                           b.namePath() < a.namePath() ? 1 : 0
                }).namePaths(),
            [ 'A/Sassoon', 'B/Androy', 'B/Gold', 'C/Gold' ]);
    },
    "sortBy": function() {
        assert.deepEqual(gradesByGradeLastName.leafNodes().sortBy(
                    function(d){ return d.namePath(); }).namePaths(),
            [ 'A/Sassoon', 'B/Androy', 'B/Gold', 'C/Gold' ]);
    },
    "previous": function() {
        assert.deepEqual(gradesByGradeLastName.sort()[2].previous().namePath(),
                    "B");
    },
    "vals should have rootList": function() {
        assert.equal(gradesByGradeLastName.lookup(['A','Sassoon']).rootList(),
                     gradesByGradeLastName);
    },
  },
  "asRootVal": {
    topic: function(){  
        // make new version of gradesByGradeLastName so asRootVal doesn't mess up other one
        var gradesByGradeLastName = _.supergroup(gradeBook, ['grade','lastName']);
        var root = gradesByGradeLastName.asRootVal();
        return {gradesByGradeLastName:gradesByGradeLastName, root:root};
    }, 
    'should set its dimension as "root"': function(topic) {
        assert.equal(topic.root.dim, 'root');
    },
    'should contain all the records': function(topic) {
        assert.equal(topic.root.aggregate(_.sum, 'num'), 14);
    },
    'should namePath to root': function(topic) {
        assert.deepEqual(topic.gradesByGradeLastName.leafNodes().namePaths(),
          [ 'Root/C/Gold','Root/B/Gold','Root/B/Androy','Root/A/Sassoon' ]);
    }
  },
  "hierarchicalTableToTree": function() {
    topic: [{"p":"animal","c":"mammal"},{"p":"animal","c":"reptile"},{"p":"animal","c":"fish"},{"p":"animal","c":"bird"},{"p":"bird","c":"kiwi"},{"p":"kiwi","c":"orange tailed kiwi"},{"p":"plant","c":"tree"},{"p":"plant","c":"bush"},{"p":"plant","c":"grass"},{"p":"plant","c":"fruit"},{"p":"fruit","c":"kiwi"},{"p":"kiwi","c":"purple kiwi"},{"p":"tree","c":"oak"},{"p":"tree","c":"maple"},{"p":"oak","c":"pin oak"},{"p":"mammal","c":"primate"},{"p":"mammal","c":"bovine"},{"p":"bovine","c":"cow"},{"p":"bovine","c":"ox"},{"p":"primate","c":"monkey"},{"p":"primate","c":"ape"},{"p":"ape","c":"chimpanzee"},{"p":"ape","c":"gorilla"},{"p":"ape","c":"me"}],
    'should work with (data, parentProp, childProp) params', function(treePairs) {
      var tree = _.hierarchicalTableToTree(treePairs, 'p', 'c');
      var paths = _.invoke(tree.flattenTree(), 'namePath');
      assert.deepEqual(paths,
        ["animal", "animal/mammal", "animal/mammal/primate", "animal/mammal/primate/monkey", "animal/mammal/primate/ape", "animal/mammal/primate/ape/chimpanzee", "animal/mammal/primate/ape/gorilla", "animal/mammal/primate/ape/me", "animal/mammal/bovine", "animal/mammal/bovine/cow", "animal/mammal/bovine/ox", "animal/reptile", "animal/fish", "animal/bird", "animal/bird/kiwi", "plant", "plant/tree", "plant/tree/oak", "plant/tree/oak/pin oak", "plant/tree/maple", "plant/bush", "plant/grass", "plant/fruit", "plant/fruit/kiwi", "plant/fruit/kiwi/orange tailed kiwi", "plant/fruit/kiwi/purple kiwi"]);
    }
  },
});
suite.addBatch({
  "truncateBranchOnEmpty": {
    "should exclude empty branch": function(topic) {
      assert.deepEqual(goodStudentsByGrade.rawValues().sort(),
                   ['A', 'B']);
    },
  }
});
suite.addBatch({
  "dates": {
    topic: _.supergroup([{d:new Date('2008-03-01')},{d:new Date('2008-03-01')},{d:new Date('2009-01-05')}], 'd'),
    "should group Dates even though == doesn't work for Dates": function(topic) {
      assert.equal(topic.length, 2);
    },
  }
});
suite.addBatch({
  "multiValuedGroup": {
    topic: [{A:[1,2]}, {A:[2,3]}],
    "normal grouping of array values": function(topic) {
      assert.deepEqual(
        _.supergroup(topic, 'A').d3map(),
        { "1,2": [{"A":[1,2]}], "2,3": [{"A":[2,3]}] })
    },
    "normal grouping of array values": function(topic) {
      assert.deepEqual(
        _.supergroup(topic, 'A', {multiValuedGroup:true}).d3map(),
        { "1":[{"A":[1,2]}], "2":[{"A":[1,2]},{"A":[2,3]}], "3":[{"A":[2,3]}] }
      );
    },
  }
});


suite.export(module);
