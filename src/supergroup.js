'use strict';
/*
 * # supergroup.js
 * Author: [Sigfried Gold](http://sigfried.org) 
 * License: [MIT](http://sigfried.mit-license.org/) 
 * Version: 2.0.0
 * (starting to convert to es6)
 *
 * usage examples at [http://sigfried.github.io/blog/supergroup](http://sigfried.github.io/blog/supergroup)
 */
; // jshint -W053

//require('babel-core');
import _ from 'lodash';
//let _ = require('lodash');
import assert from 'assert';
//const assert = require("assert");

/* @exported function supergroup.group(recs, dim, opts)
  * @param {Object[]} recs list of records to be grouped
  * @param {string or Function} dim either the property name to
  group by or a function returning a group by string or number
  * @param {Object} [opts]
  * @param {String[]} [opts.excludeValues] to exlude specific group values
  * @param {function} [opts.preListRecsHook] run recs through this
  * function before continuing processing
  * @param {function} [opts.dimName] defaults to the value of `dim`.
  * If `dim` is a function, the dimName will be ugly.
  * @param {function} [opts.truncateBranchOnEmptyVal] 
  * @return {Array of Values} enhanced with all the List methods
  *
  * Avaailable as _.supergroup, Underscore mixin
  *
  * new structure:
  *
  * Supergroup extends Array
  *   Array values are Values
  *   properties:
  *     groupsmap: keys are the keys used to group Values, values are Values
  *     recsmap:   keys are index into original records array, values are orig records
  *   methods:
  *     rawValues: returns keys from groupsmap
  *
  * Values
  *     children:  returns Values from groupsmap
  */

// private Supergroup methods:
function groupBy(recsmap, keyfunc, keyname, depth=0, opts={}) {
  //let sg = new Supergroup();
  let groupsmap = new Map();
  recsmap.forEach( (r,i) => {
    let key = keyfunc(r);
    let val;
    //console.log(`making Value for ${keyname}:${key} by applying ${keyfunc} to ${JSON.stringify(r)}`);
    if (!groupsmap.has(key)) {
      if (opts.excludeValues) {
        if (_.isArray(opts.excludeValues) && !_.find(opts.exludeValues(key))) {
        } else if (opts.excludeValues instanceof Map && !opt.excludeValues.has(key)) {
        }
      } else {
        val = new Value(key);
        val.dim = keyname;
        val.recsmap = new Map();
        val.depth = depth;
        groupsmap.set(key, val);
      }
    } else {
      val = groupsmap.get(key);
    }
    val.recsmap.set(i, r);
  });
  return groupsmap;
}
function nest(recsmap, keys, keynames=[], 
              depth=0, opts={}, parent) {
  let key = keys.shift();
  let keyname = keynames.shift();
  let keyfunc = key;
  if (!_.isFunction(key)) {
    keyname = keyname || key;
    keyfunc = (d) => d[key];
  }
  //console.log(`keyname: ${keyname}, keyfunc: ${keyfunc}`);
  if (opts.preListRecsHook) {
    throw new Error("preListRecsHook not re-implemented yet");
    recs = opts.preListRecsHook ? opts.preListRecsHook(recs) : recs;
  }
  if (opts.truncateBranchOnEmptyVal) { // can't remember when this is used
    throw new Error("truncateBranchOnEmptyVal not re-implemented yet");
    recs = recs.filter(r => !_.isEmpty(r[dim]) || (_.isNumber(r[dim]) && isFinite(r[dim])));
  }
  let groupsmap = groupBy(recsmap, keyfunc, keyname, depth, opts);
  //console.log(`MAPKEYS: ${[...groupsmap.keys()]}`);
  groupsmap.forEach( (val, groupKey) => {
    //console.log("depth---", depth, "groupKey---",groupKey,"val---", val);
    val.parentList = parent;
    if (keys.length) {
      debugger;
      val.children = nest(val.records, keys, keynames, depth+1, opts);
    }
  });
  return groupsmap; // returns (nested) map
}
export class Supergroup extends Array {

