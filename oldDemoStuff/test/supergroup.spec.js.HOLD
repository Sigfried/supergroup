'use strict()';

/* global: describe */
describe('_.supergroup', function() {
    var _ = require('../supergroup.js');
    //var _ = require('../bundle.js');
    var self = this;
    var gradeBook = [
        {lastName: "Gold",    firstName: "Sigfried", class: "Remedial Programming",           grade: "C", num: 2},
        {lastName: "Gold",    firstName: "Sigfried", class: "Literary Posturing",             grade: "B", num: 3},
        {lastName: "Gold",    firstName: "Sigfried", class: "Documenting with Pretty Colors", grade: "B", num: 3},
        {lastName: "Sassoon", firstName: "Sigfried", class: "Remedial Programming",           grade: "A", num: 3},
        {lastName: "Androy",  firstName: "Sigfried", class: "Remedial Programming",           grade: "B", num: 3}
    ];

    beforeEach(function() {
        self.gradesByLastName = _.supergroup(gradeBook, 'lastName');
        self.gradesByName = _.supergroup(gradeBook,  
                function(d) { return d.firstName + ' ' + d.lastName; },  
                {dimName: 'fullName'});
        self.gradesByGradeLastName = _.supergroup(gradeBook, ['grade','lastName']);

        //self.groups = supergroup.addListMethods([]); // for tests Gemma wrote
    });

    it('should apply Groups methods to arrays', function() {
        expect(self.gradesByLastName.asRootVal).toBeDefined();
        expect(self.gradesByLastName.rawValues).toBeDefined();
        expect(self.gradesByLastName.lookup).toBeDefined();
        expect(self.gradesByLastName.singleLookup).toBeDefined();
        expect(self.gradesByLastName.flattenTree).toBeDefined();
        // other methods ?
    });
    it('should group stuff into an array', function() {
        expect(JSON.stringify(self.gradesByLastName)).toEqual('["Gold","Sassoon","Androy"]');
        expect(JSON.stringify(self.gradesByName)).toEqual('["Sigfried Gold","Sigfried Sassoon","Sigfried Androy"]');
        expect(JSON.stringify(self.gradesByGradeLastName.sort())).toEqual('["A","B","C"]');
    });
    it('should assign records to the right groups', function() {
        expect(JSON.stringify(self.gradesByLastName[0].records)).toEqual(
            '[{"lastName":"Gold","firstName":"Sigfried","class":"Remedial Programming","grade":"C","num":2},{"lastName":"Gold","firstName":"Sigfried","class":"Literary Posturing","grade":"B","num":3},{"lastName":"Gold","firstName":"Sigfried","class":"Documenting with Pretty Colors","grade":"B","num":3}]'); 
    });


    describe('asRootVal', function() {
        /*
        it('should set its dimension as "root"', function() {
            var root = self.groups.asRootVal();
            expect(root.dim).toBe('root');
        });
        */

        it('should assign its records to the current group', function() {
            expect(JSON.stringify(self.gradesByName.lookup('Sigfried Gold').records
                    .sort(function(a,b){return a.class < b.class ? -1 : b.class < a.class ? 1 : 0;})))
                .toEqual(JSON.stringify(gradeBook.slice(0,3)
                    .sort(function(a,b){return a.class < b.class ? -1 : b.class < a.class ? 1 : 0;})))
        });

        xit('should set its name to a provided value, or "Root"', function() {
            /** @todo not at all sure how this works yet */
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
