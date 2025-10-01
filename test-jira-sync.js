const axios = require('axios');
require('dotenv').config();

async function testJiraSync() {
  console.log('🧪 Testing JIRA Sync Functionality...\n');
  
  const baseURL = 'http://localhost:3001';
  
  try {
    // Test 1: Check JIRA status
    console.log('1. Checking JIRA status...');
    const statusResponse = await axios.get(`${baseURL}/api/jira-releases/status`);
    console.log('   ✅ JIRA Status:', statusResponse.data.data);
    
    // Test 2: Sync JIRA releases
    console.log('\n2. Syncing JIRA releases...');
    const syncResponse = await axios.post(`${baseURL}/api/jira-releases/sync`);
    console.log('   ✅ Sync Result:', syncResponse.data);
    
    // Test 3: Get synced releases
    console.log('\n3. Fetching synced releases...');
    const releasesResponse = await axios.get(`${baseURL}/api/jira-releases`);
    console.log(`   ✅ Found ${releasesResponse.data.count} synced releases`);
    
    if (releasesResponse.data.data.length > 0) {
      console.log('   Sample synced releases:');
      releasesResponse.data.data.slice(0, 3).forEach((release, index) => {
        console.log(`   ${index + 1}. ${release.name} (${release.released ? 'Released' : 'Unreleased'})`);
        if (release.release_date) {
          console.log(`      Release Date: ${release.release_date}`);
        }
      });
    }
    
    // Test 4: Get active releases only
    console.log('\n4. Fetching active releases only...');
    const activeResponse = await axios.get(`${baseURL}/api/jira-releases/active`);
    console.log(`   ✅ Found ${activeResponse.data.count} active releases`);
    
    if (activeResponse.data.data.length > 0) {
      console.log('   Active releases:');
      activeResponse.data.data.forEach((release, index) => {
        console.log(`   ${index + 1}. ${release.name}`);
      });
    }
    
    console.log('\n✅ JIRA sync functionality is working correctly!');
    console.log('   You can now use the JIRA Releases page in the frontend.');
    
  } catch (error) {
    console.error('❌ Error testing JIRA sync:', error.response?.data || error.message);
  }
}

testJiraSync();
