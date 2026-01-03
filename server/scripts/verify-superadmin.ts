
import { getDb, initializeDatabase } from '../database.js';
import * as platformController from '../controllers/platformController.js';
import * as superadminCompanyController from '../controllers/superadminCompanyController.js';
import { Request, Response } from 'express';

// Mock Express objects
const mockReq = (data: any = {}): Request => {
    return {
        ...data,
        query: data.query || {},
        params: data.params || {},
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

async function verifySuperAdmin() {
    console.log('Initializing DB...');
    await initializeDatabase();
    console.log('DB Initialized.');

    console.log('\n--- Verifying Platform Stats ---');
    await platformController.getDashboardStats(
        mockReq(),
        mockRes('DashboardStats'),
        mockNext('DashboardStats')
    );

    console.log('\n--- Verifying System Health ---');
    await platformController.getSystemHealth(
        mockReq(),
        mockRes('SystemHealth'),
        mockNext('SystemHealth')
    );

    console.log('\n--- Verifying All Companies ---');
    await superadminCompanyController.getAllCompanies(
        mockReq(),
        mockRes('AllCompanies'),
        mockNext('AllCompanies')
    );

    console.log('\n--- Verifying Company Stats ---');
    await superadminCompanyController.getCompanyStats(
        mockReq(),
        mockRes('CompanyStats'),
        mockNext('CompanyStats')
    );
}

verifySuperAdmin().catch(console.error);
