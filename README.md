layout: post
title: "supergroup"
author: "Sigfried Gold"
date: 2013-12-27 00:07:00 -0500
comments: true
categories: [repo]
source: https://github.com/Sigfried/supergroup
format: complete
HTML Header: <link rel="stylesheet" href="assets/plain.css">
HTML Header: <link rel="stylesheet" href="assets/prism.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.2/underscore.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.5/d3.js"></script>
<script src="supergroup.js"></script>

<script>
window.onload = function() {
var gradeBook = [
    {lastName: "Gold",    firstName: "Sigfried", class: "Remedial Programming",           grade: "C", num: 2},
    {lastName: "Gold",    firstName: "Sigfried", class: "Literary Posturing",             grade: "B", num: 3},
    {lastName: "Gold",    firstName: "Sigfried", class: "Documenting with Pretty Colors", grade: "B", num: 3},
    {lastName: "Sassoon", firstName: "Sigfried", class: "Remedial Programming",           grade: "A", num: 3},
    {lastName: "Androy",  firstName: "Sigfried", class: "Remedial Programming",           grade: "B", num: 3} 
];
var byLastName = _.supergroup(gradeBook, "lastName"); // an Array of Strings:  ["Gold","Sassoon","Androy"]
var byName = _.supergroup(gradeBook, function(d) { return d.firstName + ' ' + d.lastName; }); // an Array of Strings:  ["Sigfried Gold","Sigfried Sassoon","Sigfried Androy"]
var byClassGrade = _.supergroup(gradeBook, ["class", "grade"]); // Hierarchical grouping, top level is Array of classes
};
</script>

Supergroup brings extreme convenience and understandability to the manipulation of 
Javascript data collections, especially in the context of D3.js visualization
programming.

Certain data manipulation problems arise over and over again in data-centric
Jaascript programming. d3.nest, d3.map, and \_.groupBy solve the most completely
generic aspects of these problems, but after using these generic tools, there
is often much work left to do to extract the desired information from the resulting
data structures.

In most cases where you might use one of these generic utility functions, Supergroup
will save you some of the further work you will have to do.

{{./fake-patient_data.md}}

<pre><code class="language-javascript">
var byLastName = _.supergroup(gradeBook, "lastName"); // an Array of Strings:  ["Gold","Sassoon","Androy"]
byLastName[0].records; // Array of Sigfried Gold's original 3 records
byLastName.rawValues(); // Array of native strings (easier to look at or use in contexts where you need a plain string)
</code></pre>

<!-- more -->

[Full API documentation](../../supergroup)

(getting rid of underscore-unchained, which was a bad idea altogether)

``` json Some records loaded from a CSV or JSON file
var gradeBook = [
    {lastName: "Gold",    firstName: "Sigfried", class: "Remedial Programming",           grade: "C", num: 2},
    {lastName: "Gold",    firstName: "Sigfried", class: "Literary Posturing",             grade: "B", num: 3},
    {lastName: "Gold",    firstName: "Sigfried", class: "Documenting with Pretty Colors", grade: "B", num: 3},
    {lastName: "Sassoon", firstName: "Sigfried", class: "Remedial Programming",           grade: "A", num: 3},
    {lastName: "Androy",  firstName: "Sigfried", class: "Remedial Programming",           grade: "B", num: 3} 
];
```
   ``` javascript Grouping on one dimension
<code>
var byLastName = _.supergroup(gradeBook, "lastName"); // an Array of Strings:  ["Gold","Sassoon","Androy"]
byLastName[0].records; // Array of Sigfried Gold's original 3 records
byLastName.rawValues(); // Array of native strings (easier to look at or use in contexts where you need a plain string)
</code>
```
``` javascript Grouping by a calculated value
var byName = _.supergroup(gradeBook, function(d) { return d.firstName + ' ' + d.lastName; });
// an Array of Strings:  ["Sigfried Gold","Sigfried Sassoon","Sigfried Androy"]
```
``` javascript It's a native Array, but you can treat it as map, and then do cool stuff. Here's a GPA:
byName.lookup("Sigfried Gold").records.pluck("num").mean(); //  2.6666666666666665 
```
The above example shows how Supergroup can chain Underscore methods (and mixins), functionality
it gets from [underscore-unchained](../underscore-unchained).

``` javascript Grouping hierarchically
var byClassGrade = _.supergroup(gradeBook, ["class", "grade"]); // Array of top-level groups: ["Remedial Programming", "Literary Posturing", "Documenting with Pretty Colors"]
byClassGrade[0].children; // Children of a single group: ["C", "B"]
byClassGrade[0].records; // Array original records for a single group
byClassGrade.lookup("Remedial Programming"); // lookup a top-level group by name
byClassGrade.lookup(["Remedial Programming","B"]); // lookup a second-level group by name path
byClassGrade.lookup(["Remedial Programming","B"]).namePath(' -> '); // "Remedial Programming -> B"
byClassGrade.lookup(["Remedial Programming","B"]).dimPath() // "class/grade"
```
Supergroup can flatten a tree into an array of nodes much like D3's hierarchy layout, but in a way
that's easier to use IMHO.
``` javascript 
byClassGrade.flattenTree(); // ["Remedial Programming", "C", "A", "B", "Literary Posturing", "B", "Documenting with Pretty Colors", "B"]
byClassGrade.flattenTree().invoke('namePath'); // ["Remedial Programming", "Remedial Programming/C", "Remedial Programming/A", "Remedial Programming/B", "Literary Posturing", "Literary Posturing/B", "Documenting with Pretty Colors", "Documenting with Pretty Colors/B"]
// only want leaf nodes?
byClassGrade.leafNodes().invoke('namePath'); // ["Remedial Programming/C", "Remedial Programming/A", "Remedial Programming/B", "Literary Posturing/B", "Documenting with Pretty Colors/B"]
```


