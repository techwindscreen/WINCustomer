// Test script for permanent magic links functionality
// Run with: node scripts/test-permanent-magic-link.js

async function testPermanentMagicLinks() {
    console.log('🧪 Testing Permanent Magic Links...\n');

    const testData = {
        quoteId: 'WIN-TEST-' + Date.now(),
        email: 'test@windscreencompare.com'
    };

    console.log('Test Data:', testData);

    // Test 1: Generate permanent magic link
    console.log('\n1️⃣ Testing permanent magic link generation...');
    try {
        const response = await fetch('http://localhost:3000/api/generate-permanent-magic-link', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData),
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Permanent magic link generated successfully!');
            console.log('Link:', data.permanentMagicLink);
            
            // Extract token from link for next test
            const url = new URL(data.permanentMagicLink);
            const token = url.searchParams.get('token');
            
            if (token) {
                // Test 2: Verify the token
                console.log('\n2️⃣ Testing token verification...');
                const verifyResponse = await fetch(`http://localhost:3000/api/verify-permanent-magic-link?token=${encodeURIComponent(token)}`);
                const verifyData = await verifyResponse.json();
                
                if (verifyResponse.ok) {
                    console.log('✅ Token verified successfully!');
                    console.log('Quote data:', verifyData.quoteData);
                } else {
                    console.log('❌ Token verification failed:', verifyData.message);
                }
            }
            
        } else {
            console.log('❌ Failed to generate permanent magic link:', data.message);
        }
    } catch (error) {
        console.log('❌ Error testing permanent magic link:', error.message);
        console.log('💡 Make sure the development server is running with: npm run dev');
    }

    // Test 3: Quick access link
    console.log('\n3️⃣ Testing quick access link...');
    const quickAccessUrl = `http://localhost:3000/api/get-permanent-link?quoteId=${testData.quoteId}&email=${testData.email}&format=json`;
    console.log('Quick access URL:', quickAccessUrl);
    console.log('💡 You can test this in your browser when the dev server is running');

    console.log('\n🎉 Test completed!');
    console.log('\n📋 To fully test the system:');
    console.log('1. Start the dev server: npm run dev');
    console.log('2. Complete a quote on the website');
    console.log('3. Check console logs for the generated permanent magic link');
    console.log('4. Visit the link to test the quote access page');
    console.log('5. Test the payment flow');
}

// Check if we're running in Node.js environment
if (typeof window === 'undefined') {
    // For Node.js, we need to use node-fetch or similar
    // But for simplicity, just show what would be tested
    console.log('🧪 Permanent Magic Links Test Plan\n');
    console.log('This script shows what would be tested.');
    console.log('To actually run tests, start the dev server and use browser or Postman.\n');
    
    console.log('Test URLs to try:');
    console.log('1. POST http://localhost:3000/api/generate-permanent-magic-link');
    console.log('   Body: {"quoteId": "WIN123", "email": "test@example.com"}');
    console.log('');
    console.log('2. GET http://localhost:3000/api/get-permanent-link?quoteId=WIN123&email=test@example.com');
    console.log('');
    console.log('3. Visit /quote-access with a valid token parameter');
    console.log('');
    console.log('💡 Check the README at docs/permanent-magic-links.md for full documentation');
} else {
    // Browser environment
    testPermanentMagicLinks();
}