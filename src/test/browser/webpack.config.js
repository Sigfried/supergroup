var webpack = require('webpack');

module.exports = {
  entry: [
    //'babel-polyfill',
    'mocha!./index.js',
  ],
  output: {
      path: __dirname,
      filename: 'bundle.js'
  },
  module: {
    loaders: [
      { 
        test: /\.(jsx?|es6)$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        query: {
          presets: ['es2015','react', 'stage-0'],
          plugins: [
            ["babel-plugin-transform-builtin-extend", {
              globals: ["Array"],
            }]
          ]
        }
      },
/*
      { 
        test: /js/,
        loader: 'mocha-loader',
        exclude: /node_modules/,
      },
*/
    ]
  },
};
