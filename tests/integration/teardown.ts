import { jest } from '@jest/globals';

export default async function teardown() {
  console.log('Tearing down integration test environment...');
  
  // Cleanup test containers or services
  // Close any persistent connections
  // Clean up temporary data
  
  console.log('Integration test environment cleaned up');
};