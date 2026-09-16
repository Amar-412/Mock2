module.exports = {
  testEnvironment: 'node',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 30000,
  clearMocks: true,
};
