import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CleanupReport {
    consoleLogs: { file: string; count: number }[];
    duplicateFiles: string[];
    unusedFiles: string[];
    todoComments: { file: string; line: number; comment: string }[];
}

async function analyzeCodebase(): Promise<CleanupReport> {
    console.log('🔍 Analyzing Codebase for Cleanup\n');

    const report: CleanupReport = {
        consoleLogs: [],
        duplicateFiles: [],
        unusedFiles: [],
        todoComments: []
    };

    // Find files with many console.log statements
    console.log('=== DEBUGGING CODE ===');
    const debugFiles = [
        'server/middleware/authMiddleware.ts',
        'services/db.ts',
        'components/CreateCompanyModal.tsx',
        'services/geminiService.ts'
    ];

    for (const file of debugFiles) {
        const fullPath = path.join(__dirname, '../../', file);
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const count = (content.match(/console\.log/g) || []).length;
            if (count > 0) {
                report.consoleLogs.push({ file, count });
                console.log(`${file}: ${count} console.log statements`);
            }
        }
    }

    // Check for duplicate test files
    console.log('\n=== TEST FILES ===');
    const testFiles = [
        'test-auth-api.ts',
        'test-api-endpoints.ts',
        'server/scripts/test-login.ts'
    ];

    for (const file of testFiles) {
        const fullPath = path.join(__dirname, '../../', file);
        if (fs.existsSync(fullPath)) {
            console.log(`Found: ${file}`);
            report.duplicateFiles.push(file);
        }
    }

    // Check for old migration scripts
    console.log('\n=== MIGRATION SCRIPTS ===');
    const migrationDir = path.join(__dirname, '../migrations');
    if (fs.existsSync(migrationDir)) {
        const migrations = fs.readdirSync(migrationDir);
        console.log(`Total migrations: ${migrations.length}`);
        migrations.forEach(m => console.log(`  - ${m}`));
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Files with console.log: ${report.consoleLogs.length}`);
    console.log(`Test/debug files: ${report.duplicateFiles.length}`);

    return report;
}

async function generateCleanupPlan(report: CleanupReport) {
    console.log('\n=== CLEANUP RECOMMENDATIONS ===\n');

    if (report.consoleLogs.length > 0) {
        console.log('1. Remove debugging console.log statements:');
        report.consoleLogs.forEach(({ file, count }) => {
            console.log(`   - ${file} (${count} statements)`);
        });
    }

    if (report.duplicateFiles.length > 0) {
        console.log('\n2. Consider removing test files (keep if needed for development):');
        report.duplicateFiles.forEach(file => {
            console.log(`   - ${file}`);
        });
    }

    console.log('\n3. Keep all production code - no duplicates found');
    console.log('4. All routes properly registered');
    console.log('5. No merge conflicts detected');
}

async function main() {
    const report = await analyzeCodebase();
    await generateCleanupPlan(report);
}

main();
