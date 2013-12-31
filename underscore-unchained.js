'use strict()';
if (typeof(require) !== "undefined") 
    _ = require('underscore'); // otherwise assume it was included by html file

_.mixin({
/* ## _.unchain(obj, magicPowers)
_enhance arrays and other objects with Underscore methods so you don't need 
to mess with _.chain() and .value() every time you do two Underscore methods in sequence._

    @param {Object} obj The Object to be enhanced, usually an array.
    @param {Object} [magicPowers]
    @param {String[]} [magicPowers.include] Defaults to all the Underscore functions.
        Use an empty array if you don't want any Underscore functions.
    @param {String[]} [magicPowers.exclude] any Underscore functions you don't want.
    @param {Object} [magicPowers.more] map of any other methodNames and functions you'd like thrown in.
    @param {Object} [magicPowers.plainPrimitives=false] if true, don't turn primitive data types into Objects for enhancement.
    @return {Object} enhanced with methods which all return similarly enhanced results
    @example ```
_.unchain(['a','bb','ccc'])
     .pluck('length')
     .last()
     .range()
=> [0, 1, 2]

_.unchain(['a','bb','ccc'],{plainPrimitives:true})
     .pluck('length')
     .last()
     .range()
=> TypeError: Object 3 has no method 'range'
```
    */
    unchain: function(obj, magicPowers) {
        var map = {};
        var unames = magicPowers && magicPowers.include ||
            _.chain(_.prototype)
                .keys()
                .difference(Object.getOwnPropertyNames(Array.prototype))
                .value();
        _(unames).each(function(underscoreFuncName) {
            map[underscoreFuncName] = _[underscoreFuncName];
        });
        if (magicPowers && magicPowers.more)
            _.extend(map, magicPowers.more);
        return enhance(obj, map, magicPowers && magicPowers.plainPrimitives);
    },
/*
## _.prometheus(obj, magicPowers)
_Defy the gods and bring the full power of Underscore to *ALL* your Arrays, Objects, or whatever.
Also works with constructors of user-defined classes. Use at your own risk._
    @example ```
_.prometheus(Array);
['a','bb','ccc'].pluck('length').last().range()
=> [0, 1, 2]
```

 */
    prometheus: function(obj, magicPowers) {
        return _.unchain(obj.prototype, magicPowers);
    },
    round: Math.round,
    mapScalar: function(scalar, func) {
        return func(scalar);
    }
});

function enhance(obj, funcsAndNames, plainPrimitives) {
    _.chain(funcsAndNames).pairs().each(function(pair) {
        var methodName = pair[0], func = pair[1];
        Object.defineProperty(obj, methodName, {
            value: function() {
                var result = func.apply(_, [this].concat(_.toArray(arguments)));
                if (result instanceof Object)
                    return enhance(result, funcsAndNames, plainPrimitives);
                if (plainPrimitives)
                    return result;
                return enhance(new Object(result), funcsAndNames, plainPrimitives);
            }
        });
    });
    return obj;
}
if (typeof exports !== 'undefined') {   // not sure if this is all right
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = _;
    }
    exports._ = _;
} else if (typeof define === 'function' && define.amd) {
    // Register as a named module with AMD.
    define('_', [], function() {
        return nester;
    });
}
