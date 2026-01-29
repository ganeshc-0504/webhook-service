const crypto = require('crypto');

const BASE_URL = 'http://localhost:3000';
const SECRET = 'your-secret-key-here-change-in-production';

function generateSignature(payload) {
    return crypto
        .createHmac('sha256', SECRET)
        .update(payload, 'utf8')
        .digest('hex');
}

async function sendWebhook(payload, eventType, signature = null) {
    const payloadString = JSON.stringify(payload);
    const sig = signature || generateSignature(payloadString);

    const response = await fetch(`${BASE_URL}/webhooks/provider-x`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Signature': sig,
            'X-Event-Type': eventType,
        },
        body: payloadString,
    });

    const data = await response.json();
    return { status: response.status, data };
}

async function runTests() {
    console.log('🧪 Starting Webhook Service Tests\n');

    console.log('Test 1: Valid order.created event');
    try {
        const payload = {
            eventId: 'evt_001',
            orderId: 'ord_001',
            amount: 1200,
            currency: 'INR',
            timestamp: Math.floor(Date.now() / 1000),
        };
        const result = await sendWebhook(payload, 'order.created');
        console.log(`✅ Status: ${result.status} (expected 200)`);
        console.log(`   Response:`, result.data);
    } catch (error) {
        console.log(`❌ Error:`, error.message);
    }
    console.log('');

    console.log('Test 2: Valid order.updated event');
    try {
        const payload = {
            eventId: 'evt_002',
            orderId: 'ord_001',
            amount: 1500,
            currency: 'INR',
            timestamp: Math.floor(Date.now() / 1000),
        };
        const result = await sendWebhook(payload, 'order.updated');
        console.log(`✅ Status: ${result.status} (expected 200)`);
        console.log(`   Response:`, result.data);
    } catch (error) {
        console.log(`❌ Error:`, error.message);
    }
    console.log('');

    console.log('Test 3: Valid order.cancelled event');
    try {
        const payload = {
            eventId: 'evt_003',
            orderId: 'ord_001',
            amount: 1500,
            currency: 'INR',
            timestamp: Math.floor(Date.now() / 1000),
        };
        const result = await sendWebhook(payload, 'order.cancelled');
        console.log(`✅ Status: ${result.status} (expected 200)`);
        console.log(`   Response:`, result.data);
    } catch (error) {
        console.log(`❌ Error:`, error.message);
    }
    console.log('');

    console.log('Test 4: Invalid signature');
    try {
        const payload = {
            eventId: 'evt_004',
            orderId: 'ord_002',
            amount: 500,
            currency: 'INR',
            timestamp: Math.floor(Date.now() / 1000),
        };
        const result = await sendWebhook(payload, 'order.created', 'invalid-signature-12345');
        console.log(`✅ Status: ${result.status} (expected 401)`);
        console.log(`   Response:`, result.data);
    } catch (error) {
        console.log(`❌ Error:`, error.message);
    }
    console.log('');

    console.log('Test 5: Unknown event type');
    try {
        const payload = {
            eventId: 'evt_005',
            orderId: 'ord_003',
            amount: 800,
            currency: 'INR',
            timestamp: Math.floor(Date.now() / 1000),
        };
        const result = await sendWebhook(payload, 'order.unknown');
        console.log(`✅ Status: ${result.status} (expected 202)`);
        console.log(`   Response:`, result.data);
    } catch (error) {
        console.log(`❌ Error:`, error.message);
    }
    console.log('');

    console.log('Test 6: Missing required field (orderId)');
    try {
        const payload = {
            eventId: 'evt_006',
            amount: 1000,
            currency: 'INR',
            timestamp: Math.floor(Date.now() / 1000),
        };
        const result = await sendWebhook(payload, 'order.created');
        console.log(`✅ Status: ${result.status} (expected 400)`);
        console.log(`   Response:`, result.data);
    } catch (error) {
        console.log(`❌ Error:`, error.message);
    }
    console.log('');

    console.log('Test 7: Malformed JSON');
    try {
        const malformedPayload = '{"eventId":"evt_007","invalid json';
        const sig = generateSignature(malformedPayload);

        const response = await fetch(`${BASE_URL}/webhooks/provider-x`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Signature': sig,
                'X-Event-Type': 'order.created',
            },
            body: malformedPayload,
        });

        const data = await response.json();
        console.log(`✅ Status: ${response.status} (expected 400)`);
        console.log(`   Response:`, data);
    } catch (error) {
        console.log(`❌ Error:`, error.message);
    }
    console.log('');

    console.log('Test 8: Health check endpoint');
    try {
        const response = await fetch(`${BASE_URL}/webhooks/health`);
        const data = await response.json();
        console.log(`✅ Status: ${response.status} (expected 200)`);
        console.log(`   Response:`, data);
    } catch (error) {
        console.log(`❌ Error:`, error.message);
    }
    console.log('');

    console.log('✨ All tests completed!\n');
}

runTests().catch(console.error);
