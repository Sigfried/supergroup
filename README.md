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
