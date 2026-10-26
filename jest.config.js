module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testMatch: ['<rootDir>/tests/**/*.test.{ts,tsx}'],
  clearMocks: true,
  // Load-robustness (defect class found in Docker verification, DEC-020, and
  // again in Phase 5): async RNTL flows exceed Jest's 5s default when the
  // whole suite runs on a CPU-constrained container. Bounded at 20s — hangs
  // are still caught.
  testTimeout: 20000,
  // Same class: parallel workers contend for CPU and individual tests crawl.
  // Halving the workers makes each suite faster in isolation from the rest.
  maxWorkers: '50%',
};
