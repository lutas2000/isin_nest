// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.nx/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/*.bundle.js',
      '**/webpack.config.js',
      '**/vite.config.ts',
      '**/jest.config.ts',
      '**/tsconfig*.json'
    ],
  },
  eslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
  {
    rules: {
      'semi': 'off',
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'prefer-const': 'warn',
      'no-var': 'error'
    },
  },
];
