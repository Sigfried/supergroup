// underscore addon with sum, mean, median and nrange function
// see details below

_.mixin({
  
  // Return sum of the elements
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
  
  // Return aritmethic mean of the elements
  // if an iterator function is given, it is applied before
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
  
  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  // replacement of old _.range() faster + incl. convenience operations: 
  //    _.nrange(start, stop) will automatically set step to +1/-1 
  //    _.nrange(+/- stop) will automatically start = 0 and set step to +1/-1
  nrange : function(start, stop, step) {
    if (arguments.length <= 1) {
      if (start === 0)
        return [];
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1*(start < stop) || -1;
    
    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    do {
      range[idx] = start;
      start += step;
    } while((idx += 1) < len);
    
    return range;
  }

})