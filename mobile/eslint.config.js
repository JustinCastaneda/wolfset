// Flat config (ESLint 9). expo's config carries the RN/JSX/hooks rules;
// eslint-config-prettier last so formatting is Prettier's job alone.
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  ...expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*', '.expo/*', 'expo-env.d.ts'],
  },
];
