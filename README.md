Supergroup
==========

At first glance what Supergroup returns appears to be a list of String 
objects representing the top-level grouping. (Examples use a subset of
[these Olympic athlete records](https://github.com/Sigfried/supergroup/blob/master/examples/OlympicAthletes.csv).)

    sg = _.supergroup(data, ['Country','Sport','Year']) // ==> ["United States","Russia","Australia"]
    sg[0]  // ==> "United States"

Original records in each group show up as a property of that group's String object: 

    sg[0].records.length // ==> 210
    sg[0].records.slice(0,2) // ==> [
        {"Athlete":"Michael Phelps","Age":"23","Country":"United States","Year":"2008","Closing Ceremony Date":"8/24/08","Sport":"Swimming","Gold Medals":"8","Silver Medals":"0","Bronze Medals":"0","Total Medals":"8"},
        {"Athlete":"Michael Phelps","Age":"19","Country":"United States","Year":"2004","Closing Ceremony Date":"8/29/04","Sport":"Swimming","Gold Medals":"6","Silver Medals":"0","Bronze Medals":"2","Total Medals":"8"}
      ]

and subgroups appear in a children property: 

    sg[0].children // ==> ["Swimming","Gymnastics","Diving","Wrestling","Weightlifting"]

Unlike common data grouping/nesting utilities (D3.nest, Underscore.Nest)
Supergroup gives you record subsets at every level, not just at the leaf level.
No need to roll up subgroups for calculating aggregates at higher levels.
Supergroup also provides convenience methods for aggregating:

    sg[0].aggregate(d3.sum, "Total Medals") // ==> 352
    sg[0].children[0].aggregate(d3.sum, "Total Medals") // ==> 267
    sg.aggregates(d3.sum, "Total Medals") // ==> [352,157,180]
    sg.aggregates(d3.sum, "Total Medals", "dict") // ==> {"United States":352,"Russia":157,"Australia":180}

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

Find nodes by looking up specific values. From any node, get all descendant or
just leaf nodes:

    sg.lookup(["Russia","Swimming"]) // ==> "Swimming"
    sg.lookup("Russia").descendants() // ==> ["Gymnastics",2000,2004,2008,2012,"Diving",2000,2004,2008,2012,"Swimming",2000,2004,2008,2012,"Wrestling",2000,2004,2008,2012,"Weightlifting",2000,2004,2008,2012]
    sg.lookup("Russia").leafNodes() // ==> [2000,2004,2008,2012,2000,2004,2008,2012,2000,2004,2008,2012,2000,2004,2008,2012,2000,2004,2008,2012]

All nodes in a single array:

    sg.flattenTree() // ==> ["United States","Swimming",2000,2004,2008,2012,"Gymnastics",2000,2004,2008,2012,"Diving",2000,2012,"Wrestling",2000,2004,2008,2012,"Weightlifting",2000,"Russia","Gymnastics",2000,2004,2008,2012,"Diving",2000,2004,2008,2012,"Swimming",2000,2004,2008,2012,"Wrestling",2000,2004,2008,2012,"Weightlifting",2000,2004,2008,2012,"Australia","Swimming",2000,2004,2008,2012,"Diving",2000,2004,2008,2012]
    _.invoke(sg.flattenTree(), "namePath") // ==> [
        "United States",
        "United States/Swimming",
        "United States/Swimming/2000",
        "United States/Swimming/2004",
        ...

Multivalued groups

    _.supergroup([{A:[1,2]}, {A:[2]}, {A:[2,3]}], 'A').d3entries() // normal operation
    // ==> [{"key":"2","values":[{"A":[2]}]},{"key":"1,2","values":[{"A":[1,2]}]},{"key":"2,3","values":[{"A":[2,3]}]}]"
    
    _.supergroup([{A:[1,2]}, {A:[2]}, {A:[2,3]}], 'A',{multiValuedGroup:true}).d3entries() // allow records to appear in more than on group
    // ==> [{"key":"1","values":[{"A":[1,2]}]},{"key":"2","values":[{"A":[1,2]},{"A":[2]},{"A":[2,3]}]},{"key":"3","values":[{"A":[2,3]}]}]
