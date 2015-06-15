"use strict";

function test(data) {
    var n = d3.easynest();
    n.nestFields('Physician','Unit');
    var m = n.map(data, d3.map);
    console.log(m);
}

