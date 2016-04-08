'use strict';

import "babel-polyfill";
import assert from 'assert';
import expect from 'expect.js';
//import mocha from 'mocha';
//import vows from 'vows';
import _, {Supergroup, SGNode, SGNodeList, 
  SGState, ArrayMap, ArraySet, FilterSet} from '../supergroup';

var gradeBook = [
  {lastName: "Gold",    firstName: "Sigfried", class: "Remedial Programming",           grade: "C", num: 2, empty: null},
  {lastName: "Gold",    firstName: "Sigfried", class: "Literary Posturing",             grade: "B", num: 3, empty: ''},
  {lastName: "Gold",    firstName: "Sigfried", class: "Documenting with Pretty Colors", grade: "B", num: 3},
  {lastName: "Sassoon", firstName: "Sigfried", class: "Remedial Programming",           grade: "A", num: 3, empty: NaN},
  {lastName: "Androy",  firstName: "Sigfried", class: "Remedial Programming",           grade: "B", num: 3, empty: 0}
];
//var gradesByLastName = _.supergroup(gradeBook, 'lastName');

var gradesByLastName = _.supergroup(gradeBook, 'lastName');

var gradesByName = _.supergroup(gradeBook, function(d) { 
  return d.firstName + ' ' + d.lastName; }, {dimName: 'fullName'});

var gradesByGradeLastName = _.supergroup(gradeBook, ['grade','lastName']);
//console.log(gradesByLastName.rawValues());

var gradesByEmptyVals = _.supergroup(gradeBook, 'empty');

