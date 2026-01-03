
import { getDb, initializeDatabase } from '../database.js';
import * as superadminCompanyController from '../controllers/superadminCompanyController.js';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Mock Express objects (reused from verify-superadmin)
const mockReq = (data: any = {}): Request => {
    return {
        ...data,
        body: data.body || {},
    } as unknown as Request;
};

const mockRes = (label: string): Response => {
    const res: any = {
        json: (data: any) => {
            console.log(`\n[${label}] SUCCESS:`);
            console.log(JSON.stringify(data, null, 2));
            return res;
        },
        status: (code: number) => {
            console.log(`\n[${label}] STATUS: ${code}`);
            return res;
        },
        send: (msg: any) => {
            console.log(`\n[${label}] SEND: ${msg}`);
            return res;
        }
    };
    return res as Response;
};

const mockNext = (label: string) => (err?: any) => {
    if (err) {
        console.error(`\n[${label}] ERROR:`, err);
    } else {
        console.log(`\n[${label}] NEXT called (Middleware passed)`);
    }
};

async function verifyCompanyCreation() {
    console.log('Initializing DB...');
    await initializeDatabase();
    console.log('DB Initialized.');

    // Cleanup any failed test runs - actually no, we use unique emails/names
    const uniqueId = uuidv4().substring(0, 8);

    console.log('\n--- Verifying Company Creation ---');
    await superadminCompanyController.createCompany(
        mockReq({
            body: {
                name: `Test Company ${uniqueId}`,
                ownerEmail: `owner-${uniqueId}@example.com`,
                ownerName: 'Test Owner',
                plan: 'Pro',
                maxUsers: 50,
                maxProjects: 20
            }
        }),
        mockRes('CreateCompany'),
        mockNext('CreateCompany')
    );
}

verifyCompanyCreation().catch(console.error);