  constructor(recs, dims, opts={}, depth) {
    let root = new Value(opts.rootVal || "root");
    root.depth = opts.rootVal ? 0 : -1;
    root.recsmap = new Map();
    recs.forEach( (r,i) => {
      root.recsmap.set(i, r)
    });

    if (!_.isArray(dims)) {
      dims = [dims];
    }
    root.children = nest(root.recsmap, dims, 
                                opts.dimName ? [opts.dimName] : opts.dimNames,
                                0, opts, root);

    if (opts.multiValuedGroup || opts.multiValuedGroups) {
      throw new Error("multiValuedGroup not implemented in es6 version yet");
    }
    super();
    this.push(...(root.children));
  };
  state() {
    return new State(this);
  }

  // sometimes a root value is needed as the top of a hierarchy
  asRootVal(name, dimName) {
    var val = new Value(name || 'Root');
    val.dim = dimName || 'root';
    val.depth = 0;
    val.records = this.records;
    val.children= this;
    _.each(val.children, function(d) { d.parent = val; });
    _.each(val.descendants(), function(d) { d.depth = d.depth + 1; });
    return val;
  };
  leafNodes(level) {
    return _.chain(this).invoke('leafNodes').flatten()
      .addSupergroupMethods()
      .value();
  };
  rawValues() {
    return this.map(String);
  };
  // lookup a value in a list, or, if query is an array
  //   it is interpreted as a path down the group hierarchy
  lookup(query) {
    if (_.isArray(query)) {
      // if group has children, can search down the tree
      var values = query.slice(0);
      var list = this;
      var ret;
      while(values.length) {
        ret = list.singleLookup(values.shift());
        list = ret.children;
      }
      return ret;
    } else {
      return this.singleLookup(query);
    }
  };

  getLookupMap() {
    var self = this;
    if (! ('lookupMap' in self)) {
      self.lookupMap = {};
      self.forEach(function(d) {
        if (d in self.lookupMap)
          console.warn('multiple occurrence of ' + d + 
            ' in list. Lookup will only get the last');
        self.lookupMap[d] = d;
      });
    }
    return self.lookupMap;
  };
  singleLookup(query) {
    return this.getLookupMap()[query];
  };

  // lookup more than one thing at a time
  lookupMany(query) {
    var list = this;
    return addSupergroupMethods(_.chain(query).map(function(d) { 
      return list.singleLookup(d)
    }).compact().value());
  };
  flattenTree() {
    return _.chain(this)
          .map(function(d) {
            var desc = d.descendants();
            return [d].concat(desc);
          })
          .flatten()
          .filter(_.identity) // expunge nulls
          .tap(addListMethods)
          .value();
  };
  addLevel(dim, opts) {
    _.each(this, function(val) {
      val.addLevel(dim, opts);
    });
    return this;
  };
  namePaths(opts) {
    return _.map(this, function(d) {
      return d.namePath(opts);
    });
  };
  // apply a function to the records of each group
  // 
  aggregates(func, field, ret) {
    var results = _.map(this, function(val) {
      return val.aggregate(func, field);
    });
    if (ret === 'dict')
      return _.object(this, results);
    return results;
  };

  d3NestEntries() {
    return _.map(this, val => {
      if ('children' in val)
        return {key: val.toString(), values: val.children.d3NestEntries()};
      return {key: val.toString(), values: val.records};
    });
  };
  d3NestMap() {
    return _.chain(this).map(
      function(val) {
        if (val.children)
          return [val+'', val.children.d3NestMap()];
        return [val+'', val.records];
      }).object().value();
  }
  rootList(func) {
    if ('parentVal' in this)
      return this.parentVal.rootList();
    return this;
  };