describe('Supergroup', function() {
  describe('#a Supergroup object', function () {
    it("should be a Supergroup", function() {
      assert.equal(gradesByGradeLastName instanceof Supergroup, true);
    });
    it("should still be a Supergroup after sorting", function() {
      assert.equal(gradesByGradeLastName.sort() instanceof Supergroup, true);
    });
    it("should still be a Supergroup after mapping", function() {
      assert.equal(gradesByGradeLastName.map(d=>d) instanceof Supergroup, true);
    });
    it("should be a SGNodeList", function() {
      assert.equal(gradesByGradeLastName instanceof SGNodeList, true);
    });
    it("should be an Array", function() {
      assert.equal(gradesByGradeLastName instanceof Array, true);
    });
    it("should show as scalars with rawNodes call", function() {
      assert.deepEqual(gradesByLastName.rawValues(), ["Gold","Sassoon","Androy"]);
      //assert.deepEqual(gradesByLastName.rawNodes(), ["Gold","Sassoon","Androy"]);
    });
    it("should show as strings with toString call", function() {
      assert.deepEqual(gradesByLastName.map(d=>d.toString()), ["Gold","Sassoon","Androy"]);
      //assert.deepEqual(gradesByLastName.rawNodes(), ["Gold","Sassoon","Androy"]);
    });
    it("should show as strings with mapping to String", function() {
      assert.deepEqual(gradesByLastName.map(String), ["Gold","Sassoon","Androy"]);
      //assert.deepEqual(gradesByLastName.rawNodes(), ["Gold","Sassoon","Androy"]);
    });
    it("should show joined scalars in string context", function() {
      assert.equal(gradesByLastName+'', "Gold,Sassoon,Androy");
    });
    it("should handle function dimensions", function() {
      assert.deepEqual(gradesByName.rawValues(), ["Sigfried Gold","Sigfried Sassoon","Sigfried Androy"]);
      //assert.deepEqual(gradesByName.rawNodes(), ["Sigfried Gold","Sigfried Sassoon","Sigfried Androy"]);
    });
    it("should should show top level of nested groups", function() {
      //console.log('GRADE??', gradesByGradeLastName);
      assert.deepEqual(gradesByGradeLastName.rawValues().sort(), ["A","B","C"]);
      //assert.deepEqual(gradesByGradeLastName.rawNodes().sort(), ["A","B","C"]);
    });
    /*
    describe('#a recsMap', function () {
      /*
      it("should be in a Node", function() {
        assert.deepEqual(gradesByLastName.root.recsMap instanceof ArraySet, true);
      });
      * /
      it("should hold all recs for a root Node", function() {
        assert.deepEqual(gradesByLastName.root.records, gradeBook);
      });
      it("should hold correct records for a Node", function() {
        assert.deepEqual(gradesByGradeLastName.lookup("A").records, 
                        [gradeBook[3]]);
      });
    });
    */
    it("should hold all recs for a root Node", function() {
      assert.deepEqual(gradesByLastName.records, gradeBook);
      //assert.deepEqual(gradesByLastName.root.records, gradeBook);
    });
    it('should have SGNodes for elements', function() {
      //assert.equal(_.all(gradesByGradeLastName, d => d instanceof SGNode), true);
    });
    it('should have lookup', function() {
      assert.equal(gradesByGradeLastName.lookup('B') instanceof SGNode, true);
    });
    it('should have children', function() {
      assert.equal(gradesByGradeLastName.lookup('B').children.length, 2);
    });
    it("should have lookup paths", function() {
      assert.equal(gradesByGradeLastName.lookup(['A','Sassoon']),
                   gradesByGradeLastName.lookup('A').lookup('Sassoon'));
    });
    it('should lookup null', function() {
      assert.equal(gradesByEmptyVals.lookup(null).records[0].grade, 'C');
    });
    it('should lookup empty string', function() {
      assert.equal(gradesByEmptyVals.lookup('').records[0].grade, 'B');
    });
    it('should lookup undefined', function() {
      assert.equal(gradesByEmptyVals.lookup(undefined).records[0].grade, 'B');
    });
    it('should lookup NaN', function() {
      assert.equal(gradesByEmptyVals.lookup(NaN).records[0].grade, 'A');
    });
    it('should lookup 0', function() {
      assert.equal(gradesByEmptyVals.lookup(0).records[0].grade, 'B');
    });
    it('should have leafNodes starting from level 1, testing one of them', function() {
      assert.deepEqual(gradesByGradeLastName.leafNodes().sort()[0] + '',
                       'Androy')
    });
    it('should have leafNodes with namePaths()', function() {
      assert.deepEqual(gradesByGradeLastName.leafNodes().namePaths().sort(),
                       ['A/Sassoon','B/Androy','B/Gold','C/Gold']);
    });
    it('should sort to an SGNodeList', function() {
      assert.equal(gradesByGradeLastName.leafNodes().sort() instanceof SGNodeList, true);
    })
    describe('#a Node object', function () {
      it('should have lookup', function() {
        assert.equal(gradesByGradeLastName[1].lookup('B').children+'', 'Gold,Androy');
      });
      it("should have a root with all recs", function() {
        assert.deepEqual(gradesByLastName[0].root.records, gradeBook);
      });
      it('should have a referrence to all its records', function() {
        assert.deepEqual(
          JSON.stringify(_.sortBy(gradesByName.lookup('Sigfried Gold').records,
                                  d=>d.class)),
          JSON.stringify(
                  _.sortBy(gradeBook.slice(0,3), d=>d.class, d=>d.class)));
      });
      it('should assign records to the right groups', function() {
        //console.log(gradesByLastName.lookup('Gold').records.plainArray());
        assert.deepEqual(gradesByLastName.lookup('Gold').records, _.where(gradeBook, {lastName:'Gold'}));
      });
      it("should have a namePath", function() {
        assert.equal('namePath' in gradesByGradeLastName[0].children[0], true)
      });
      it("should have a reasonable namePath", function() {
        assert.equal(gradesByGradeLastName.sort()[0].children.sort()[0].namePath(), 'A/Sassoon')
      });
      it('should have leafNodes starting from level 1', function() {
        assert.equal(gradesByGradeLastName.lookup('B').leafNodes()+'',
                        'Gold,Androy')
      });
    });
    it("should group Dates even though == doesn't work for Dates", function() {
      let sg = _.supergroup([{d:new Date('2008-03-01')},{d:new Date('2008-03-01')}], 'd');
      assert.equal(sg.length, 1);
    })
  });
});
/*
describe('ArrayMap', function() {
  let arrayMap = new ArrayMap([1,4,9,16,25,36,49,64,81], Math.sqrt);
  describe('#an ArrayMap', function () {
    it("should act like an array (sort of?)", function() {
      assert.deepEqual(arrayMap.slice(0), [1,4,9,16,25,36,49,64,81]);
    });
    it("should have keys", function() {
      assert.deepEqual(arrayMap.keys(), [1,2,3,4,5,6,7,8,9]);
    });
  });
});
describe('Supergroup FilterSet', function() {
  let filts = gradesByGradeLastName.filterSet();
  describe('#a Supergroup FilterSet object', function () {
    it("should be a FilterSet", function() {
      assert.equal(filts instanceof FilterSet, true);
    });
    it("should allow selection by value", function() {
      filts.selectByNode(gradesByGradeLastName.lookup("A"));
      assert.deepEqual(filts.selectedRecs(), [gradeBook[3]]);
    });
  });
});
*/
/*
*/

