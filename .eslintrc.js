module.exports = {
  'env': {
    'browser': true,
    'es2021': true,
    'node':true
  },
  'extends': [
    'eslint:recommended',
    'plugin:vue/essential',
    'plugin:@typescript-eslint/recommended'
  ],
  'parserOptions': {
    'ecmaVersion': 12,
    'parser': '@typescript-eslint/parser',
    'sourceType': 'module'
  },
  'plugins': [
    'vue',
    '@typescript-eslint'
  ],
  'rules': {
    'indent':['error', 2],
    'quotes': [1, 'single'],
    'semi':[1, 'never'],
    '@typescript-eslint/no-var-requires':0
  }
}
