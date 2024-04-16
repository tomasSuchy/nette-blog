const path = require('path');
const ROOT_PATH = __dirname;

module.exports = {
  entry: './www/js/index.js',
  mode: (process.env.NODE_ENV === 'production') ? 'production' : 'development',
  resolve: {
    extensions: ['*', '.js', '.jsx']
  },
  devServer: {
    publicPath: '/assets/',
  },
  resolve: {
    extensions: [ '.js', '.css' ],
    alias: {
      '@': path.resolve(__dirname, '../www'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(sa|sc|c)ss$/,
        sideEffects: true,
        use: [
          {
            loader: 'thread-loader',
            options: {
              workerParallelJobs: 2,
            }
          },
          {
            loader: 'cache-loader',
            options: {
              cacheDirectory: 'build/.cache/css-loader',
              cacheIdentifier: 'cache-loader',
            },
          },
          'css-loader',
          'postcss-loader',
          {
            loader: 'sass-loader',
          }
        ]
      },
    ]
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public/build'),
    clean: true,
  },
  watch: true,
};