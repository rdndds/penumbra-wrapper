import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'src-tauri/target']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@tauri-apps/api/core',
              message: 'Use the API layer in src/services/api instead of direct invoke.',
            },
            {
              name: '@tauri-apps/plugin-dialog',
              message: 'Use FileDialogService in src/services/dialogs instead of direct dialog calls.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/services/api/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['src/services/dialogs/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
])
