/** Integration and end-to-end tests: real HTTP against an in-memory MongoDB. */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.e2e-spec.ts'],
  testTimeout: 60000,
  maxWorkers: 1,
};
