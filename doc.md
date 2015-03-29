---
layout: post
author: Sigfried Gold
title: "supergroup"
comments: true
categories: [repo]
source: https://github.com/Sigfried/supergroup
license: http://sigfried.mit-license.org/
CSS: ./style.css
CSS: ./assets/prism.css
---

<script src="assets/prism.js"></script>
<script src="../../software/d3/d3.js"></script>
<script src="./lodash/lodash.js"></script>
<script src="./supergroup.js"></script>
<!--
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.5/d3.js"></script>
<script src="https://rawgit.com/Sigfried/supergroup/master/supergroup.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.2/underscore.js"></script>
-->
<a href="https://github.com/sigfried/supergroup"><img style="position: absolute; top: 0; right: 0; border: 0;" src="https://camo.githubusercontent.com/365986a132ccd6a44c23a9169022c0b5c890c387/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f7265645f6161303030302e706e67" alt="Fork me on GitHub" data-canonical-src="https://s3.amazonaws.com/github/ribbons/forkme_right_red_aa0000.png"></a>

<div markdown="1">
<section>
# Supergroup.js #

Supergroup brings extreme convenience and understandability to the manipulation of 
Javascript data collections, especially in the context of D3.js visualization
programming.

As if in submission to the great programmers commandment--*Don't
Repeat Yourself*--every time I find myself writing a piece of code
that solves basically the same problem I've solved a dozen times
before, a little piece of my soul dies.

