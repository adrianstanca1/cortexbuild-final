import fs from 'fs';
import path from 'path';
import {
    execSync
} from 'child_process';
import {
    fileURLToPath
} from 'url';

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const SERVER_DIR = path.join(ROOT_DIR, 'server');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const OUTPUT_DIR = path.join(ROOT_DIR, 'deploy-package');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

console.log('📦 Starting Packaging Process...');

try {
    // 1. Frontend
    console.log('🔹 Packaging Frontend...');
    // Assumes build is already run or we run it here? Let's assume user ran build, but to be safe:
    // console.log('   Running frontend build...');
    // execSync('npm run build:frontend', { stdio: 'inherit', cwd: ROOT_DIR });

    if (fs.existsSync(DIST_DIR)) {
        console.log('   Zipping frontend dist...');
        execSync(`cd "${DIST_DIR}" && zip -r "${path.join(OUTPUT_DIR, 'frontend-deploy.zip')}" .`, {
            stdio: 'inherit'
        });
    } else {
        console.error('❌ Frontend dist folder not found! Run npm run build:frontend first.');
    }

    // 2. Backend
    console.log('🔹 Packaging Backend...');
    // console.log('   Running backend build...');
    // execSync('npm run build:backend', { stdio: 'inherit', cwd: ROOT_DIR });

    const backendStaging = path.join(OUTPUT_DIR, 'backend-staging');
    if (fs.existsSync(backendStaging)) {
        fs.rmSync(backendStaging, {
            recursive: true,
            force: true
        });
    }
    fs.mkdirSync(backendStaging);

    // Copy necessary files
    const serverDist = path.join(SERVER_DIR, 'dist');
    if (fs.existsSync(serverDist)) {
        execSync(`cp -r "${serverDist}" "${path.join(backendStaging, 'dist')}"`);
    } else {
        console.error('❌ Backend dist folder not found! Run npm run build:backend first.');
    }

    // Modify package.json
    const packageJsonPath = path.join(SERVER_DIR, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        pkg.main = 'dist/index.js';
        fs.writeFileSync(path.join(backendStaging, 'package.json'), JSON.stringify(pkg, null, 2));
    }

    // Copy .env (rename .env.hostinger)
    const envHostinger = path.join(SERVER_DIR, '.env.hostinger');
    if (fs.existsSync(envHostinger)) {
        fs.copyFileSync(envHostinger, path.join(backendStaging, '.env'));
    } else {
        console.warn('⚠️ .env.hostinger not found using default .env if exists or skipping');
    }

    // Copy .htaccess
    const htaccess = path.join(SERVER_DIR, '.htaccess.production');
    if (fs.existsSync(htaccess)) {
        fs.copyFileSync(htaccess, path.join(backendStaging, '.htaccess'));
    }

    // Copy scripts (for completeness/seeding)
    const scriptsDir = path.join(SERVER_DIR, 'scripts');
    if (fs.existsSync(scriptsDir)) {
        execSync(`cp -r "${scriptsDir}" "${path.join(backendStaging, 'scripts')}"`);
    }

    // Create Restart File
    if (!fs.existsSync(path.join(backendStaging, 'tmp'))) {
        fs.mkdirSync(path.join(backendStaging, 'tmp'));
    }
    fs.writeFileSync(path.join(backendStaging, 'tmp/restart.txt'), new Date().toISOString());

    // Zip Backend
    console.log('   Zipping backend...');
    execSync(`cd "${backendStaging}" && zip -r "${path.join(OUTPUT_DIR, 'backend-deploy.zip')}" .`, {
        stdio: 'inherit'
    });

    // Cleanup
    fs.rmSync(backendStaging, {
        recursive: true,
        force: true
    });

    console.log('\n✅ Packaging Complete!');
    console.log(`📂 Output: ${OUTPUT_DIR}`);
    console.log('   - frontend-deploy.zip (Extract to public_html)');
    console.log('   - backend-deploy.zip  (Extract to public_html/api)');

} catch (error) {
    console.error('❌ Error during packaging:', error);
    process.exit(1);
}