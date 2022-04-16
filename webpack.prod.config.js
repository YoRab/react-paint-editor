const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = {
  entry: path.join(__dirname, 'examples', 'index.tsx'),
  mode: 'production',
  resolve: {
    modules: [path.resolve(__dirname, './src/'), 'node_modules'],
    extensions: ['.tsx', '.ts', '.js', '.json']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          { loader: 'babel-loader' },
          {
            loader: '@linaria/webpack-loader',
            options: {
              sourceMap: process.env.NODE_ENV !== 'production'
            }
          }
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
    path: path.join(__dirname, 'build'),
    clean: true
  }
}
