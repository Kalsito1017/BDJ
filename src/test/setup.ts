/**
 * Jest setup (src/test — shared test setup per DEC-005).
 *
 * React Native Testing Library v14: no extra matcher registration is required
 * for the assertions used in this repository's tests. Add shared mocks or
 * global test config here as the test suite grows.
 */

// Official AsyncStorage Jest mock (the native module is not present in tests):
// https://react-native-async-storage.github.io/async-storage/docs/advanced/jest
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

export {};