  static wholeListNumeric(groups) {
    var isNumeric = _.every(_.keys(groups), function(k) {
      return   k === null ||
            k === undefined ||
            (!isNaN(Number(k))) ||
            ["null", ".", "undefined"].indexOf(k.toLowerCase()) > -1;
    });
    if (isNumeric) {
      _.each(_.keys(groups), function(k) {
        if (isNaN(k)) {
          delete groups[k];    // getting rid of NULL values in dim list!!
        }
      });
    }
    return isNumeric;
  }
}

/** Summarize records by a dimension
  *
  * @param {list} Records to be summarized
  * @param {numericDim} Dimension to summarize by
  *
  * @memberof supergroup
  */
var aggregate = function(list, numericDim) { 
  if (numericDim) {
    list = _.pluck(list, numericDim);
  }
  return _.reduce(list, function(memo,num){
        memo.sum+=num;
        memo.cnt++;
        memo.avg=memo.sum/memo.cnt; 
        memo.max = Math.max(memo.max, num);
        return memo;
      },{sum:0,cnt:0,max:-Infinity});
}; 
/** Compare groups across two similar root nodes
  *
  * @param {from} ...
  * @param {to} ...
  * @param {dim} ...
  * @param {opts} ...
  *
  * used by treelike and some earlier code
  *
  * @memberof supergroup
  */
var diffList = function(from, to, dim, opts) {
  var fromList = new Supergroup(from.records, dim, opts);
  var toList = new Supergroup(to.records, dim, opts);
  //var list = makeList(sg.compare(fromList, toList, dim));
  var list = addListMethods(compare(fromList, toList, dim));
  list.dim = (opts && opts.dimName) ? opts.dimName : dim;
  return list;
};

/** Compare two groups by a dimension
  *
  * @param {A} ...
  * @param {B} ...
  * @param {dim} ...
  *
  * @memberof supergroup
  */
var compare = function(A, B, dim) {
  var a = _.chain(A).map(function(d) { return d+''; }).value();
  var b = _.chain(B).map(function(d) { return d+''; }).value();
  var comp = {};
  _.each(A, function(d, i) {
    comp[d+''] = {
      name: d+'',
      'in': 'from',
      from: d,
      fromIdx: i,
      dim: dim
    };
  });
  _.each(B, function(d, i) {
    if ((d+'') in comp) {
      var c = comp[d+''];
      c['in'] = "both";
      c.to = d;
      c.toIdx = i;
    } else {
      comp[d+''] = {
        name: d+'',
        'in': 'to',
        to: d,
        toIdx: i,
        dim: dim
      };
    }
  });
  var list = _.chain(comp).values().sort(function(a,b) {
    return (a.fromIdx - b.fromIdx) || (a.toIdx - b.toIdx);
  }).map(function(d) {
    var val = new Value(d.name);
    _.extend(val, d);
    val.records = [];
    if ('from' in d)
      val.records = val.records.concat(d.from.records);
    if ('to' in d)
      val.records = val.records.concat(d.to.records);
    return val;

  }).value();
  _.chain(list).map(function(d) {
    d.parentList = list; // NOT TESTED, NOT USED, PROBABLY WRONG
    d.records.parentVal = d; // NOT TESTED, NOT USED, PROBABLY WRONG
  }).value();

  return list;
};

/** Concatenate two Values into a new one (??)
  *
  * @param {from} ...
  * @param {to} ...
  *
  * @memberof supergroup
  */
var compareValue = function(from, to) { // any reason to keep this?
  if (from.dim !== to.dim) {
    throw new Error("not sure what you're trying to do");
  }
  var name = from + ' to ' + to;
  var val = new Value(name);
  val.from = from;
  val.to = to;
  val.depth = 0;
  val['in'] = "both";
  val.records = [].concat(from.records,to.records);
  val.records.parentVal = val; // NOT TESTED, NOT USED, PROBABLY WRONG
  val.dim = from.dim;
  return val;
};
//_.extend(StringValue.prototype, Value.prototype);
//_.extend(NumberValue.prototype, Value.prototype);

