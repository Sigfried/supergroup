// Karma configuration
// Generated on Mon Dec 16 2013 14:30:54 GMT-0700 (MST)

module.exports = function(config) {
  config.set({
    preprocessors: {
      'supergroup.spec.js': ['webpack']
    },
    webpack: {
       debug: true//,
       //cache: true // webpack configuration
    },
    webpackServer: {
            // webpack-dev-server configuration
            // webpack-dev-middleware configuration
    },
    // the port used by the webpack-dev-server
    // defaults to "config.port" + 1
    webpackPort: 1234,
    plugins: [
       require("karma-webpack"),
       require("karma-chrome-launcher"),
       require("karma-phantomjs-launcher"),
       require("karma-jasmine")
    ],



    // base path, that will be used to resolve files and exclude
    basePath: '',
    //urlRoot: 'base',


    // frameworks to use
    frameworks: ['jasmine'],


    // list of files / patterns to load in the browser
    files: [
        'supergroup.spec.js'
  // TEMPORARY LOCATIONS!!!!
      //'../../underscore-unchained/bower_components/underscore/underscore.js',
      //'../../underscore-unchained/bower_components/1670507/underscoreAddon.js',
      //'../../underscore-unchained/src/underscore-unchained.js',
      //'../../supergroup/supergroup.js',
      //'../node_modules/d3/d3.js',

      //'../bower_components/underscore/underscore.js',
      //'../bower_components/1670507/underscoreAddon.js',
      //'../bower_components/underscore-unchained/src/underscore-unchained.js',
      //'../supergroup.js',
      //'../bower_components/momentjs/moment.js',
      //'../evtData.js',
      //'../lifeflowData.js',
      //'*.js'
      //, {pattern: './hurricane.csv', included: false}
      //, {pattern: './base/hurricane.csv', included: false}
    ],


    // list of files to exclude
    exclude: [
      
    ],


    // test results reporter to use
    // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_DEBUG,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera (has to be installed with `npm install karma-opera-launcher`)
    // - Safari (only Mac; has to be installed with `npm install karma-safari-launcher`)
    // - PhantomJS
    // - IE (only Windows; has to be installed with `npm install karma-ie-launcher`)
    browsers: ['PhantomJS',
            'Chrome' ],


    // If browser does not capture in given timeout [ms], kill it
    captureTimeout: 60000,


    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: false
  });
};
