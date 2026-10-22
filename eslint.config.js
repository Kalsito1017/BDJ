// ESLint flat config for the BDZ train companion app.
// Base: eslint-config-expo (Expo SDK 58 line). Prettier conflicts disabled via
// eslint-config-prettier; formatting is Prettier's job (npm run format).
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'android/**',
      'ios/**',
      'coverage/**',
      'dist/**',
    ],
  },
  {
    extends: [require('eslint-config-prettier')],
  },
]);
