fswatch -0 doc.md|xargs -t -0 -n 1 -I {} multimarkdown -nosmart {} -o index.html
