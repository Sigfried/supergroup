var path = require('path');
var webpack = require('webpack');

module.exports = {
  entry: [
    //'babel-polyfill',
    './src/supergroup',
    //'webpack-dev-server/client?http://localhost:8283'
  ],
  output: {
      //publicPath: './dist',
      path: './dist',
      filename: 'supergroup.js'
  },
  target: "node",
  debug: true,
  watch: true,
  devtool: 'source-map',
  /*
  resolve: {
    //modulesDirectories: ['node_modules'],
    extensions: ['.js', '.jsx']
  },
  */
  module: {
    loaders: [
      {
        test: /\.json$/,
        loader: 'json-loader'
      },
      { 
        test: /\.js$/,
        include: path.join(__dirname, 'src'),
        loader: 'babel-loader',
        exclude: /node_modules/,
        query: {
          //presets: ['es2015','stage-0']
          presets: ['es2015']
        }
      },
      { 
        test: /\.jsx?$/,
        include: path.join(__dirname, 'src'),
        loader: 'babel-loader',
        query: {
          //presets: ['es2015','stage-0']
          presets: ['es2015']
        }
      },
      /*
      { 
        test: /\.less$/,
        loader: "style!css!autoprefixer!less"
      },
      */
    ]
  },
  /*
  devServer: {
    contentBase: "./src"
  }
  */
};

/*
module.exports = {
    entry: './supergroup.js',
    output: {
        path: './',
        filename: 'bundle.js',
    },
    resolve: {
        modulesDirectories: ['node_modules'],
    },
    //watch: true,
    colors: true,
    progress: true,
    cache: true,
    debug: true
};
module: {
  loaders: [
    {
      loader: "babel-loader",

      // Skip any files outside of your project's `src` directory
      include: [
        path.resolve(__dirname, "src"),
      ],

      // Only run `.js` and `.jsx` files through Babel
      test: /\.jsx?$/,

      // Options to configure babel with
      query: {
        plugins: ['transform-runtime'],
        presets: ['es2015' /*, 'stage-0', 'react' * /],
      }
    },
  ],
  entry: [
    // Set up an ES6-ish environment
    'babel-polyfill',

    // Add your application's scripts below
    './src/supergroup',
  ],

}
*/
