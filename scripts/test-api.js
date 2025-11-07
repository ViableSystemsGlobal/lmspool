#!/usr/bin/env node

/**
 * Quick API Test Script
 * Tests basic LMS functionality
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3004'
const EMAIL = process.env.TEST_EMAIL || 'admin@example.com'

let cookies = ''

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(cookies ? { Cookie: cookies } : {}),
    },
  })

  // Extract cookies from response
  const setCookie = response.headers.get('set-cookie')
  if (setCookie) {
    cookies = setCookie.split(';')[0]
  }

  const data = await response.json()
  return { status: response.status, data }
}

async function test() {
  console.log('🧪 Starting API Tests...\n')

  try {
    // Test 1: Health Check
    console.log('1️⃣  Testing Health Check...')
    const health = await request('/api/health')
    console.log('   ✅ Health:', health.data)
    console.log()

    // Test 2: Request OTP
    console.log('2️⃣  Requesting OTP...')
    const otpRequest = await request('/api/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ email: EMAIL }),
    })
    console.log('   ✅ OTP Requested:', otpRequest.data)
    console.log('   📧 Check email for code or database auth_otps table')
    console.log()

    // For automated testing, you'd need to read from DB
    // For now, prompt user
    console.log('   ⏸️  Manual step: Enter OTP code from email')
    console.log('   💡 Or check database: SELECT code FROM auth_otps WHERE email = ? ORDER BY created_at DESC LIMIT 1')
    console.log()

    // Test 3: Get Current User (should fail without auth)
    console.log('3️⃣  Testing Auth Guard...')
    const meUnauth = await request('/api/auth/me')
    if (meUnauth.status === 401) {
      console.log('   ✅ Auth guard working (401 expected)')
    } else {
      console.log('   ⚠️  Unexpected response:', meUnauth)
    }
    console.log()

    console.log('✅ Basic tests complete!')
    console.log()
    console.log('📝 To test authenticated endpoints:')
    console.log('   1. Get OTP code from email or database')
    console.log('   2. Run: curl -X POST http://localhost:3004/api/auth/otp/verify \\')
    console.log('      -H "Content-Type: application/json" \\')
    console.log('      -d \'{"email":"' + EMAIL + '","code":"YOUR_CODE"}\' \\')
    console.log('      -c cookies.txt')
    console.log('   3. Then use cookies.txt for authenticated requests')
    console.log()

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Run tests
test().catch(console.error)

