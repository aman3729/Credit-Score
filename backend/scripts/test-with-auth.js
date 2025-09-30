import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/v1';

// Test with a simple GET request to see if the server is responding
async function testEndpoint() {
  try {
    console.log('🔍 Testing admin endpoint with authentication...\n');
    
    // First, let's try to get the regular endpoint to see if it works
    console.log('📊 Testing regular endpoint: /partner-banks');
    try {
      const regularResponse = await axios.get(`${API_BASE}/partner-banks`);
      console.log(`✅ Regular endpoint returned: ${regularResponse.data.data?.length || 0} banks`);
    } catch (error) {
      console.log(`❌ Regular endpoint failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }
    
    // Now test the admin endpoint
    console.log('\n📊 Testing admin endpoint: /partner-banks/admin/with-config');
    try {
      const adminResponse = await axios.get(`${API_BASE}/partner-banks/admin/with-config`);
      console.log(`✅ Admin endpoint returned: ${adminResponse.data.data?.length || 0} banks`);
      
      if (adminResponse.data.data?.length > 0) {
        console.log('\n🏦 First 3 banks from admin response:');
        adminResponse.data.data.slice(0, 3).forEach((bank, index) => {
          console.log(`${index + 1}. ${bank.code} - ${bank.name}`);
          console.log(`   CreatedBy: ${bank.createdBy}`);
          console.log(`   Status: ${bank.status}`);
          console.log('');
        });
      }
    } catch (error) {
      console.log(`❌ Admin endpoint failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      
      if (error.response?.status === 401) {
        console.log('🔐 Authentication required - this is expected without proper auth');
      } else if (error.response?.status === 403) {
        console.log('🚫 Authorization failed - user might not have admin role');
      }
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

testEndpoint().catch(console.error); 