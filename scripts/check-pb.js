const PocketBase = require('pocketbase/cjs');
const fs = require('fs');
const path = require('path');

async function syncSchema() {
    const pb = new PocketBase('http://127.0.0.1:8090');

    console.log('🔗 Connecting to PocketBase at :8090...');

    try {
        // 1. Try to login as initial admin (or create if first run)
        // Note: PocketBase doesn't allow creating admin via API without auth unless it's a completely fresh DB.
        // But we can check if it's healthy.
        const health = await pb.health.check();
        console.log('✅ Health check:', health);

        console.log('\n⚠️  MANUAL STEP REQUIRED:');
        console.log('Please ensure you have imported "pb_schema.json" in the PocketBase Admin UI:');
        console.log('1. Open http://127.0.0.1:8090/_/');
        console.log('2. Create your first admin account if prompted.');
        console.log('3. Go to Settings > Import Collections.');
        console.log('4. Paste the contents of "pb_schema.json" or upload the file.');
        console.log('\nThis ensures all required tables (facts, user_profiles, etc.) are active.');

    } catch (err) {
        console.error('❌ Failed to connect to PocketBase. Is it running?');
        process.exit(1);
    }
}

syncSchema();
