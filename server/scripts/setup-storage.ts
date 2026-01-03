import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from server root (one level up from scripts)
dotenv.config({ path: join(__dirname, '../.env') });

async function setupStorage() {
    // Dynamic import to ensure env vars are loaded first
    const { supabaseAdmin } = await import('../utils/supabase.js');

    if (!supabaseAdmin) {
        console.error('❌ Supabase Admin not configured');
        process.exit(1);
    }

    const buckets = [
        { name: 'documents', public: false },
        { name: 'avatars', public: true },
        { name: 'project-files', public: false }
    ];

    console.log('📦 Verifying Storage Buckets...');

    for (const bucket of buckets) {
        process.stdout.write(`   Checking '${bucket.name}'... `);

        // Check if bucket exists
        const { data, error } = await supabaseAdmin.storage.getBucket(bucket.name);

        if (error || !data) {
            console.log('Missing. Creating...');
            const { error: createError } = await supabaseAdmin.storage.createBucket(bucket.name, {
                public: bucket.public,
                fileSizeLimit: 52428800, // 50MB
            });

            if (createError) {
                console.error(`      ❌ Failed: ${createError.message}`);
            } else {
                console.log(`      ✅ Created successfully.`);
            }
        } else {
            console.log(`✅ Exists.`);
        }
    }
    console.log('🎉 Storage verification complete.');
}

setupStorage();
