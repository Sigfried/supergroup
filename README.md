Supergroup
==========
Supergroup performs single- or multi-level grouping on collections of records. It provides a host of utitily and conveniece methods on the returned array of group values as well as on each of these specific group values. If a multi-level grouping is performed, each value's `children` array also acts as a Supergroup list.

Supergroup is implemented as an Underscore or LoDash mixin, so just include one of those first:

    <script src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/3.5.0/lodash.min.js"></script>
    <script src="https://rawgit.com/Sigfried/supergroup/master/supergroup.js"></script>

At first glance what Supergroup returns appears to be a list of String 
objects representing the top-level grouping. (Examples use a subset of
[these Olympic athlete records](https://github.com/Sigfried/supergroup/blob/master/examples/OlympicAthletes.csv).)

    sg = _.supergroup(data, ['Country','Sport','Year']) // ==> ["United States","Russia","Australia"]
    sg[0]  // ==> "United States"

#### Original records in each group show up as a property of that group's String object: 

    sg[0].records.length // ==> 210
    sg[0].records.slice(0,2) // ==> [
        {"Athlete":"Michael Phelps","Age":"23","Country":"United States","Year":"2008","Closing Ceremony Date":"8/24/08","Sport":"Swimming","Gold Medals":"8","Silver Medals":"0","Bronze Medals":"0","Total Medals":"8"},
        {"Athlete":"Michael Phelps","Age":"19","Country":"United States","Year":"2004","Closing Ceremony Date":"8/29/04","Sport":"Swimming","Gold Medals":"6","Silver Medals":"0","Bronze Medals":"2","Total Medals":"8"}
      ]

#### and subgroups appear in a children property: 

    sg[0].children // ==> ["Swimming","Gymnastics","Diving","Wrestling","Weightlifting"]

#### Aggregates
Unlike common data grouping/nesting utilities (D3.nest, Underscore.Nest)
Supergroup gives you record subsets at every level, not just at the leaf level.
No need to roll up subgroups for calculating aggregates at higher levels.
Supergroup also provides convenience methods for aggregating:

    sg[0].aggregate(d3.sum, "Total Medals") // ==> 352
    sg[0].children[0].aggregate(d3.sum, "Total Medals") // ==> 267
    sg.aggregates(d3.sum, "Total Medals") // ==> [352,157,180]
    sg.aggregates(d3.sum, "Total Medals", "dict") // ==> {"United States":352,"Russia":157,"Australia":180}

#### Metadata
Supergroup remembers the dimension names used to produce groupings. And
individual nodes contain a reference to the level they’re on and to their
parent values and lists:

    sg[0].children[0].children[0] // ==> 2000
    sg[0].children[0].children[0].depth // (top level is 0) ==> 2
    sg[0].children[0].children[0].dim // ==> "Year"
    sg[0].children[0].children[0].parent // ==> "Swimming"
    sg[0].children[0].children[0].parentList // ==> [2000,2004,2008,2012]
    sg[0].children[0].children[0].namePath() // ==> "United States/Swimming/2000"
    sg[0].children[0].children[0].dimPath() // ==> "Country/Sport/Year"

#### lookup, descendants, leafNodes
Find nodes by looking up specific values. From any node, get all descendant or
just leaf nodes:

    sg.lookup(["Russia","Swimming"]) // ==> "Swimming"
    sg.lookup("Russia").descendants() // ==> ["Gymnastics",2000,2004,2008,2012,"Diving",2000,2004,2008,2012,"Swimming",2000,2004,2008,2012,"Wrestling",2000,2004,2008,2012,"Weightlifting",2000,2004,2008,2012]
    sg.lookup("Russia").leafNodes() // ==> [2000,2004,2008,2012,2000,2004,2008,2012,2000,2004,2008,2012,2000,2004,2008,2012,2000,2004,2008,2012]

#### All nodes in a single array:

    sg.flattenTree() // ==> ["United States","Swimming",2000,2004,2008,2012,"Gymnastics",2000,2004,2008,2012,"Diving",2000,2012,"Wrestling",2000,2004,2008,2012,"Weightlifting",2000,"Russia","Gymnastics",2000,2004,2008,2012,"Diving",2000,2004,2008,2012,"Swimming",2000,2004,2008,2012,"Wrestling",2000,2004,2008,2012,"Weightlifting",2000,2004,2008,2012,"Australia","Swimming",2000,2004,2008,2012,"Diving",2000,2004,2008,2012]
    _.invoke(sg.flattenTree(), "namePath") // ==> [
        "United States",
        "United States/Swimming",
        "United States/Swimming/2000",
        "United States/Swimming/2004",
        ...

#### Output in d3.nest formats

    sg.d3map() // ==> {
        "United States":{
            "Swimming":{
                "2000":[
                    {"Athlete":"Dara Torres","Age":"33", ...
                    {"Athlete":"Gary Hall Jr.","Age":"25", ...
                    ],
                "2004":[
                    {"Athlete":"Michael Phelps","Age":"19", ...

    sg.d3entries() // ==> [
        {"key":"United States","values":[
            {"key":"Swimming","values":[
                {"key":"2000","values":[
                    {"Athlete":"Dara Torres","Age":"33", ...
                    
#### For use in D3 hierarchy layouts
    // D3 hierarchies need a single root node
    root = sg.asRootVal("Olympics") // ==> "Olympics"
    root.children // ==> ["United States","Russia","Australia"]
    
    // normally leaf nodes are the bottom level grouping:
    _.invoke(root.leafNodes(),'namePath') // ==> ["United States/Swimming/2000", "United States/Swimming/2004", ...
    
    // but D3 hierachies need to have actual records as leaf nodes
    root.addRecordsAsChildrenToLeafNodes() // this adds a level to the grouping (changes sg also)
    _.invoke(root.leafNodes(),'namePath')  //
      ==> ["Olympics/United States/Swimming/2000/[object Object]", "Olympics/United States/Swimming/2000/[object Object]"]
      // it's now a 5-level hierarchy with a root node at top and original records at bottom
    
                    
#### Multivalued groups

    _.supergroup([{A:[1,2]}, {A:[2,3]}], 'A').d3map() // normal operation
    // ==> { 
            "1,2": [{"A":[1,2]}],
            "2,3": [{"A":[2,3]}]
           }
    
    _.supergroup([{A:[1,2]}, {A:[2,3]}], 'A',{multiValuedGroup:true}).d3map() // allow records to appear in more than one group
    // ==> {
            "1":[{"A":[1,2]}],
            "2":[{"A":[1,2]},{"A":[2,3]}],
            "3":[{"A":[2,3]}]
           }
