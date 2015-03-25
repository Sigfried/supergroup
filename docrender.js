"use strict;"

function render() {
    d3.selectAll('div.rendercode')
        .each(function(d,i) {
            var container = d3.select(this);
            if (container.attr('height'))
                container.style('height',container.attr('height'));
            var code = container.text();
            container.html('');
            var sections = code.trim().split(/\n\s*;\s*\n/gm);
            //container.remove();
            //container.text('/*' + code + '*/');
            _.each(sections, function(section) {
                console.log(section);
                var codechunk = section.replace(/(.*?)[/\s]*#\s*(.*)$/,"$1");
                var command = RegExp.$2;
                if (_.contains(command,'run')) {
                    eval(codechunk);
                    command = command.replace(/run/,'').trim();
                } 
                if (_.contains(command,'show')) {
                    var chunk = container.append('pre')
                        .attr('class','language-javascript')
                        .text(codechunk);
                    Prism.highlightElement(chunk.node());
                    command = command.replace(/show/,'').trim();
                }
                if (_.contains(command,'renderhtml')) {
                    var result = eval(codechunk);
                    command = command.replace(/renderhtml/,'').trim();
                    if (command.length) {
                        result = eval(command);
                    }
                    var chunk = container.append('')
                        .attr('class','language-javascript')
                        .text(result);
                    Prism.highlightElement(chunk.node());
                }
                if (_.contains(command,'render')) {
                    var result = eval(codechunk);
                    command = command.replace(/render/,'').trim();
                    if (_.contains(command,'dontstringify')) {
                        result = result;
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
                    var chunk = container.append('pre')
                        .attr('class','language-javascript')
                        .text(result);
                    Prism.highlightElement(chunk.node());
                }
            });
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
