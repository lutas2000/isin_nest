const { composePlugins, withNx } = require('@nx/webpack');
const { VueLoaderPlugin } = require('vue-loader');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = composePlugins(withNx(), (config) => {
  // Vue loader
  config.module.rules.push({
    test: /\.vue$/,
    loader: 'vue-loader'
  });

  // CSS loader
  config.module.rules.push({
    test: /\.css$/,
    use: ['vue-style-loader', 'css-loader']
  });

  // TypeScript loader
  config.module.rules.push({
    test: /\.ts$/,
    loader: 'ts-loader',
    options: {
      appendTsSuffixTo: [/\.vue$/],
      transpileOnly: true
    }
  });

  // HTML plugin
  config.plugins.push(new HtmlWebpackPlugin({
    template: path.resolve(__dirname, 'index.html'),
    filename: 'index.html'
  }));

  config.plugins.push(new VueLoaderPlugin());

  config.resolve.extensions = ['.ts', '.js', '.vue', '.json'];

  return config;
});