/** Sometimes a List gets turned into a standard array,
  * sg.g., through slicing or sorting or filtering. 
  * addListMethods turns it back into a List
  *
  * `List` would be a constructor if IE10 supported
  * \_\_proto\_\_, so it pretends to be one instead.
  *
  * @param {Array} Array to be extended
  *
  * @memberof supergroup
  */


var addListMethods = function(arr) {
  throw new Error('obsolete');
  arr = arr || []; // KLUDGE for treelike
  if (arr.isSupergroupList) return arr;
  for(var method in List.prototype) {
    Object.defineProperty(arr, method, {
      value: List.prototype[method]
    });
  }
  return arr;
};
var addSupergroupMethods = addListMethods;


// can't easily subclass Array, so this explicitly puts the List
// methods on an Array that's supposed to be a List
function makeList(arr_arg) {
  var arr = [ ];
  arr.push.apply(arr, arr_arg);
  addListMethods(arr);
  return arr;
}

var hierarchicalTableToTree = function(data, parentPropchildProp) {
  throw new Error("fix this after getting rid of childProp");
  // does not do the right thing if a value has two parents
  // also, does not yet fix depth numbers
  var parents = new Supergroup(data,[parentProp, childProp]); // 2-level grouping with all parent/child pairs
  var children = parents.leafNodes();
  var topParents = _.filter(parents, function(parent) { 
    var adoptiveParent = children.lookup(parent); // is this parent also a child?
    if (adoptiveParent) { // if so, make it the parent
      adoptiveParent.children = addSupergroupMethods([]);
      _.each(parent.children, function(c) { 
        c.parent = adoptiveParent; 
        adoptiveParent.children.push(c)
      }); 
    } else { // if not, this is a top parent
      return parent;
    }
    // if so, make use that child node, move this parent node's children over to it
  });
  return addSupergroupMethods(topParents);
};

// allows grouping by a field that contains an array of values rather than just a single value
if (_.createAggregator) {
  var multiValuedGroupBy = _.createAggregator(function(result, value, keys) {
    _.each(keys, function(key) {
      if (hasOwnProperty.call(result, key)) {
        result[key].push(value);
      } else {
        result[key] = [value];
      }
    });
  });
} else {
  var multiValuedGroupBy = function() { throw new Error("couldn't install multiValuedGroupBy") };
}
// @class State
// @description with a couple exceptions, supergroup objects should be
// immutable. when managing filters, calling code often adds .hidden
// properties to records, sometimes to values. not good.
// States are a way to track selection/highlighting states without mutating
// the underlying object.
class State {
  constructor(sglist) {
    this.list = sglist;
    this.filters = new Map();
  }
  addFilter(type, key, filt, ids) {
  }
  selectByVal(val) {
    assert.equal(val.rootList(), this.list); // assume state only on root lists
    this.selectedVals.push(val);
  }
}

class Filter {
  constructor(type, key, filt, ids) {
    this.type = type;
    this.key = key;
    this.filt = filt;
    this.ids = ids;
  }
}


/*
var g = function *test(n) {for(let i=0; i<n; i++){ yield i}; return; };

let a,b,c;
[a,b,c]=[{a:1},{a:2},{a:3}]
let w = new WeakSet([a,b,c]);
console.log(w);
a = null;
console.log(w.has(a));
console.log(w.has(b));
console.log(w);
debugger;
*/
State.prototype.selectByFilter = function(filt) {
  
  
  this.selectedVals.push(val);
}
State.prototype.selectedRecs = function() {
  return _.chain(this.selectedVals).pluck('records').flatten().value();
}

