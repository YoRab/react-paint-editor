module.exports = {
  settings: {
    'import/extensions': ['.js', '.ts'],
    'import/resolver': {
      typescript: {},
      node: {
        extensions: ['.js', '.ts']
      }
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts']
    }
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: './'
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    // 'plugin:@typescript-eslint/recommended',
    // 'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier'
  ],
  rules: {
    'no-unsafe-assignment': 'off'
  }
}
