const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';
const dbPath = path.join(__dirname, 'data/db.json');

async function runTests() {
  console.log('🧪 Starting programmatic validation of MERN Authentication API...');
  
  // Test 1: Health Check
  try {
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Test 1 Passed: Health Check status is:', health.data.status);
  } catch (err) {
    console.error('❌ Test 1 Failed: API Health check failed:', err.message);
    process.exit(1);
  }

  // Test 2: Local Signup & Registration
  const testEmail = `validator-${Date.now()}@test.com`;
  const testPassword = 'secure_validator_pass_123';
  let tempEmail = '';

  try {
    const signup = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'System Validator',
      email: testEmail,
      password: testPassword
    });

    if (signup.data.success && signup.data.needsVerification) {
      console.log('✅ Test 2 Passed: Signup completed with verification pending for:', signup.data.email);
      tempEmail = signup.data.email;
    } else {
      throw new Error('Signup response did not return needsVerification state.');
    }
  } catch (err) {
    console.error('❌ Test 2 Failed: Local registration request failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // Test 3: OTP Lookup & Matching from local db.json
  let activeOtp = '';
  try {
    const dbContent = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const userObj = dbContent.users.find(u => u.email === tempEmail);
    if (userObj && userObj.otpCode) {
      activeOtp = userObj.otpCode;
      console.log('✅ Test 3 Passed: OTP code successfully retrieved from local database file:', activeOtp);
    } else {
      throw new Error('User record or OTP code was not written to local JSON database.');
    }
  } catch (err) {
    console.error('❌ Test 3 Failed: Database read validation failed:', err.message);
    process.exit(1);
  }

  // Test 4: OTP Verification & JWT Sign Session
  let jwtToken = '';
  try {
    const verify = await axios.post(`${BASE_URL}/auth/verify-otp`, {
      email: tempEmail,
      otpCode: activeOtp
    });

    if (verify.data.success && verify.data.token) {
      jwtToken = verify.data.token;
      console.log('✅ Test 4 Passed: OTP matched successfully! Account activated and JWT issued:', jwtToken.substring(0, 20) + '...');
    } else {
      throw new Error('Verification failed to return access token.');
    }
  } catch (err) {
    console.error('❌ Test 4 Failed: OTP Verification endpoint failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // Test 5: Verify incorrect password blocks login
  try {
    await axios.post(`${BASE_URL}/auth/login`, {
      email: tempEmail,
      password: 'wrong_password_xyz'
    });
    console.error('❌ Test 5 Failed: Login endpoint allowed sign-in with an incorrect password.');
    process.exit(1);
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('✅ Test 5 Passed: Secure password block active. Incorrect credentials correctly rejected.');
    } else {
      console.error('❌ Test 5 Failed: Unexpected response status on bad login:', err.message);
      process.exit(1);
    }
  }

  // Test 6: Sign in with verified credentials
  try {
    const login = await axios.post(`${BASE_URL}/auth/login`, {
      email: tempEmail,
      password: testPassword
    });

    if (login.data.success && login.data.token) {
      console.log('✅ Test 6 Passed: Login successful with active verified credentials! Session fully unlocked.');
    } else {
      throw new Error('Login failed to yield session response.');
    }
  } catch (err) {
    console.error('❌ Test 6 Failed: Login with verified credentials failed:', err.response?.data || err.message);
    process.exit(1);
  }

  console.log('\n🌟 SUCCESS: All MERN authentication and database lifecycle validation tests passed successfully!');
}

runTests();
