var _ = require('./dist/supergroup.js');
var arr = _.unchain(['a','bb','ccc']);
console.log(arr.pluck('length').last().range())

