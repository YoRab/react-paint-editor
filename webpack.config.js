const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = {
  entry: path.join(__dirname, 'examples', 'index.tsx'),
  devtool: 'inline-source-map',
  mode: 'development',
  resolve: {
    modules: [
      path.resolve(__dirname, './src/'),
      path.resolve(__dirname, './examples/'),
      'node_modules'
    ],
    extensions: ['.tsx', '.ts', '.js', '.json']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          { loader: 'babel-loader' }
        ],

        exclude: /node_modules/
      },
      {
        test: /\.(css|scss)$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          'css-loader'
        ]
      }
    ]
  },

  plugins: [
    new HtmlWebpackPlugin({
      title: 'Output Management',
      template: 'public/index.html'
    }),
    new MiniCssExtractPlugin({ filename: 'styles.css' })
  ],
  output: {
    filename: 'index.js',
    path: path.join(__dirname, 'dist'),
    clean: true
  }
}
