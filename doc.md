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


<script src="https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.2/underscore.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.5/d3.js"></script>
<script src="https://rawgit.com/Sigfried/supergroup/master/supergroup.js"></script>
<a href="https://github.com/sigfried/supergroup"><img style="position: absolute; top: 0; right: 0; border: 0;" src="https://camo.githubusercontent.com/365986a132ccd6a44c23a9169022c0b5c890c387/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f7265645f6161303030302e706e67" alt="Fork me on GitHub" data-canonical-src="https://s3.amazonaws.com/github/ribbons/forkme_right_red_aa0000.png"></a>
<div markdown="1">
<section>
# Supergroup.js #

{{README.md}}

Just to be clear about the problem&mdash;you start with tabular data from a CSV
file, a SQL query, or some AJAX call:
<p><span class="iframe">Some very fake hospital data in a CSV file...</span>
<iframe width="100%" height="70px" src="examples/examples.html?data">
</iframe></p>

<p><span class="iframe">...turned into canonical array of Objects (using d3.csv, for instance)</span>
<iframe width="100%" height="80px" src="examples/examples.html?json">
</iframe></p>

Without Supergroup, you'd group the records on the values of one or more fields
with a standard grouping function, giving you data like:

<p><span class="iframe">d3.nest().key(function(d) { return d.Physician; }).key(function(d) { return d.Unit; }).map(data)</span>
<iframe width="100%" height="150px" src="examples/examples.html?d3map">
</iframe></p>
or
<p><span class="iframe">d3.nest().key(function(d) { return d.Physician; }).key(function(d) { return d.Unit; }).entries(data)</span>
<iframe width="100%" height="150px" src="examples/examples.html?d3nest">
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
  - Ability to include records in multipl groups if appropriate ([Multi-valued Groups](#multi-valuedgroups))
  
## Supergroup
  Works as an Underscore (or [Lo-Dash](https://lodash.com/)) mixin: 

  <pre class="language-markup" data-src="mixin_example.html"></pre>

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
  <p><span class="iframe">Supergroup on physician and unit</span>
  <iframe width="100%" height="370px" src="examples/examples.html?sgphysunit">
  </iframe></p>

## Dimension names and paths

  When you're using D3 for any kind of significant application, you'll be
  writing callbacks that could accept datums of different sorts, from different
  hierarchy levels or whatever. D3 makes it super easy to pass the data values
  around, but then you spend half your time trying to reattach metadata to the
  values you're using. Not with Supergroup:
  <a id='sgdims'></a>
  <p><iframe width="100%" height="220px" src="examples/examples.html?sgdims">
  </iframe></p>

## Aggregates
  You can apply aggregate functions to the records of a single group or
  to all the groups in a list.
  <a id='sgagg'></a>
  <p><iframe width="100%" height="180px" src="examples/examples.html?sgagg">
  </iframe></p>

## Finding specific values
  <a id='sgnodes'></a>
  <p><iframe width="100%" height="180px" src="examples/examples.html?sgnodes">
  </iframe></p>

## Retrieving sets of values
  <a id='sgnodesets'></a>
  <p><iframe width="100%" height="200px" src="examples/examples.html?sgnodesets">
  </iframe></p>

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
  <p><iframe width="100%" height="370px" src="examples/examples.html?sghierarchy">
  </iframe></p>

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

  <a id='sgmultval'></a>
  <p><iframe width="100%" height="200px" src="examples/examples.html?sgmultval">
  </iframe></p>
  
  (In order to get this to work, I exposed an internal function
  of lodash. You can see the tiny change in my [lodash fork](https://github.com/Sigfried/lodash/commit/e158039d54d69e1362b15e8478885c4aaa23c9b2).)

## License ##
  MIT: [http://sigfried.mit-license.org/](http://sigfried.mit-license.org/)

</section>
</div>
<script src="assets/prism.js"></script>
