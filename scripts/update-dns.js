import fetch from 'node-fetch';

// Configuration
const API_TOKEN = 'YheG8RnBbB83f9zrsreew8kDQ116v9hJNETvpzLl69b9e138';
const DOMAIN = 'cortexbuildpro.com';
const TARGET_IP = '82.29.191.97';

// Hostinger API Base URL
const BASE_URL = 'https://api.hostinger.com/v1';

async function updateDns() {
    console.log(`Starting DNS update for ${DOMAIN} to IP ${TARGET_IP}...`);

    // 1. Get List of Records
    try {
        console.log('Fetching existing DNS records...');
        const response = await fetch(`${BASE_URL}/dns/zones/${DOMAIN}/records`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch records: ${response.status} ${response.statusText} - ${await response.text()}`);
        }

        const data = await response.json();
        const records = data; // Hostinger API returns array directly or inside data? Documentation varies, assuming array or key.

        // console.log('Records received:', JSON.stringify(records, null, 2)); 
        // Log truncated if too long

        // Find the A record for the root domain
        const aRecord = (Array.isArray(records) ? records : records.data || []).find(r =>
            r.type === 'A' &&
            (r.name === '@' || r.name === DOMAIN || r.name === '')
        );

        if (!aRecord) {
            throw new Error('Could not find existing A record for root domain.');
        }

        console.log(`Found existing A record: ID=${aRecord.id}, Name=${aRecord.name}, Content=${aRecord.content}`);

        if (aRecord.content === TARGET_IP) {
            console.log('✅ A record is already set to the target IP. No update needed.');
            return;
        }

        // 2. Update the Record
        console.log(`Updating record ${aRecord.id} to ${TARGET_IP}...`);

        const updateResponse = await fetch(`${BASE_URL}/dns/zones/${DOMAIN}/records/${aRecord.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: JSON.stringify({
                type: 'A',
                name: aRecord.name,
                content: TARGET_IP,
                ttl: aRecord.ttl || 14400,
                priority: aRecord.priority || 0
            })
        });

        if (!updateResponse.ok) {
            throw new Error(`Failed to update record: ${updateResponse.status} ${updateResponse.statusText} - ${await updateResponse.text()}`);
        }

        console.log('✅ DNS Record Updated Successfully!');

    } catch (error) {
        console.error('❌ Error updating DNS:', error.message);
        process.exit(1);
    }
}

updateDns();