<!--
{% jsfiddle us9k9/2 %}
In a SQL group by query you get one record for each resulting group and
you can calculate values based on the aggregate of the rows comprised by
each group. Another step is needed to go back from the group to
the individual rows in that group. D3's nest and Underscore's groupBy do
slightly better in that they offer a collection of groups where each group
is tied to its associated records.


To explain the advantages of supergroup over Underscore and D3's versions, let's compare the results:

``` javascript Underscore's groupBy
_.groupBy(gradeBook,'lastName')
=> {
    Gold: [ 
        { firstName: "Sigfried", lastName: "Gold", class: "Remedial Programming", grade: "C", num: 2 },
        { firstName: "Sigfried", lastName: "Gold", class: "Literary Posturing", grade: "B", num: 3 },
        { firstName: "Sigfried", lastName: "Gold", class: "Documenting with Pretty Colors", grade: "B", num: 3 }
    ],
    Else: [
        { firstName: "Someone", lastName: "Else", class: "Remedial Programming", grade: "B", num: 3 }
    ]
}
```

``` javascript D3's nest and map
d3.nest().key(function(d) { return d.lastName }).map(gradeBook) // same result as Underscore.  
```

Because D3 visualizations depend so completely on arrays, D3 provides a way of structuring groups as arrays:

``` javascript D3's nest and entries
d3.nest().key(function(d) { return d.lastName }).entries(gradeBook)
=> [
    { key: "Gold",
      values: [
            { firstName: "Sigfried", lastName: "Gold", class: "Remedial Programming", grade: "C", num: 2 },
            { firstName: "Sigfried", lastName: "Gold", class: "Literary Posturing", grade: "B", num: 3 },
            { firstName: "Sigfried", lastName: "Gold", class: "Documenting with Pretty Colors", grade: "B", num: 3 }
        ]
    },
    { key: "Else",
      values: [
            { firstName: "Someone", lastName: "Else", class: "Remedial Programming", grade: "B", num: 3 }
        ]
    }
]

// making a list with this data in D3 might look like this:

gradeBookEntries = d3.nest()
                    .key(function(d) { return d.lastName })
                    .key(function(d) { return d.grade })
                    .entries(gradeBook)

_.rebind(console, 'log') // so console.log can be used as a callback

d3.select('div#main').append('ul').selectAll('li')
    .data(gradeBookEntries)
    .enter()
    .append('li')
        .text(function(d) { return d.key })
        .on('click', console.log)
    .append('ul').selectAll('li')
        .data(function(d) { return d.values})
        .enter()
        .append('li')
            .text(function(d) { return d.key + ': ' + d.values.map(function(r) { return r.class }).join(', ') })
            .on('click', console.log)

gradeBookNames = _.supergroup(gradeBook,['lastName','grade']);
d3.select('div#main').append('ul').selectAll('li')
    .data(gradeBookNames)
    .enter()
    .append('li')
        .text(_.identity)
        .on('click', console.log)
    .append('ul').selectAll('li')
        .data(function(d) { return d.children})
        .enter()
        .append('li')
            .text(function(d) { return d + ': ' + d.records.pluck('class').join(', ') })
            .on('click', console.log)
```

These produce identical results with fairly similar syntax, but when the visualization
becomes more complex, the supergroup nodes are much more useful. A common use case
is providing information about a node on mouseover. 

One drawback of d3.nest above is a difference in datum types between parent and leaf
nodes: datum.values at a parent node is an array of {key:'...',values:[...]}, but at
the leaf node it's an array of raw records.

Supergroup does not mix up raw records and hierarchy children in this way. At every
level 'records' refers to raw records (which you can only access as leaf nodes in
d3.nest) and 'children' refers to nested children if there are any at that node.





gradeBookNames = _.supergroup(gradeBook,['lastName','grade']);
 d3.select('div#main').append('ul').selectAll('li')
    .data(gradeBookEntries)
    .enter()
    .append('li')
        .text(_.identity)
    .append('ul').selectAll('li')
        .data(function(d) { return d.records})
        .enter()
        .append('li')
            .text(function(d) { return d.namePath() })


d3.select('body').append('ul').selectAll('li')
    .data(gradeBookEntries)
    .enter()
    .append('li')
        .text(function(d) { return d.key })
    .append('p')
        .text(function(d) { return d.values.length + ' records in group ' + this.parentNode.__data__.key })
```

has the exact same result (with less pleasant syn

``` javascript
var gradeBook = [
   {firstName: 'Sigfried', lastName: 'Gold', class: 'Remedial Programming', grade: 'C+', num: 2.2},
   {firstName: 'Sigfried', lastName: 'Gold', class: 'Literary Posturing', grade: 'B', num: 3},
   {firstName: 'Sigfried', lastName: 'Gold', class: 'Documenting with Pretty Colors', grade: 'B-', num: 2.7},
   {firstName: 'Someone', lastName: 'Else', class: 'Remedial Programming', grade: 'A'}];

var gradesByLastName = enlightenedData.group(gradeBook, 'lastName')
```

<script src="assets/prism.js"></script>

``` javascript
var gradesByName = enlightenedData.group(gradeBook,  
        function(d) { return d.lastName + ', ' + d.firstName },  
        {dimName: 'fullName'})

var sigfried = gradesByName.lookup('Gold, Sigfried');
sigfried.records.length; // 3
var sigfriedGPA = sigfried.records.reduce(function(result,rec) { return result+rec.num }, 0) / sigfried.records.length;
(it does much much more, will explain below)
```
{% include_code supergroup-test.js %}
-->
<script src="assets/prism.js"></script>
