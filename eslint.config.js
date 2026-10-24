
import { defineConfig } from 'eslint/config'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import reactPlugin from 'eslint-plugin-react'
import hooksPlugin from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default defineConfig([
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': hooksPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...hooksPlugin.configs.flat.recommended.rules,
      'react/react-in-jsx-scope': 'off',
    },
    settings: {
      react: { version: 'detect' },
    },
  },
])
