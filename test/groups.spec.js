'use strict()';

/* global: describe */
describe('_.supergroup', function() {
    var self = this;
    var gradeBook = [
        {firstName: 'Sigfried', lastName: 'Gold', class: 'Remedial Programming', grade: 'C', num: 2},
        {firstName: 'Sigfried', lastName: 'Gold', class: 'Literary Posturing', grade: 'B', num: 3},
        {firstName: 'Sigfried', lastName: 'Gold', class: 'Documenting with Pretty Colors', grade: 'B', num: 3},
        {firstName: 'Someone', lastName: 'Else', class: 'Remedial Programming', grade: 'B', num:3}];

    beforeEach(function() {
        self.gradesByLastName = _.supergroup(gradeBook, 'lastName');
        self.gradesByName = _.supergroup(gradeBook,  
                function(d) { return d.firstName + ' ' + d.lastName; },  
                {dimName: 'fullName'});
        self.gradesByGradeLastName = _.supergroup(gradeBook, ['grade','lastName']);

        self.groups = enlightenedData.addGroupMethods([]); // for tests Gemma wrote
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
        expect(JSON.stringify(self.gradesByLastName)).toEqual('["Gold","Else"]');
        expect(JSON.stringify(self.gradesByName)).toEqual('["Sigfried Gold","Someone Else"]');
        expect(JSON.stringify(self.gradesByGradeLastName.sort())).toEqual('["B","C"]');
    });
    it('should assign records to the right groups', function() {
        expect(JSON.stringify(self.gradesByLastName[0].records)).toEqual(
            '[{"firstName":"Sigfried","lastName":"Gold","class":"Remedial Programming","grade":"C","num":2},{"firstName":"Sigfried","lastName":"Gold","class":"Literary Posturing","grade":"B","num":3},{"firstName":"Sigfried","lastName":"Gold","class":"Documenting with Pretty Colors","grade":"B","num":3}]');
    });


    describe('asRootVal', function() {
        it('should set its dimension as "root"', function() {
            var root = self.groups.asRootVal();
            expect(root.dim).toBe('root');
        });

        it('should assign its records to the current group', function() {
            var root = self.groups.asRootVal();
            expect(root.records).toEqual(self.groups);

            var groups = enlightenedData.addGroupMethods([1, 2, true, 'herp']);
            root = groups.asRootVal();
            expect(root.records).toEqual(groups);
        });

        xit('should set its name to a provided value, or "Root"', function() {
            /** @todo not at all sure how this works yet */
        });
    });

    describe('rawValues', function() {
        function get_raw(array) {
            var groups = enlightenedData.addGroupMethods(array);
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
    describe('underscoreMethods', function() {
        //var arr;
        function addMethods(array) {
            var groups = enlightenedData.addGroupMethods(array);
            return groups;
        }
        /*
        beforeEach(function() {
            arr = addMethods([1,2,3]);
            _(enlightenedData.underscoreMethods).each(function(method) {
                spyOn(arr, method);
                arr[method]();
            })
        })
        */
        it('should add all the methods', function() {
            var arr = addMethods([1,2,3]);
            _(enlightenedData.underscoreMethods).each(function(method) {
                expect(typeof arr[method]).toEqual("function");
            });
        });
    });
});
