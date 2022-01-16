const path = require('path')

module.exports = {
  entry: path.join(__dirname, 'src', 'components', 'App.tsx'),
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
      },
      {
        test: /\.(jpg|jpeg|png|gif|mp3|svg)$/,
        loader: 'file-loader'
      }
    ]
  },
  output: {
    filename: 'index.js',
    path: path.join(__dirname, 'dist'),
    clean: true
  }
}