Utilities for grouping record collections into maps or nests abound:
[d3.nest](https://github.com/mbostock/d3/wiki/Arrays#-nest),
[d3.map](https://github.com/mbostock/d3/wiki/Arrays#associative-arrays),
[Underscore.groupBy](http://underscorejs.org/#groupBy),
[Underscore.Nest](https://github.com/iros/underscore.nest), to name
a few. But after these tools relieve us of a certain amount of 
repetitive stress, we're often left with a tangle of hairy details
that fill us with a dreadful sense of deja vu. Supergroup may seem
like the kind of tacky wonder gadget you'd find on a late-night
Ronco ad, but, for the low, low price of free, it makes data-centric
Javascript programming fun again. **And**, when you find yourself
in a D3.js callback routine holding a datum object that might have
come from anywhere--for instance, with a tooltip callback used on
disparate object types--everything you want to know about your 
object and its associated metadata and records is right there at
your fingertips.

Just to be clear about the problem&mdash;you start with tabular data from a CSV
file, a SQL query, or some AJAX call:

<div><div class="label">Some very fake hospital data in a CSV file...</div>
<pre class="rendercode language-javascript" id="csv"><code>
    tabulate(d3.select('pre#csv'), data, ['Patient','Patient Age','PatientVisit','Date','Time','Unit','Physician','Charge','Copay','Insurance','Inpatient']); // # run
</code></pre></div>

<div><div class="label">...turned into canonical array of Objects (using d3.csv, for instance)</div>
<pre class="rendercode language-javascript" height="150px"><code>
    data; // #   render result.replace(/{/g,'\n   {').replace(/]/,'\n]');
</code></pre></div>

Without Supergroup, you'd group the records on the values of one or more fields
with a standard grouping function, giving you data like:

<pre class="rendercode language-javascript" id="nestmap" height="150px"><code>
d3.nest().key(function(d) { return d.Physician; })
            .key(function(d) { return d.Unit; })
            .map(data);  // # show render indent2
</code></pre>

or

<pre class="rendercode language-javascript" id="nestentries" height="150px"><code>
d3.nest().key(function(d) { return d.Physician; })
            .key(function(d) { return d.Unit; })
            .entries(data);  // # show render indent2 result.replace(/,\n/g, ", ").replace(/("key".*, )/g,"$1\n").replace(/,   */g, ", ")
</code></pre>

To my mind, these are awkward data structures (not to mention the awkwardness
of the calling functions.) The ```map``` version looks ok in the console, but
D3 wants data in arrays, not as objects. The ```entries``` version gives us
arrays of key/value pairs, but on upper levels ```values``` is another array of
key/value pairs while on the bottom level ```values``` is an array of records. In
both ```entries``` and ```map```, you can't tell from a node at any level what
dimension was being grouped at that level. 

Supergroup gives you almost everything you'd want for every item in your nest
(or in your single array if you have a one-level grouping):

  - An array of the values grouped on (could be strings, numbers, or dates) ([Basics](#basics:aplainarrayofstringsenhancedwithchildrenandrecords))
  - The records associated with each group
  - Parents of nested groups ([Dimension Names and Paths](#dimensionnamesandpaths))
  - Immediate child groups if any
  - All descendant groups ([Retrieving sets of values](#retrievingsetsofvalues))
  - Only descendant groups at the leaf level
  - For a group at any level, the name of the dimension (attribute, column, property, etc.) grouped on
  - Path of group names from root to current group
  - Path of group dimension names from root to current group
  - Aggregate calculations on records for that group and its descendants ([Aggregates](#aggregates))
  - Ability to look up specific values ([Finding specific values](#findingspecificvalues))
  - Any of these in a format D3 or some other tool expects ([Using Supergroup for D3 hierarchy layouts](#usingsupergroupford3hierarchylayouts))
  - Ability to include records in multiple groups if appropriate ([Multi-valued Groups](#multi-valuedgroups))
  
## Supergroup
  Works as an Underscore (or [Lo-Dash](https://lodash.com/)) mixin: 

<pre class="rendercode language-markup" height="150px"><code
><!--<script src="https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.2/underscore.js"></script>
<script src="https://rawgit.com/Sigfried/supergroup/master/supergroup.js"></script>
<script>
    var sg = _.supergroup(data, dimension_name)  // single-level grouping
    var sg = _.supergroup(data, [dim1, dim2])  // multi-level grouping
</script>-->
// # showhtml result.replace(/<!--/,'').replace(/-->(.|\n)*/,'')
</code></pre>

## Basics: A plain Array of Strings, enhanced with children and records

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

<div><div class="label">Supergroup on physician and unit</div>
<pre class="rendercode language-javascript" id="sgphysunitx"><code> 
sg = _.supergroup(data, ['Physician','Unit']); // # show render
sg[0]  // # show render
sg[0].records // # show render
sg[0].children // # show render</code></pre></div>
  
## Dimension names and paths

  When you're using D3 for any kind of significant application, you'll be
  writing callbacks that could accept datums of different sorts, from different
  hierarchy levels or whatever. D3 makes it super easy to pass the data values
  around, but then you spend half your time trying to reattach metadata to the
  values you're using. Not with Supergroup:

<a id='sgdimsx'></a>

<pre class="rendercode language-javascript" id="sgdims"><code>
sg = _.supergroup(data, ["Physician","Unit"]) //#show render
sg[0].children[0] //#show render
sg[0].children[0].dim // # show render
sg[0].children.dim //#show render
sg.dim //#show render
sg[0].children[0].parent // # show render
sg[0].children[0].namePath() // # show render
sg[0].children[0].dimPath() // # show render</code></pre>

## Aggregates
You can apply aggregate functions to the records of a single group or
to all the groups in a list.

<a id='sgagg'></a>

<div><pre class="rendercode language-javascript" id="aggregates"
><code>_.each(data, function(rec) {
    rec.Charge = parseFloat(rec.Charge); // make these actual numbers
    rec.Copay = parseFloat(rec.Copay);
});
sg = _.supergroup(data, ['Physician','Unit']); // # run
sg[0].aggregate(d3.sum, "Charge") // # show render
sg[0].aggregate(d3.sum, function(rec) { return rec.Charge - rec.Copay; }) // # show render
sg.aggregates(d3.sum, "Charge") // # show render
sg.aggregates(d3.sum, "Charge", "dict") // # show render</code></pre></div>

## Finding specific values
  <a id='sgnodes'></a>

<div><pre class="rendercode language-javascript" id="lookup"
><code>
sg.lookup("Feldman") // # show render
sg.lookup("Feldman").aggregate(d3.sum,"Charge") // # show render
sg.lookup(["Gupta", "pediatrics"]).namePath() // # show render
sg.lookupMany(["Baker", "Doom", "Feldman","A Name With No Match"]) // # show render
</code></pre></div>

<a id='sgnodesets'></a>
## Retrieving sets of values

<div><pre class="rendercode language-javascript" id="nodesets"
><code>
sg.leafNodes()  // all bottom level groups  # show render
sg.flattenTree()  // all groups  # show render
_(sg.leafNodes()).invoke("namePath") // call .namePath() on all bottom level groups using underscore invoke  # show render
</code></pre></div>

## Using Supergroup for D3 hierarchy layouts
  D3 [hierarchy layouts](https://github.com/mbostock/d3/wiki/Hierarchy-Layout)
  (Cluster, Pack, Partition, Tree, Treemap) require a slightly different data
  structure than those produced by d3.nest. 
  [Underscore.Nest](https://github.com/iros/underscore.nest) does very close
  to the right thing, but Supergroup gives you a bunch of added benefits.

  I'll demonstrate using Supergroup in a D3 hierarchy with code from 
  [this basic div-based treemap example](https://gist.github.com/mbostock/4063582).

  The kind of tree D3 wants for its hierarchy layouts has a single root node and
  at the leaf level are the raw records. Except for the leaves, every node has
  a children array. On upper levels, a group node's children are other group nodes.
  At the next-to-bottom level, the children are raw records. Supergroup generally
  considers records and children to be two different things, and the children
  of a group value are other group values. 

  So, for D3 hierarchies, we get a root node by calling ```root = sg.asRootVal()```.
  Then we add a final level of raw records by calling 
  ```root.addRecordsAsChildrenToLeafNodes()```. Now root is ready to be used
  in a treemap. To see details, inspect code 
  [here](./examples/examples.html?sghierarchy).

<a id='sghierarchy'></a>

<div><pre class="rendercode language-javascript" id="treemap"
><code>
window.root = _.supergroup(data, ['Physician','Unit']).asRootVal('All Physicians'); // # show run
root.addRecordsAsChildrenToLeafNodes();
d3.layout.hierarchy()(root); // # show render
</code></pre></div>

<div><pre class="rendercode language-javascript" id="treemap"
><code>
var color = d3.scale.category20c();
var treemap = d3.layout.treemap()
    .size([700, 400])
    .padding([18,3,3,3])
    .value(function(d) { return d.Charge })
var div = d3.select("div#viz");
var node = div.datum(root).selectAll(".treemapnode")
        .data(treemap.nodes)
    .enter().append("div")
        .attr("class", "treemapnode")
        .call(position)
        .style("background", function(d) { return d.children ? color(d) : null; })
        .text(function(d) { 
            return d.children ? d : 
                _.chain(d).pick('Patient', 'Date', 'Charge')
                    .values().value().join(', ');
        }) // # run show

function position() {
    this.style("left", function(d) { return d.x + "px"; })
        .style("top", function(d) { return d.y + "px"; })
        .style("width", function(d) { return Math.max(0, d.dx - 1) + "px"; })
        .style("height", function(d) { return Math.max(0, d.dy - 1) + "px"; });
} // # run
</code></pre></div>
<div id="viz" style="margin-top:10px;height:400px;"></div>

## d3.nest formats
<div><pre class="rendercode language-javascript" id="d3entries" height="100px"><code>
sg.d3entries() // # show render indent2
</code></pre></div>

<div><pre class="rendercode language-javascript" id="d3map" height="100px"><code>
sg.d3map() // # show render indent2
</code></pre></div>

<a id='sgmultval'></a>
## Multi-valued Groups
  Sometimes it makes sense to group on multi-valued fields, which leads
  to the result that records with multiple values in a grouped field end up 
  in more than one group. It doesn't happen often, but when it does, good
  luck getting underscore or lodash or d3.nest or anything to help you with
  the grouping. 

  One of our fake data records has two values separated by a semicolon in the
  Insurance field. We turn that field into an array. First we show that by
  default, Supergroup rejoins the array (with commas) and groups as usual,
  giving us four Insurance groups. But when we ask for multiValuedGroups,
  we only get three groups. And that one record will show up in both of
  them.


<div><pre class="rendercode language-javascript" id="multivaluedGroups"
><code>
_.each(data, function(d) { d.Insurance = d.Insurance.split(';')}) //  make Insurance field an array instead of ;-delimited string  # show run
_.supergroup(data, "Insurance") // supergroup by default just makes the array back into a string, joined with comma. so, 4 Insurance groups  // # show render
_.supergroup(data, 'Insurance', {multiValuedGroup: true}); // now only 3 Insurance groups!  # show render
mvnest = _.supergroup(data, ['Insurance','Patient'], {multiValuedGroups: ['Insurance']});
_.invoke(mvnest.leafNodes(),'namePath') // # show render
</code></pre></div>
  
  (In order to get this to work, I exposed an internal function
  of lodash. You can see the tiny change in my [lodash fork](https://github.com/Sigfried/lodash/commit/e158039d54d69e1362b15e8478885c4aaa23c9b2).)

<div><pre class="rendercode language-javascript" id="diff"
><code>
og = _.supergroup(olympics, ["Country","Athlete","Year"]);
diff = _.sgDiffList(
            og.lookup(["United States","Michael Phelps",2004], true),
            og.lookup(["United States","Michael Phelps",2008], true),
            "Year") // # show render
</code></pre></div>
## License ##
  MIT: [http://sigfried.mit-license.org/](http://sigfried.mit-license.org/)

</section>
</div>
<script src="./docrender.js"></script>
<script>
    d3.xhr('./examples/fake-patient_data.csv', function(err, resp) {
        csv = resp.response;
        data = d3.csv.parse(csv);
        d3.csv('./examples/OlympicAthletes.csv', function(odata) {
            olympics = odata;
            render();
        })
    });
</script>
