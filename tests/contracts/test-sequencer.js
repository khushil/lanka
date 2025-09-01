/**
 * Custom Test Sequencer for Contract Tests
 * Ensures tests run in optimal order for contract validation
 */

const DefaultSequencer = require('@jest/test-sequencer').default;

class ContractTestSequencer extends DefaultSequencer {
  sort(tests) {
    // Define test priority order
    const testPriority = {
      'schema-validation': 1,
      'query-complexity': 2,
      'openapi-validation': 3,
      'connection-contracts': 4,
      'schema-evolution': 5,
      'contract-testing-pipeline': 6
    };

    return tests.sort((testA, testB) => {
      // Extract test type from path
      const getTestType = (testPath) => {
        const filename = testPath.split('/').pop();
        for (const [type, priority] of Object.entries(testPriority)) {
          if (filename.includes(type)) {
            return priority;
          }
        }
        return 999; // Unknown tests run last
      };

      const priorityA = getTestType(testA.path);
      const priorityB = getTestType(testB.path);

      // Sort by priority first
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Then by test size (smaller tests first)
      if (testA.duration !== testB.duration) {
        return testA.duration - testB.duration;
      }

      // Finally alphabetically
      return testA.path.localeCompare(testB.path);
    });
  }
}

module.exports = ContractTestSequencer;