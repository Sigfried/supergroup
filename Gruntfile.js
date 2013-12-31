module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    browserify: {
      "./supergroupBundled.js": [ "./supergroup.js" ]
      , options: { 
            transform: ["debowerify", "decomponentify", "deamdify", "deglobalify"],
      }
    },
    watch: {
      files: [ "./supergroup.js","./README.md"],
      tasks: [ "browserify" ]
    },
    groc: {
        javascript: [ "./supergroup.js", "README.md" ],
        options: { "out": "doc/" }
    },
    jshint: {
        all: ["Gruntfile.js", "./supergroup.js", "test/**/*.js"]
        , options: { laxcomma: true }
    }
  });
  grunt.loadNpmTasks("grunt-browserify");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks("grunt-groc");
  grunt.registerTask("default", ["browserify", "jshint", "groc"]);
};