// really old stuff from https://github.com/Sigfried/supergroup/blob/f632d9623cb11ec7da090d5ab2b261bf934f65d4/supergroup_spec.js
/*
    it('should sort to a List', function() {
        expect(self.gradesByGradeLastName
            .leafNodes()
            .sort(function(a,b){
                return a.namePath() < b.namePath() ? -1 : 
                        b.namePath() < a.namePath() ? 1 : 0
            })
            .namePaths())
            .toEqual( [ 'A/Sassoon', 'B/Androy', 'B/Gold', 'C/Gold' ]);
    });
    it('should sortBy to a List', function() {
        expect(self.gradesByGradeLastName
                .leafNodes()
                .sortBy(function(d) { return d.namePath() })
                .namePaths())
            .toEqual([ 'A/Sassoon', 'B/Androy', 'B/Gold', 'C/Gold' ]);
    });
    it('should have previous', function() {
        expect(self.gradesByGradeLastName
                .sort()[2]
                .previous()
                .namePath())
            .toEqual('B');
    });


    describe('asRootVal', function() {
        // make new version of gradesByGradeLastName so asRootVal doesn't mess up other one
        var gradesByGradeLastName = _.supergroup(gradeBook, ['grade','lastName']);
        var root = gradesByGradeLastName.asRootVal();
        it('should set its dimension as "root"', function() {
            expect(root.dim).toBe('root');
        });
        it('should contain all the records', function() {
            expect(root.aggregate(_.sum, 'num')).toBe(14);
        });
        it('should namePath to root', function() {
            expect(gradesByGradeLastName.leafNodes().namePaths()).toEqual( [
                'Root/C/Gold','Root/B/Gold','Root/B/Androy','Root/A/Sassoon'
                ]);
        });
    });

    describe('hierarchicalTableToTree', function() {
        var treePairs = [{"p":"animal","c":"mammal"},{"p":"animal","c":"reptile"},{"p":"animal","c":"fish"},{"p":"animal","c":"bird"},{"p":"bird","c":"kiwi"},{"p":"kiwi","c":"orange tailed kiwi"},{"p":"plant","c":"tree"},{"p":"plant","c":"bush"},{"p":"plant","c":"grass"},{"p":"plant","c":"fruit"},{"p":"fruit","c":"kiwi"},{"p":"kiwi","c":"purple kiwi"},{"p":"tree","c":"oak"},{"p":"tree","c":"maple"},{"p":"oak","c":"pin oak"},{"p":"mammal","c":"primate"},{"p":"mammal","c":"bovine"},{"p":"bovine","c":"cow"},{"p":"bovine","c":"ox"},{"p":"primate","c":"monkey"},{"p":"primate","c":"ape"},{"p":"ape","c":"chimpanzee"},{"p":"ape","c":"gorilla"},{"p":"ape","c":"me"}];
        var tree;
        it('should work with (data, parentProp, childProp) params', function() {
            tree = _.hierarchicalTableToTree(treePairs, 'p', 'c');
            expect(tree).toBeDefined();
        });
        it('should make this tree', function() {
            var paths = _.invoke(tree.flattenTree(), 'namePath');
            expect(paths).toEqual(["animal", "animal/mammal", "animal/mammal/primate", "animal/mammal/primate/monkey", "animal/mammal/primate/ape", "animal/mammal/primate/ape/chimpanzee", "animal/mammal/primate/ape/gorilla", "animal/mammal/primate/ape/me", "animal/mammal/bovine", "animal/mammal/bovine/cow", "animal/mammal/bovine/ox", "animal/reptile", "animal/fish", "animal/bird", "animal/bird/kiwi", "plant", "plant/tree", "plant/tree/oak", "plant/tree/oak/pin oak", "plant/tree/maple", "plant/bush", "plant/grass", "plant/fruit", "plant/fruit/kiwi", "plant/fruit/kiwi/orange tailed kiwi", "plant/fruit/kiwi/purple kiwi"]);
        });
    });








/*
suite.addBatch({
 "supergroup general": {
  topic: function(){ return null; }, 
  "dimensions can be functions": function() {
    assert.deepEqual(gradesByName.rawNodes(), ["Sigfried Gold","Sigfried Sassoon","Sigfried Androy"]);
  },
  "multi-level supergroups have top-level rawNodes": function() {
    assert.deepEqual(gradesByGradeLastName.rawNodes().sort(), ["A","B","C"]);
  },
  "multi-level supergroups have children": function() {
    assert.equal(gradesByGradeLastName[1]._hasChildren, true);
  },
  "multi-level supergroups have second-level rawNodes": function() {
    assert.deepEqual(gradesByGradeLastName[1].children.rawNodes().sort(), ["Androy","Gold"]);
  },
  "multi-level supergroups have Node at second-level": function() {
    assert.equal(gradesByGradeLastName[1].children[0] instanceof Node, true);
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
    //console.log('lookup:', gradesByGradeLastName.lookup("B"));
    assert.deepEqual(gradesByGradeLastName.lookup("B").children.rawNodes(), ["Gold","Androy"]);
  },
  "leafnodes on leaf returns NodeList": function() {
    let leafNodes = gradesByGradeLastName[1].leafNodes();
    assert.equal(leafNodes instanceof NodeList, true);
  },
  "leafnodes on leaf returns Node": function() {
    let leafNodes = gradesByGradeLastName[1].children[0].leafNodes();
    assert.equal(leafNodes.length , 1);
    assert.equal(leafNodes[0] instanceof Node, true);
  },
  "leafnodes on Node returns Nodes": function() {
    let leafNodes = gradesByGradeLastName[1].leafNodes();
    assert.equal(leafNodes.length , 2);
    assert.equal(leafNodes[0] instanceof Node, true);
  },
  "leafnodes on Supergroup returns NodeList": function() {
    let leafNodes = gradesByGradeLastName.leafNodes();
    assert.deepEqual(leafNodes.rawNodes(), ["Gold","Androy"]);
    assert.equal(leafNodes.length, 4);
    assert.equal(leafNodes instanceof NodeList, true);
  },
  "leafnodes on supergroup returns Nodes": function() {
    let leafNode = gradesByGradeLastName.leafNodes()[0];
    console.log(`leafNode is Node: ${leafNode instanceof Node}, its a ${leafNode.constructor}, leafNode: ${leafNode}`);
    assert.equal(gradesByGradeLastName.leafNodes()[0] instanceof Node, true);
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
  /*
  "sortBy": function() {
    assert.deepEqual(gradesByGradeLastName.leafNodes().sortBy(
          function(d){ return d.namePath(); }).namePaths(),
      [ 'A/Sassoon', 'B/Androy', 'B/Gold', 'C/Gold' ]);
  },
  "previous": function() {
    assert.deepEqual(gradesByGradeLastName.sort()[2].previous().namePath(),
          "B");
  },
  * /
 },
*/
 /*
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
  */
  /* haven't translated these yet

  describe('hierarchicalTableToTree', function() {
    var treePairs = [{"p":"animal","c":"mammal"},{"p":"animal","c":"reptile"},{"p":"animal","c":"fish"},{"p":"animal","c":"bird"},{"p":"bird","c":"kiwi"},{"p":"kiwi","c":"orange tailed kiwi"},{"p":"plant","c":"tree"},{"p":"plant","c":"bush"},{"p":"plant","c":"grass"},{"p":"plant","c":"fruit"},{"p":"fruit","c":"kiwi"},{"p":"kiwi","c":"purple kiwi"},{"p":"tree","c":"oak"},{"p":"tree","c":"maple"},{"p":"oak","c":"pin oak"},{"p":"mammal","c":"primate"},{"p":"mammal","c":"bovine"},{"p":"bovine","c":"cow"},{"p":"bovine","c":"ox"},{"p":"primate","c":"monkey"},{"p":"primate","c":"ape"},{"p":"ape","c":"chimpanzee"},{"p":"ape","c":"gorilla"},{"p":"ape","c":"me"}];
    var tree;
    it('should work with (data, parentProp, childProp) params', function() {
      tree = _.hierarchicalTableToTree(treePairs, 'p', 'c');
      expect(tree).toBeDefined();
    });
    it('should make this tree', function() {
      var paths = _.invoke(tree.flattenTree(), 'namePath');
      expect(paths).toEqual(["animal", "animal/mammal", "animal/mammal/primate", "animal/mammal/primate/monkey", "animal/mammal/primate/ape", "animal/mammal/primate/ape/chimpanzee", "animal/mammal/primate/ape/gorilla", "animal/mammal/primate/ape/me", "animal/mammal/bovine", "animal/mammal/bovine/cow", "animal/mammal/bovine/ox", "animal/reptile", "animal/fish", "animal/bird", "animal/bird/kiwi", "plant", "plant/tree", "plant/tree/oak", "plant/tree/oak/pin oak", "plant/tree/maple", "plant/bush", "plant/grass", "plant/fruit", "plant/fruit/kiwi", "plant/fruit/kiwi/orange tailed kiwi", "plant/fruit/kiwi/purple kiwi"]);
    });
  });
 }
});
*/

