import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RouteInfo {
    path: string;
    found: boolean;
    controller?: string;
}

async function verifyRoutes() {
    console.log('🔍 Backend Route Verification\n');

    // Read server/index.ts
    const indexPath = path.join(__dirname, '../index.ts');
    const indexContent = fs.readFileSync(indexPath, 'utf8');

    // Expected routes
    const expectedRoutes = [
        { path: '/api/companies', controller: 'companyRoutes' },
        { path: '/api/projects', controller: 'projectRoutes' },
        { path: '/api/tasks', controller: 'taskRoutes' },
        { path: '/api/documents', controller: 'createCrudRoutes(\'documents\'' },
        { path: '/api/user/me', controller: 'userProfile' },
        { path: '/api/platform', controller: 'platformRoutes' },
        { path: '/api/notifications', controller: 'notificationRoutes' },
        { path: '/api/team', controller: 'createCrudRoutes(\'team\'' },
        { path: '/api/timesheets', controller: 'createCrudRoutes(\'timesheets\'' },
        { path: '/api/equipment', controller: 'createCrudRoutes(\'equipment\'' },
        { path: '/api/inventory', controller: 'createCrudRoutes(\'inventory\'' },
        { path: '/api/safety_incidents', controller: 'safetyController' },
        { path: '/api/rfis', controller: 'rfiController' },
        { path: '/api/daily_logs', controller: 'dailyLogController' },
        { path: '/api/invoices', controller: 'invoiceController' },
    ];

    console.log('=== ROUTE REGISTRATION ===\n');

    const results: RouteInfo[] = [];

    for (const route of expectedRoutes) {
        const found = indexContent.includes(`app.use('${route.path}'`);
        results.push({
            path: route.path,
            found,
            controller: route.controller
        });

        const emoji = found ? '✅' : '❌';
        console.log(`${emoji} ${route.path}`);
    }

    const registered = results.filter(r => r.found).length;
    const missing = results.filter(r => !r.found).length;

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total routes checked: ${results.length}`);
    console.log(`✅ Registered: ${registered}`);
    console.log(`❌ Missing: ${missing}`);

    if (missing > 0) {
        console.log(`\n⚠️  Missing routes:`);
        results.filter(r => !r.found).forEach(r => {
            console.log(`   - ${r.path}`);
        });
    }
}

verifyRoutes();
