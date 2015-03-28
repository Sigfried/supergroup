"use strict;"

function render() {
    d3.selectAll('pre.rendercode>code')
        .each(function(d,i) {
            var pre = d3.select(this.parentElement);
            if (pre.attr('height'))
                pre.style('height',pre.attr('height'));
            var codenode = d3.select(this);
            var code = codenode.html();
            if (pre.attr('id')) {
                eval(code + '\n//@ sourceURL='+pre.attr('id')+'.js');
            }
            //code = code.replace(/^\s+/mg, '');
            var out = [];
            var cnt = 0;
            while (code.length) {
                if (!code.match(/^((.|\n)*?)(\s*\/\/\s*([^#]*))(#(.*))((.|\n)*$)/))
                    code = code.trim();
                if (!code.length) break;
                if (!code.match(/^((.|\n)*?)(\s*\/\/\s*([^#]*))(#(.*))((.|\n)*$)/))
                    throw "yuch";
                var codechunk = RegExp.$1;
                var comment = RegExp.$3;
                var command = RegExp.$6.trim();
                code = RegExp.$7;
                var sectionOut = '';
                //out.push(codechunk);
                if (_.contains(command,'run')) {
                    //code = codenode.text();
                    //eval(codechunk); // already evaled above
                    command = command.replace(/run/,'').trim();
                } 
                if (_.contains(command,'showhtml')) {
                    result = codenode.html();
                    command = command.replace(/showhtml/,'').trim();
                    if (command.length) {
                        sectionOut = eval(command);
                    }
                }
                if (_.contains(command,'show')) {
                    sectionOut = codechunk + comment;
                    command = command.replace(/show/,'').trim();
                }
                if (_.contains(command,'renderhtml')) {
                    throw new Error('not sure what to do');
                    var result = eval(codechunk);
                    command = command.replace(/renderhtml/,'').trim();
                    if (command.length) {
                        result = eval(command);
                    }
                }
                if (_.contains(command,'render')) {
                    var result = eval(codechunk);
                    command = command.replace(/render/,'').trim();
                    if (_.contains(command,'dontstringify')) {
                        command = command.replace(/dontstringify/,'').trim();
                    } else {
                        if (command.match(/indent(\d+)/)) {
                            result = JSON.stringify(result, null, parseInt(RegExp.$1));
                            command = command.replace(/indent(\d+)/,'').trim();
                        } else {
                            result = JSON.stringify(result);
                        }
                    }
                    if (command.length) {
                        result = eval(command);
                    }
                    if (sectionOut.length)
                        sectionOut += '==> ';
                    sectionOut += result;
                }
                out.push(sectionOut);
                if (cnt++ > 10) break;
            }
            //console.log(out.join('\n'));
            codenode.text(out.join(''));
            Prism.highlightElement(codenode.node());
        });
}
function tabulate(container, data, columns) { // from http://jsfiddle.net/7WQjr/
    var table = container.append("table"),
        thead = table.append("thead"),
        tbody = table.append("tbody");

    // append the header row
    thead.append("tr")
        .selectAll("th")
        .data(columns)
        .enter()
        .append("th")
            .text(function(column) { return column; });

    // create a row for each object in the data
    var rows = tbody.selectAll("tr")
        .data(data)
        .enter()
        .append("tr");

    // create a cell in each row for each column
    var cells = rows.selectAll("td")
        .data(function(row) {
            return columns.map(function(column) {
                return {column: column, value: row[column]};
            });
        })
        .enter()
        .append("td")
            .text(function(d) { return d.value; });
    
    return table;
}
/*
// create some people
var people = [
    {name: "Jill", age: 30},
    {name: "Bob", age: 32},
    {name: "George", age: 29},
    {name: "Sally", age: 31}
];

// render the table
var peopleTable = tabulate(people, ["name", "age"]);

// uppercase the column headers
peopleTable.selectAll("thead th")
    .text(function(column) {
        return column.charAt(0).toUpperCase() + column.substr(1);
    });
    
// sort by age
peopleTable.selectAll("tbody tr")
    .sort(function(a, b) {
        return d3.descending(a.age, b.age);
    });
*/

/*
<script>
    var csv, data;
    function putcode(div, run) {
        var code = div.text();
        if (div.attr('height'))
            div.style('height',div.attr('height'));
        var opts = [];
        if (div.attr('opts'))
            opts = div.attr('opts').split(/,/);
        div.html('');
        if (run) {
            var out = eval(code);
            if (!_.contains(opts, 'dontstringify'))
                out = JSON.stringify(out);
            var node = div.append('pre').attr('class','language-javascript').text(out);
        } else {
            var node = div.append('p').attr('class','language-javascript').text(code);
        }
        Prism.highlightElement(node.node());
    }
</script>
*/