// @class Value
// @description Supergroup Lists are composed of Values which are
// String or Number objects representing group values.
// Methods described below.
class Value {
  constructor(val) {
    this.val = val;
  }
  toString() {
    return this.val.toString();
  }
  valueOf() {
    return this.val.valueOf()
  }
  //Value.prototype.extendGroupBy = // backward compatibility
  addLevel(dim, opts) {
    opts = opts || {};
    debugger;
    _.each(this.leafNodes() || [this], function(d) {
      opts.parent = d;
      if (!('in' in d)) { // d.in means it's part of a diffList
        d.children = new Supergroup(d.records, dim, opts);
      } else { // allows adding levels to diffLists. haven't used for a long time
        if (d['in'] === "both") {
          d.children = diffList(d.from, d.to, dim, opts);
        } else {
          d.children = new Supergroup(d.records, dim, opts);
          _.each(d.children, function(c) {
            c['in'] = d['in'];
            c[d['in']] = d[d['in']];
          });
        }
      }
      d.children.parentVal = d; // NOT TESTED, NOT USED, PROBABLY WRONG!!!
    });
  };
  leafNodes(level) {
    // until commit 31278a35b91a8f4bd4ddc4376c840fb14d2723f9
    // supported level param, to only go down so many levels
    // not supporting that any more. wasn't using it

    if (!('children' in this)) return;

    return _.chain(this.descendants()).filter(
        function(d){
          return _.isEmpty(d.children);
        }).addSupergroupMethods().value();

    var ret = [this];
    if (typeof level === "undefined") {
      level = Infinity;
    }
    if (level !== 0 && this.children && this.children.length && (!level || this.depth < level)) {
      ret = _.flatten(_.map(this.children, function(c) {
        return c.leafNodes(level);
      }), true);
    }
    //return makeList(ret);
    return addListMethods(ret);
  };
  addRecordsAsChildrenToLeafNodes(truncateEmpty) {
    function fixLeaf(node) {
      node.children = node.records;
      _.each(node.children, function(rec) {
        rec.parent = node;
        rec.depth = node.depth + 1;
        for(var method in Value.prototype) {
          Object.defineProperty(rec, method, {
            value: Value.prototype[method]
          });
        }
      });
    }
    if (typeof truncateEmpty === "undefined")
      truncateEmpty = true;
    if (truncateEmpty) {
      var self = this;
      self.descendants().forEach(function(node) {
        if (self.parent && self.parent.children.length === 1) {
          fixLeaf(node);
        }
      });
    } else {
      _.each(this.leafNodes(), function(node) {
        fixLeaf(node);
      });
    }
    return this;
  };
  dimPath(opts) {
    opts = delimOpts(opts);
    opts.dimName = true;
    return this.namePath(opts);
  };
  namePath(opts) {
    opts = delimOpts(opts);
    var path = this.pedigree(opts);
    if (opts.dimName) path = _.pluck(path, 'dim');
    if (opts.asArray) return path;
    return path.join(opts.delim);
    /*
    var delim = opts.delim || '/';
    return (this.parent ? 
        this.parent.namePath(_.extend({},opts,{notLeaf:true})) : '') +
      ((opts.noRoot && this.depth===0) ? '' : 
        (this + (opts.notLeaf ? delim : ''))
       )
    */
  };
  pedigree(opts) {
    opts = opts || {};
    var path = [];
    if (!opts.notThis) path.push(this);
    var ptr = this;
    while ((ptr = ptr.parent)) {
      path.unshift(ptr);
    }
    if (opts.noRoot) path.shift();
    if (opts.backwards || this.backwards) path.reverse(); //kludgy?
    return path;
    // CHANGING -- HOPE THIS DOESN'T BREAK STUFF (pedigree isn't
    // documented yet)
    if (!opts.asValues) return _.chain(path).invoke('valueOf').value();
    return path;
  };
  path(opts) {
    return this.pedigree(opts);
  }
  descendants(opts) {
    // these two lines fix a treelike bug, hope they don't do harm
    this.children = this.children || [];
    _.addSupergroupMethods(this.children);

    return this.children ? this.children.flattenTree() : undefined;
  };
  lookup(query) {
    if (_.isArray(query)) {
      if (this.valueOf() == query[0]) { // allow string/num comparison to succeed?
        query = query.slice(1);
        if (query.length === 0)
          return this;
      }
    } else if (_.isString(query)) {
      if (this.valueOf() == query) {
        return this;
      }
    } else {
      throw new Error("invalid param: " + query);
    }
    if (!this.children)
      throw new Error("can only call lookup on Values with kids");
    return this.children.lookup(query);
  };
  pct() {
    return this.records.length / this.parentList.records.length;
  };
  previous() {
    if (this.parentList) {
      // could store pos on each value, but not doing that now
      var pos = this.parentList.indexOf(this);
      if (pos > 0) {
        return this.parentList[pos - 1];
      }
    }
  };
  aggregate(func, field) {
    if (_.isFunction(field))
      return func(_.map(this.records, field));
    return func(_.pluck(this.records, field));
  };
  rootList() {
    return this.parentList.rootList();
  };
  /* didn't make this yet, just copied from above
  Value.prototype.descendants(level) {
    var ret = [this];
    if (level !== 0 && this[childProp] && (!level || this.depth < level))
      ret = _.flatten(_.map(this[childProp], function(c) {
        return c.leafNodes(level);
      }), true);
    return makeList(ret);
  };
  */
}

