/**
* underscore.nest - v0.1.1 - 7/13/2012
* http://github.com/iros/underscore.nest/
* Copyright (c) 2012 Irene Ros;
* Underscore.Nest is freely distributable under the MIT license.
*/
(function(global, _) {

  var nester = global.nest = {};

  // helper that converts a group object like so:
  // { category : [{}, {}, {}, ... ], category2 : ...}
  // to:
  // [{ name : category, children : [{}, {}, {}, ...]},
  //  { name : category2, children : [{}, {}, {}, ...]}]
  var _transformGrouping = function(group) {
    return _.map(group, function(rows, key) {
      return { name : key, children : rows };
    });
  };

  /**
  * convert a series of rows to a nested tree structure
  * based on the list of keys to bin by. 
  * optionally reduce the resulting sub collections of rows
  * with a "reduce" function that returns a single row.
  */
  nester.nest = function(rows, keys, reduce) {
    
    if (_.isString(keys)) {
      keys = [keys];
    }

    var _infiniteNest = function(parent, keyIndex, childIndex) {

      if (keyIndex === 0) {
        // build initial children arrays by grouping first level
        parent.children = _transformGrouping(_.groupBy(rows, keys[0]));      

        // if we have more keys to traverse, go through every
        // child grouping and nest that.
        if (keyIndex < keys.length) {
          for (var i = 0; i < parent.children.length; i++) {
            _infiniteNest(parent.children[i], keyIndex + 1, i);
          }
        }
      } else {

        // save the position of this specific child in
        // its parent child heirarchy
        parent.index = childIndex;

        if (keyIndex >= keys.length) {

          // if we have a reduce method provided, reduce the
          // children
          if (typeof reduce !== "undefined") {
            
            parent.value = reduce(parent.children);

            // remove the original children array, since we've 
            // reduced it.
            delete parent.children;
          } 

        } else {

          parent.children = _transformGrouping(
            _.groupBy(parent.children, keys[keyIndex])
          );

          for(var m = 0; m < parent.children.length; m++) {
            _infiniteNest(parent.children[m], keyIndex + 1, m);
          }
        }
      }

      return parent;
    };

    return _infiniteNest({}, 0);
  };
  
// CommonJS module is defined
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      // Export module
      module.exports = nester;
    }
    exports.nester = nester;

  } else if (typeof define === 'function' && define.amd) {
    // Register as a named module with AMD.
    define('underscore.nest', [], function() {
      return nester;
    });

  } else {
    // Integrate with Underscore.js if defined
    global._.mixin(nester);
  }

}(this, _));
