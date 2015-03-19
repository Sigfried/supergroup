---
layout: post
title: "supergroup"
comments: true
categories: [repo]
source: https://github.com/Sigfried/supergroup
CSS: ./style.css
CSS: ./examples_gist/prism.css
---


<script src="https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.2/underscore.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.5/d3.js"></script>
<script src="https://rawgit.com/Sigfried/supergroup/master/supergroup.js"></script>
<!-- more -->
<div markdown="1">
<section>
#Supergroup.js#
{{README.md}}

Just to be clear about the problem&mdash;you start with tabular data from a CSV
file, a SQL query, or some AJAX call:
<p><span class="iframe">Some very fake hospital data in a CSV file...</span>
<iframe width="100%" height="70px" src="examples_gist/examples.html?data">
</iframe></p>

<p><span class="iframe">...turned into canonical array of Objects (using d3.csv, for instance)</span>
<iframe width="100%" height="80px" src="examples_gist/examples.html?json">
</iframe></p>

Without Supergroup, you'd group the records on the values of one or more fields
with a standard grouping function, giving you data like:

<p><span class="iframe">d3.nest().key(function(d) { return d.Physician; }).key(function(d) { return d.Unit; }).map(data)</span>
<iframe width="100%" height="150px" src="examples_gist/examples.html?d3map">
</iframe></p>
<p><span class="iframe">d3.nest().key(function(d) { return d.Physician; }).key(function(d) { return d.Unit; }).entries(data)</span>
<iframe width="100%" height="150px" src="examples_gist/examples.html?d3nest">
</iframe></p>

To my mind, these are awkward data structures (not to mention the awkwardness
of the calling functions.) The ```map``` version looks ok in the console, but
D3 wants data in arrays, not as objects. The ```entries``` version gives us
arrays of key/value pairs, but on upper levels ```values``` is another array of
key/value pairs while on the bottom level ```values``` is an array of records. In
both ```entries``` and ```map```, you can't tell from a node at any level what
dimension was being grouped at that level. 

Supergroup gives you almost everything you'd want for every item in your nest
(or in your single array if you have a one-level grouping):

  - An array of the values grouped on (could be strings, numbers, or dates) ([example](#sgphysunit))
  - The records associated with each group ([example](#records))
  - Information about the values at any level
    - Parent group if any
    - Immediate child groups if any
    - All descendant groups
    - Only descendant groups at the leaf level
    - Aggregate calculations on records for that group and its descendants
    - Path of group names from root to current group
    - Path of group dimension names from root to current group
  - Information about the groupings at any level
  - For a group at any level, the name of the dimension (attribute, column, property, etc.) grouped on
  - Any of these in a format D3 or some other tool expects
  
## Supergroup

  <code class="language-javascript">
    var foo = bar;
  </code>
    
  Works as an Underscore (or Lo-Dash) mixin: 

<pre class="language-markup" data-src="mixin_example.html"></pre>

## A plain Array of Strings, enhanced with children and records

  ```_.supergroup(data, fieldname)``` returns an array whose elements are the
  distinct values of ```<fieldname>``` in the original data records. These elements,
  or Values can be String or Number objects (Dates to be implemented eventually).
  Each Value holds a ```.records``` property which is an array containing the subset of
  original records matching that Value.

  In the example below we do a multi-level grouping by Physician and Unit. So
  ```sg = _.supergroup(data,['Physician','Unit'])``` returns a list of
  physicians (the top-level grouping).  The first item in this list,
  ```sg[0]```, is "Adams", a String object.  ```sg[0].records``` is an array
  containing the records where Physician="Adams".  ```sg[0].children``` is a
  list of the Units (our second-level grouping) in the records where
  Physician="Adams".  ```sg[0].children[0].records``` would be the subset of
  records where Physician="Adams" and Unit="preop".

  <a id='sgphysunit'></a>
  <p><span class="iframe">Supergroup on physician and unit</span>
  <iframe width="100%" height="400px" src="examples_gist/examples.html?sgphysunit">
  </iframe></p>
  
  It does a bunch more I still need to document.

<hr/>

## Everything below is old documentation I'm trying to replace ##


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
var byLastName = _.supergroup(gradeBook, "lastName"); // an Array of Strings:  ["Gold","Sassoon","Androy"]
byLastName[0].records; // Array of Sigfried Gold's original 3 records
byLastName.rawValues(); // Array of native strings (easier to look at or use in contexts where you need a plain string)
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
{ old stuff % jsfiddle us9k9/2 %
}
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
</section>
</div>
<script src="examples_gist/prism.js"></script>