_.mixin({
  //supergroup: supergroup.supergroup, 
  supergroup: ((...args) => new Supergroup(...args)),
  //supergroup: function(d) { console.log('EEK'); debugger; throw new Error("blah");},
  //addSupergroupMethods: supergroup.addSupergroupMethods,
  multiValuedGroupBy: multiValuedGroupBy,
  sgDiffList: diffList,
  sgCompare: compare,
  sgCompareValue: compareValue,
  sgAggregate: aggregate,
  hierarchicalTableToTree: hierarchicalTableToTree,
  stateClass: State,

  // FROM https://gist.github.com/AndreasBriese/1670507
  // Return aritmethic mean of the elements
  // if an iterator function is given, it is applied before
  sum : function(obj, iterator, context) {
    if (!iterator && _.isEmpty(obj)) return 0;
    var result = 0;
    if (!iterator && _.isArray(obj)){
    for(var i=obj.length-1;i>-1;i-=1){
      result += obj[i];
    };
    return result;
    };
    each(obj, function(value, index, list) {
    var computed = iterator ? iterator.call(context, value, index, list) : value;
    result += computed;
    });
    return result;
  },
  mean : function(obj, iterator, context) {
    if (!iterator && _.isEmpty(obj)) return Infinity;
    if (!iterator && _.isArray(obj)) return _.sum(obj)/obj.length;
    if (_.isArray(obj) && !_.isEmpty(obj)) return _.sum(obj, iterator, context)/obj.length;
  },

  // Return median of the elements 
  // if the object element number is odd the median is the 
  // object in the "middle" of a sorted array
  // in case of an even number, the arithmetic mean of the two elements
  // in the middle (in case of characters or strings: obj[n/2-1] ) is returned.
  // if an iterator function is provided, it is applied before
  median : function(obj, iterator, context) {
    if (_.isEmpty(obj)) return Infinity;
    var tmpObj = [];
    if (!iterator && _.isArray(obj)){
      tmpObj = _.clone(obj);
      tmpObj.sort(function(f,s){return f-s;});
    }else{
      _.isArray(obj) && each(obj, function(value, index, list) {
        tmpObj.push(iterator ? iterator.call(context, value, index, list) : value);
        tmpObj.sort();
      });
    };
    return tmpObj.length%2 ? tmpObj[Math.floor(tmpObj.length/2)] : (_.isNumber(tmpObj[tmpObj.length/2-1]) && _.isNumber(tmpObj[tmpObj.length/2])) ? (tmpObj[tmpObj.length/2-1]+tmpObj[tmpObj.length/2]) /2 : tmpObj[tmpObj.length/2-1];
  },
});
export default _;
//export default function() { console.log('hi')};
