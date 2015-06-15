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
<script src="./testEasyMap.js"></script>


<div markdown="1">
<section>

<pre class="rendercode language-javascript" id="nestmap" height="150px"><code>
nest = d3.sgnest().keys(['Physician', 'Unit']); // # show
</code></pre>
<pre class="rendercode language-javascript" id="nestmap" height="150px"><code>
g = nest.noCycles(true).groups(data);  // # show render indent2 result.replace(/,\n/g, ", ").replace(/("key".*, )/g,"$1\n").replace(/,   */g, ", ")
g.toString(); // # show render
</code></pre>
<pre class="rendercode language-javascript" id="nestmap" height="150px"><code>
a = g.lookup('Adams'); // # show render
</code></pre>
<pre class="rendercode language-javascript" id="nestmap" height="150px"><code>
nodes = nest.nodes(g[0]); // # show render
// # show render
</code></pre>
<pre class="rendercode language-javascript" id="nestmap" height="150px"><code>
t = nest.tree(data);  // # show render indent2 result.replace(/,\n/g, ", ").replace(/("key".*, )/g,"$1\n").replace(/,   */g, ", ")
// # show render
</code></pre>
<pre class="rendercode language-javascript" id="nestmap" height="150px"><code>
nodes = nest.nodes(t); // # show render
// # show render
</code></pre>
<pre class="rendercode language-javascript" id="nestmap" height="150px"><code>
paths = _.invoke(nodes,'namePath');
// # show render
</code></pre>
<pre class="rendercode language-javascript" id="nestmap" height="150px"><code>
node = t.lookup(['Adams','preop']);
// # show render
</code></pre>
<pre class="rendercode language-javascript" id="nestmap" height="150px"><code>
//g.children[0].nodes(); // # show render
g = nest.leafNodesAreGroups(false).groups(data);  // # show render indent2 result.replace(/,\n/g, ", ").replace(/("key".*, )/g,"$1\n").replace(/,   */g, ", ")
// # show render
</code></pre>
<pre class="rendercode language-javascript" id="nestmap" height="150px"><code>
m = nest.map(data);  // # show render indent2
// # show render
</code></pre>
<pre class="rendercode language-javascript" id="nestmap" height="150px"><code>
e = nest.entries(data);  // # show render indent2 result.replace(/,\n/g, ", ").replace(/("key".*, )/g,"$1\n").replace(/,   */g, ", ")
// # show render
</code></pre>

or

<pre class="rendercode language-javascript" id="nestentries" height="150px"><code>
d3.sgnest().key(function(d) { return d.Physician; })
            .key(function(d) { return d.Unit; })
            .noCycles(true)
            .entries(data);  // # show render indent2 result.replace(/,\n/g, ", ").replace(/("key".*, )/g,"$1\n").replace(/,   */g, ", ")
</code></pre>
<script src="./docrender.js"></script>
<script>
    d3.xhr('./examples/fake-patient_data.csv', function(err, resp) {
        csv = resp.response;
        data = d3.csv.parse(csv);
        test(data);
        /*
        d3.csv('./examples/OlympicAthletes.csv', function(odata) {
            olympics = odata;
            render();
        })
        */
    });
</script>
