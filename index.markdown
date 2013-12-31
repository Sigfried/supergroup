---
layout: page
title: "supergroup"
date: 2013-12-26 15:10
comments: true
sharing: true
footer: true
---


enlightened-data
================

Author: [Sigfried Gold](http://sigfried.org)  
License: [MIT](http://sigfried.mit-license.org/)  

``` javascript
var gradeBook = [
   {firstName: 'Sigfried', lastName: 'Gold', class: 'Remedial Programming', grade: 'C+', num: 2.2},
   {firstName: 'Sigfried', lastName: 'Gold', class: 'Literary Posturing', grade: 'B', num: 3},
   {firstName: 'Sigfried', lastName: 'Gold', class: 'Documenting with Pretty Colors', grade: 'B-', num: 2.7},
   {firstName: 'Someone', lastName: 'Else', class: 'Remedial Programming', grade: 'A'}];

var gradesByLastName = enlightenedData.group(gradeBook, 'lastName')

var gradesByName = enlightenedData.group(gradeBook,  
        function(d) { return d.lastName + ', ' + d.firstName },  
        {dimName: 'fullName'})

var sigfried = gradesByName.lookup('Gold, Sigfried');
sigfried.records.length; // 3
var sigfriedGPA = sigfried.records.reduce(function(result,rec) { return result+rec.num }, 0) / sigfried.records.length;
(it does much much more, will explain below)
```
