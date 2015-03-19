fswatch -0 doc.md|xargs -t -0 -n 1 -I {} multimarkdown {} -o index.html
