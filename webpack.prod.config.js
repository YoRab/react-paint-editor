const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

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
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.(css|scss)$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Output Management',
      template: 'public/index.html'
    })
  ],
  output: {
    filename: 'index.js',
    path: path.join(__dirname, 'build'),
    clean: true
  }
}