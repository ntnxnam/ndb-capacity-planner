#!/usr/bin/env node

/**
 * Test JIRA Connection and Sync
 * This script tests the JIRA connection and syncs releases to local storage
 */

const axios = require('axios');
require('dotenv').config();

const API_BASE = 'http://localhost:3001/api';

async function testJiraConnection() {
  console.log('🧪 Testing JIRA Connection...\n');
  
  try {
    // Test JIRA status
    console.log('1. Checking JIRA status...');
    const statusResponse = await axios.get(`${API_BASE}/jira-releases/status`);
    console.log('   Status:', statusResponse.data);
    
    if (statusResponse.data.success) {
      const { configured, connection_status, total_releases } = statusResponse.data.data;
      console.log(`   ✅ JIRA ${configured ? 'configured' : 'not configured'}`);
      console.log(`   🔗 Connection: ${connection_status}`);
      console.log(`   📊 Total releases in DB: ${total_releases}`);
      
      if (configured && connection_status === 'connected') {
        console.log('\n2. Syncing releases from JIRA...');
        const syncResponse = await axios.post(`${API_BASE}/jira-releases/sync`);
        console.log('   Sync result:', syncResponse.data);
        
        if (syncResponse.data.success) {
          const { synced, updated, errors, total } = syncResponse.data.stats;
          console.log(`   ✅ Sync completed: ${synced} new, ${updated} updated, ${errors} errors (${total} total)`);
          
          console.log('\n3. Fetching synced releases...');
          const releasesResponse = await axios.get(`${API_BASE}/jira-releases`);
          console.log(`   📋 Found ${releasesResponse.data.count} releases in database`);
          
          if (releasesResponse.data.data.length > 0) {
            console.log('\n   Sample releases:');
            releasesResponse.data.data.slice(0, 3).forEach((release, index) => {
              console.log(`   ${index + 1}. ${release.name} (${release.released ? 'Released' : 'Active'})`);
            });
          }
        }
      } else {
        console.log('   ⚠️ JIRA not properly configured or connected');
        console.log('   💡 Check your .env file for JIRA credentials');
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing JIRA connection:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

// Run the test
testJiraConnection().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
