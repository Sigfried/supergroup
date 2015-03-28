Supergroup
==========

At first glance what Supergroup returns appears to be a list of String 
objects representing the top-level grouping 

    sg = _.supergroup(data, ['Country','Sport','Year']) // ==> ["United States","Russia","Australia"]
    sg[0]  // ==> "United States"

but the grouped records show up as a property: 

    sg[0].records.length // ==> 210
    sg[0].records.slice(0,2) // ==> [
        {"Athlete":"Michael Phelps","Age":"23","Country":"United States","Year":"2008","Closing Ceremony Date":"8/24/08","Sport":"Swimming","Gold Medals":"8","Silver Medals":"0","Bronze Medals":"0","Total Medals":"8"},
        {"Athlete":"Michael Phelps","Age":"19","Country":"United States","Year":"2004","Closing Ceremony Date":"8/29/04","Sport":"Swimming","Gold Medals":"6","Silver Medals":"0","Bronze Medals":"2","Total Medals":"8"}
      ]

and subgroups appear in a children property: 

    sg[0].children // ==> ["Swimming","Gymnastics","Diving","Wrestling","Weightlifting"]
