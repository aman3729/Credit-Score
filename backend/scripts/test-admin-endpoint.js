import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/v1';

async function testAdminEndpoint() {
  try {
    console.log('🔍 Testing admin endpoint...\n');
    
    // Test the regular endpoint (should exclude config)
    console.log('📊 Testing regular endpoint: /partner-banks');
    const regularResponse = await axios.get(`${API_BASE}/partner-banks`);
    console.log(`✅ Regular endpoint returned: ${regularResponse.data.data?.length || 0} banks`);
    
    // Test the new admin endpoint (should include full config)
    console.log('\n📊 Testing admin endpoint: /partner-banks/admin/with-config');
    const adminResponse = await axios.get(`${API_BASE}/partner-banks/admin/with-config`);
    console.log(`✅ Admin endpoint returned: ${adminResponse.data.data?.length || 0} banks`);
    
    // Show first few banks from admin response
    console.log('\n🏦 First 5 banks from admin endpoint:');
    adminResponse.data.data?.slice(0, 5).forEach((bank, index) => {
      console.log(`${index + 1}. ${bank.code} - ${bank.name}`);
      console.log(`   Engine Config: ${bank.engineConfig ? '✅' : '❌'}`);
      console.log(`   Lending Policy: ${bank.lendingPolicy ? '✅' : '❌'}`);
      console.log(`   Access Controls: ${bank.accessControls ? '✅' : '❌'}`);
      console.log(`   Branding: ${bank.branding ? '✅' : '❌'}`);
      console.log('');
    });
    
    console.log(`\n🎯 Total banks in admin response: ${adminResponse.data.data?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Error testing endpoint:', error.response?.data || error.message);
  }
}

testAdminEndpoint().catch(console.error); 