

d3.xhr('./fake-patient_data.csv', function(err, resp) {
    if (window.location.search === '?data') {
        d3.select('#output')
            //.text(JSON.stringify(data.response, null, 2))
            .text(resp.response);
    }
    var data = d3.csv.parse(resp.response);
    if (window.location.search === '?json') {
        d3.select('#output')
            .text(JSON.stringify(data).fixJSON('json'));
                //.replace(/{/g,'\n   {')
                //.replace(/]/,'\n]'))
    }
    if (window.location.search === '?sgphysunit') {
        var sg = _.supergroup(data, ['Physician','Unit']);
        d3.select('#output')
            .text(
                [
                "var sg = _.supergroup(data, ['Physician','Unit']);" +
                    ' ==> ' + JSON.stringify(sg),
                'sg[0] ==> ' + JSON.stringify(sg[0]),
                'sg[0].records ==> ' + 
                    JSON.stringify(sg[0].records).fixJSON('json'),
                'sg[0].children ==> ' + JSON.stringify(sg[0].children),
                ].join('\n\n'))
    }
    if (window.location.search === '?sgdims') {
        var sg = _.supergroup(data, ['Physician','Unit']);
        d3.select('#output')
            .text(
                [
                'sg[0].children[0] ==> ' + JSON.stringify(sg[0].children[0]),
                'sg[0].children[0].dim ==> ' + JSON.stringify(sg[0].children[0].dim) +
                '    (and sg[0].children.dim ==> ' + JSON.stringify(sg[0].children.dim) + 
                ' and sg.dim ==> ' + JSON.stringify(sg.dim) + ')',
                'sg[0].children[0].parent ==> ' + JSON.stringify(sg[0].children[0].parent),
                'sg[0].children[0].namePath() ==> ' + JSON.stringify(sg[0].children[0].namePath()),
                'sg[0].children[0].dimPath() ==> ' + JSON.stringify(sg[0].children[0].dimPath()),
                ].join('\n\n'))
    }
    if (window.location.search === '?sghierarchy') {
        var root = _.supergroup(data, ['Physician','Unit']).asRootVal('All Physicians');
        root.addRecordsAsChildrenToLeafNodes();
        var nodes = d3.layout.hierarchy()(root);
        d3.select('#output')
            .text(
                [
                    "var root = _.supergroup(data, ['Physician','Unit']).asRootVal('All Physicians')" +
                        " // that's all we need for a root value",
                    "var nodes = d3.layout.hierarchy()(root) ==> " + JSON.stringify(nodes),
                ].join('\n\n'))
        var color = d3.scale.category20c();
        var treemap = d3.layout.treemap()
            .size([700, 400])
            .padding([18,3,3,3])
            //.value(function(d) { return d3.sum(_.pluck(d.records,'Charge'));; });
            .value(function(d) { return d.Charge })
        var div = d3.select("div#viz");
        var node = div.datum(root).selectAll(".treemapnode")
                .data(treemap.nodes)
            .enter().append("div")
                .attr("class", "treemapnode")
                .call(position)
                .style("background", function(d) { return d.children ? color(d) : null; })
                .text(function(d) { 
                    return d.children ? d : 
                        _.chain(d).pick('Patient', 'Date', 'Charge')
                            .values().value().join(', ');
                })
                //.text(_.identity)

        function position() {
            this.style("left", function(d) { return d.x + "px"; })
                .style("top", function(d) { return d.y + "px"; })
                .style("width", function(d) { return Math.max(0, d.dx - 1) + "px"; })
                .style("height", function(d) { return Math.max(0, d.dy - 1) + "px"; });
        }

    }
    if (window.location.search === '?sgagg') {
        _.each(data, function(rec) {
            rec.Charge = parseFloat(rec.Charge);
            rec.Copay = parseFloat(rec.Copay);
        });
        var sg = _.supergroup(data, ['Physician','Unit']);
        d3.select('#output')
            .text(
                [
                'sg[0].aggregate(d3.sum, "Charge") ==> ' + 
                    JSON.stringify(sg[0].aggregate(d3.sum, "Charge")),
                'sg[0].aggregate(d3.sum, function(rec) { return rec.Charge - rec.Copay; }) ==> ' +
                    JSON.stringify(sg[0].aggregate(d3.sum, function(rec) { return rec.Charge - rec.Copay; })),
                'sg.aggregates(d3.sum, "Charge") ==> ' + 
                    JSON.stringify(sg.aggregates(d3.sum, "Charge")),
                'sg.aggregates(d3.sum, "Charge", "dict") ==> ' + 
                    JSON.stringify(sg.aggregates(d3.sum, "Charge", "dict")),
                ].join('\n\n'))
    }
    if (window.location.search === '?sgnodes') {
        var sg = _.supergroup(data, ['Physician','Unit']);
        d3.select('#output')
            .text(
                [
                'sg.lookup("Feldman") ==> ' + JSON.stringify(sg.lookup("Feldman")),
                'sg.lookup("Feldman").aggregate(d3.sum,"Charge") ==> ' + JSON.stringify(sg.lookup("Feldman").aggregate(d3.sum,"Charge")),
                'sg.lookup(["Gupta", "pediatrics"]).namePath() ==> ' + JSON.stringify(sg.lookup(["Gupta", "pediatrics"]).namePath()),
                'sg.lookupMany(["Baker", "Doom", "Feldman","A Name With No Match"]) ==> ' + JSON.stringify(sg.lookupMany(["Baker","Doom","Feldman","A Name With No Match"])),
                ].join('\n\n'))
    }
    if (window.location.search === '?sgnodesets') {
        var sg = _.supergroup(data, ['Physician','Unit']);
        d3.select('#output')
            .text(
                [
                'sg.leafNodes()  // all bottom level groups\n   ==>' + 
                    JSON.stringify(sg.leafNodes()),
                'sg.flattenTree()  // all groups\n   ==>' + 
                    JSON.stringify(sg.flattenTree()),
                '_(sg.leafNodes()).invoke("namePath") // call .namePath() on all bottom level groups using underscore invoke\n   ==>' + 
                    JSON.stringify(_(sg.leafNodes()).invoke("namePath"))
                ].join('\n\n'))
    }
    if (window.location.search === '?d3nest') {
        var physunitNest = d3.nest()
                        .key(function(d) { return d.Physician; })
                        .key(function(d) { return d.Unit; });
        d3.select('#output')
            .text(
                [
                //"var physunitNest = d3.nest()\n   .key(function(d) { return d.Physician; })\n   .key(function(d) { return d.Unit; });",
                //'physunitNest.entries(data) ==>' + 
                JSON.stringify(physunitNest.entries(data), null, 2).fixJSON('nest'),
                ].join('\n\n'))
    }
    if (window.location.search === '?d3map') {
        var physunitNest = d3.nest()
                        .key(function(d) { return d.Physician; })
                        .key(function(d) { return d.Unit; });
        d3.select('#output')
            .text(
                [
                //'physunitNest.map(data) ==>' + 
                JSON.stringify(physunitNest.map(data),null,2)//.fixJSON('nest'),
                ].join('\n\n'))
    }
    if (window.location.search === '?sgmultval') {
        //var mvg = _.supergroup(data, ['Insurace','Patient']);
        _.each(data, function(d) { d.Insurance = d.Insurance.split(';')})
        var m = _.supergroup(data, ['Insurance','Patient'], {multiValuedGroups: ['Insurance']});
        d3.select('#output')
            .text(
                [
                'sg.lookup("Feldman") ==> ' + JSON.stringify(sg.lookup("Feldman")),
                'sg.lookup("Feldman").aggregate(d3.sum,"Charge") ==> ' + JSON.stringify(sg.lookup("Feldman").aggregate(d3.sum,"Charge")),
                'sg.lookup(["Gupta", "pediatrics"]).namePath() ==> ' + JSON.stringify(sg.lookup(["Gupta", "pediatrics"]).namePath()),
                'sg.lookupMany(["Baker", "Doom", "Feldman","A Name With No Match"]) ==> ' + JSON.stringify(sg.lookupMany(["Baker","Doom","Feldman","A Name With No Match"])),
                ].join('\n\n'))
    }
    Prism.highlightAll();
});
String.prototype.fixJSON = function(which) {
    if (which === 'json')
        return this.replace(/{/g,'\n   {').replace(/]/,'\n]');
    if (which === 'nest')
        return this.replace(/,\n/g,', ').replace(/("key".*, )/g,'$1\n').replace(/,   */g,', ')
    return this;
};