//suite.run();
/*
var test_data = [
  {"person_id": "0", "domain_id": "Condition", "concept_name": "Impacted cerumen", "drug_era_start_date": "2008-02-19", "drug_era_end_date": "2008-02-19"},
  {"person_id": "0", "domain_id": "Condition", "concept_name": "Otogenic otalgia", "drug_era_start_date": "2008-02-19", "drug_era_end_date": "2008-02-19"},
  {"person_id": "0", "domain_id": "Condition", "concept_name": "Acquired trigger finger", "drug_era_start_date": "2008-02-23", "drug_era_end_date": "2008-02-23"},
  {"person_id": "0", "domain_id": "Drug", "concept_name": "Methylprednisolone", "drug_era_start_date": "2008-02-23", "drug_era_end_date": "2008-02-23"},
  {"person_id": "0", "domain_id": "Condition", "concept_name": "Pes anserinus bursitis", "drug_era_start_date": "2008-02-23", "drug_era_end_date": "2008-02-23"},
  {"person_id": "0", "domain_id": "Condition", "concept_name": "Benign essential hypertension", "drug_era_start_date": "2008-02-28", "drug_era_end_date": "2008-02-28"},
  {"person_id": "0", "domain_id": "Condition", "concept_name": "Familial hyperchylomicronemia", "drug_era_start_date": "2008-02-28", "drug_era_end_date": "2008-02-28"},
  {"person_id": "0", "domain_id": "Condition", "concept_name": "Hyperlipidemia", "drug_era_start_date": "2008-02-28", "drug_era_end_date": "2008-02-28"},
  {"person_id": "0", "domain_id": "Condition", "concept_name": "Tachycardia", "drug_era_start_date": "2008-02-28", "drug_era_end_date": "2008-02-28"},
  {"person_id": "0", "domain_id": "Condition", "concept_name": "Amblyopia", "drug_era_start_date": "2008-03-09", "drug_era_end_date": "2008-03-09"},
  {"person_id": "0", "domain_id": "Condition", "concept_name": "Astigmatism", "drug_era_start_date": "2008-03-09", "drug_era_end_date": "2008-03-09"},
  {"person_id": "0", "domain_id": "Condition", "concept_name": "Myopia", "drug_era_start_date": "2008-03-09", "drug_era_end_date": "2008-03-09"},
  {"person_id": "0", "domain_id": "Condition", "concept_name": "Nonexudative age-related macular degeneration", "drug_era_start_date": "2008-03-09", "drug_era_end_date": "2008-03-09"},
  {"person_id": "0", "domain_id": "Condition", "concept_name": "Malignant lymphoma of intra-abdominal lymph nodes", "drug_era_start_date": "2008-03-31", "drug_era_end_date": "2008-03-31"},
  {"person_id": "0", "domain_id": "Drug", "concept_name": "pantoprazole", "drug_era_start_date": "2008-03-31", "drug_era_end_date": "2008-03-31"},
  {"person_id": "0", "domain_id": "Condition", "concept_name": "Mobitz type II atrioventricular block", "drug_era_start_date": "2008-04-04", "drug_era_end_date": "2008-04-04"},
  {"person_id": "0", "domain_id": "Condition", "concept_name": "Benign prostatic hypertrophy with outflow obstruction", "drug_era_start_date": "2008-04-24", "drug_era_end_date": "2008-04-24"},
  {"person_id": "0", "domain_id": "Condition", "concept_name": "Chronic cystitis", "drug_era_start_date": "2008-04-24", "drug_era_end_date": "2008-04-24"},
  {"person_id": "0", "domain_id": "Condition", "concept_name": "Chronic hepatitis C", "drug_era_start_date": "2008-04-24", "drug_era_end_date": "2008-04-24"},
  {"person_id": "0", "domain_id": "Condition", "concept_name": "Acute pyelonephritis with medullary necrosis", "drug_era_start_date": "2008-05-08", "drug_era_end_date": "2008-05-08"},
  {"person_id": "0", "domain_id": "Condition", "concept_name": "Urinary tract infectious disease", "drug_era_start_date": "2008-05-08", "drug_era_end_date": "2008-05-08"},
  {"person_id": "0", "domain_id": "Condition", "concept_name": "Exudative age-related macular degeneration", "drug_era_start_date": "2008-05-20", "drug_era_end_date": "2008-05-20"},
  {"person_id": "1494", "domain_id": "Condition", "concept_name": "Disorder of lipid metabolism", "drug_era_start_date": "2010-12-01", "drug_era_end_date": "2010-12-01"},
  {"person_id": "1494", "domain_id": "Condition", "concept_name": "Open wound of foot except toes with complication", "drug_era_start_date": "2010-12-01", "drug_era_end_date": "2010-12-01"},
  {"person_id": "1494", "domain_id": "Condition", "concept_name": "Peripheral vascular disease", "drug_era_start_date": "2010-12-01", "drug_era_end_date": "2010-12-01"}];

var domcon = _.supergroup(test_data, ['domain_id','concept_name']);
//var domcon = _.supergroup(person_eras, ['domain_id']);
console.log(domcon.rawNodes());
*/
