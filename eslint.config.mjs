// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
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
  // 移除 recommendedTypeChecked 以提升效能
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      // 使用現代 JavaScript 版本以提升效能
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        // 移除 projectService 以提升效能
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'semi': 'off',
      // 關閉一些耗資源的規則
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off'
    },
  },
);