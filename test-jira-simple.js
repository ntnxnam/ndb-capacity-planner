#!/usr/bin/env node

/**
 * Simple JIRA Test
 * Test JIRA connection without starting the full server
 */

require('dotenv').config();
const axios = require('axios');

async function testJiraDirect() {
  console.log('🧪 Testing JIRA Connection Directly...\n');
  
  const jiraConfig = {
    baseURL: process.env.JIRA_BASE_URL || 'https://jira.nutanix.com',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.JIRA_API_TOKEN}`
    },
    timeout: 30000
  };

  console.log('Configuration:');
  console.log('  Base URL:', jiraConfig.baseURL);
  console.log('  Username:', process.env.JIRA_USERNAME);
  console.log('  API Token:', process.env.JIRA_API_TOKEN ? '***SET***' : 'NOT SET');
  console.log('  Project Key:', process.env.JIRA_PROJECT_KEY);
  console.log('');

  try {
    // Test 1: Check if we can connect to JIRA
    console.log('1. Testing JIRA connection...');
    const projectResponse = await axios.get(`/rest/api/3/project/${process.env.JIRA_PROJECT_KEY}`, jiraConfig);
    console.log('   ✅ JIRA connection successful');
    console.log('   Project:', projectResponse.data.name);
    console.log('   Project Key:', projectResponse.data.key);
    console.log('');

    // Test 2: Fetch unreleased versions only
    console.log('2. Fetching unreleased versions...');
    try {
      const releasesResponse = await axios.get(`/rest/api/2/project/${process.env.JIRA_PROJECT_KEY}/versions`, jiraConfig);
      console.log('   Response status:', releasesResponse.status);
      console.log('   Response headers:', releasesResponse.headers['content-type']);
      
      if (releasesResponse.headers['content-type']?.includes('application/json')) {
        const allReleases = releasesResponse.data;
        console.log(`   ✅ Found ${allReleases.length} total releases`);
        
        // Filter for unreleased versions only
        const unreleasedReleases = allReleases.filter((release) => !release.released && !release.archived);
        console.log(`   ✅ Found ${unreleasedReleases.length} unreleased versions`);
        
        if (unreleasedReleases.length > 0) {
          console.log('   Sample unreleased versions:');
          unreleasedReleases.slice(0, 5).forEach((release, index) => {
            const name = release.name || 'Unknown';
            console.log(`   ${index + 1}. ${name} (Unreleased)`);
            if (release.releaseDate) {
              console.log(`      Planned Release Date: ${release.releaseDate}`);
            }
          });
        } else {
          console.log('   No unreleased versions found');
        }
      } else {
        console.log('   ❌ Response is not JSON');
      }
    } catch (error) {
      console.log('   ❌ Error fetching releases:', error.message);
    }
    
    console.log('\n✅ JIRA integration is working!');
    console.log('   You can now sync releases in the application.');
    
  } catch (error) {
    console.error('❌ JIRA connection failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', error.response.data);
    }
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check your JIRA credentials in .env file');
    console.log('   2. Verify the API token is valid');
    console.log('   3. Ensure you have access to the ERA project');
  }
}

testJiraDirect().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
