Supergroup brings extreme convenience and understandability to the manipulation of 
Javascript data collections, especially in the context of D3.js visualization
programming.

Certain data manipulation problems arise over and over again in data-centric
Jaascript programming. [d3.nest](https://github.com/mbostock/d3/wiki/Arrays#-nest),
[d3.map](https://github.com/mbostock/d3/wiki/Arrays#associative-arrays), and 
[underscore.groupBy](http://underscorejs.org/#groupBy) solve the most completely
generic aspects of these problems, but after using these generic tools, there
is often much work left to do to extract the desired information from the resulting
data structures.

In most cases where you might use one of these generic utility functions, Supergroup
will save you some of the further work you will have to do.

Generally you start with tabular data from a CSV file, a SQL query, or some AJAX
call. You group the records on the values from one or more fields.

Information you're likely to want after grouping includes:

    - 
