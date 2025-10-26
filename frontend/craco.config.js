const webpack = require('webpack');

module.exports = {
  webpack: {
    plugins: {
      add: [
        // This plugin makes the Buffer module available as a global variable
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
        }),
      ]
    },
    configure: (webpackConfig) => {
      // Add fallbacks for node core modules
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback, // preserve existing fallbacks
        "buffer": require.resolve("buffer/"),
        "stream": require.resolve("stream-browserify"),
        // If you run into other "Module not found" errors, you can add them here
        // "crypto": require.resolve("crypto-browserify"),
        // "http": require.resolve("stream-http"),
        // "https": require.resolve("https-browserify"),
        // "os": require.resolve("os-browserify/browser"),
        // "url": require.resolve("url/")
      };
      
      return webpackConfig;
    },
  },
};