/*
 *
 * i think everything here is copied over to supergroup_vows.js at this point
 *
 */
'use strict';

/* global: describe */
describe('_.supergroup', function() {
    var self = this;
    var gradeBook = [
        {lastName: "Gold",    firstName: "Sigfried", class: "Remedial Programming",           grade: "C", num: 2},
        {lastName: "Gold",    firstName: "Sigfried", class: "Literary Posturing",             grade: "B", num: 3},
        {lastName: "Gold",    firstName: "Sigfried", class: "Documenting with Pretty Colors", grade: "B", num: 3},
        {lastName: "Sassoon", firstName: "Sigfried", class: "Remedial Programming",           grade: "A", num: 3},
        {lastName: "Androy",  firstName: "Sigfried", class: "Remedial Programming",           grade: "B", num: 3}
    ];

    self.gradesByLastName = _.supergroup(gradeBook, 'lastName');
    self.gradesByName = _.supergroup(gradeBook,  
            function(d) { return d.firstName + ' ' + d.lastName; },  
            {dimName: 'fullName'});
    self.gradesByGradeLastName = _.supergroup(gradeBook, ['grade','lastName']);
    self.goodStudentsByGrade = _.supergroup(gradeBook, 
            [function(d) { return d.grade.match(/[AB]/) ? d.grade : null },'lastName'],
            { truncateBranchOnEmptyVal: true });

    it('should apply Groups methods to arrays', function() {
        expect(self.gradesByLastName.asRootVal).toBeDefined();
        expect(self.gradesByLastName.rawValues).toBeDefined();
        expect(self.gradesByLastName.lookup).toBeDefined();
        expect(self.gradesByLastName.singleLookup).toBeDefined();
        expect(self.gradesByLastName.flattenTree).toBeDefined();
        // other methods ?
    });
    it('should group stuff into an array', function() {
        expect(self.gradesByLastName.rawValues()).toEqual(["Gold","Sassoon","Androy"]);
        expect(self.gradesByLastName.rawValues()).toEqual(["Gold","Sassoon","Androy"]);
        expect(self.gradesByName.rawValues()).toEqual(["Sigfried Gold","Sigfried Sassoon","Sigfried Androy"]);
        expect(self.gradesByGradeLastName.rawValues().sort()).toEqual(["A","B","C"]);
    });
    it('should assign records to the right groups', function() {
        expect(self.gradesByLastName[0].records.slice(0)).toEqual( [
            {"lastName":"Gold","firstName":"Sigfried","class":"Remedial Programming","grade":"C","num":2},
            {"lastName":"Gold","firstName":"Sigfried","class":"Literary Posturing","grade":"B","num":3},
            {"lastName":"Gold","firstName":"Sigfried","class":"Documenting with Pretty Colors","grade":"B","num":3}
        ]); 
    });
    it('should assign its records to the current group', function() {
        expect(JSON.stringify(
            self.gradesByName.lookup('Sigfried Gold').records
                .sortBy(function(d) { return d.class; })))
            .toEqual(JSON.stringify(
                gradeBook.slice(0,3)
                    .sort(function(a,b){
                        return a.class < b.class ? -1 : 
                                b.class < a.class ? 1 : 0;})))
    });
    it('should have lookup and children', function() {
        expect(self.gradesByGradeLastName.lookup('B').children.length).toEqual(2);
    });
    it('should have leafNodes', function() {
        expect(self.gradesByGradeLastName.leafNodes().namePaths()).toEqual( [
            'C/Gold','B/Gold','B/Androy','A/Sassoon'
            ]);
    });
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
            var paths = _.invokeMap(tree.flattenTree(), 'namePath');
            expect(paths).toEqual(["animal", "animal/mammal", "animal/mammal/primate", "animal/mammal/primate/monkey", "animal/mammal/primate/ape", "animal/mammal/primate/ape/chimpanzee", "animal/mammal/primate/ape/gorilla", "animal/mammal/primate/ape/me", "animal/mammal/bovine", "animal/mammal/bovine/cow", "animal/mammal/bovine/ox", "animal/reptile", "animal/fish", "animal/bird", "animal/bird/kiwi", "plant", "plant/tree", "plant/tree/oak", "plant/tree/oak/pin oak", "plant/tree/maple", "plant/bush", "plant/grass", "plant/fruit", "plant/fruit/kiwi", "plant/fruit/kiwi/orange tailed kiwi", "plant/fruit/kiwi/purple kiwi"]);
        });
    });

    describe('truncateBranchOnEmpty', function() {
        it('should exclude empty branch', function() {
            expect(self.goodStudentsByGrade.rawValues().sort()).toEqual(['A', 'B']);
        });
    });

    /*
    describe('rawValues', function() {
        function get_raw(array) {
            var groups = supergroup.addListMethods(array);
            return groups.rawValues();
        }

        it('should do nothing for empty arrays', function() {
            expect(get_raw([])).toEqual([]);
        });

        it('should do nothing for string arrays', function() {
            expect(get_raw(['one', 'two'])).toEqual(['one', 'two']);
        });

        it('should turn numeric types into strings', function() {
            expect(get_raw([1, 2])).toEqual(['1', '2']);
        });

        it('should turn boolean types into strings', function() {
            expect(get_raw([true, false])).toEqual(['true', 'false']);
        });
    });
    */
    /*
    describe('underscoreMethods', function() {
        //var arr;
        function addMethods(array) {
            var groups = supergroup.addListMethods(array);
            return groups;
        }
        it('should add all the methods', function() {
            var arr = addMethods([1,2,3]);
            _(enlightenedData.underscoreMethods).each(function(method) {
                expect(typeof arr[method]).toEqual("function");
            });
        });
    });
    */
});
