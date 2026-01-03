import { IDatabase } from '../database.js';
import { logger } from '../utils/logger.js';

/**
 * TenantProvisioningService
 * Responsible for setting up the database schema for a new Tenant.
 * This ensures that when a new Tenant DB is created (e.g. SQLite file or Postgres Schema), 
 * it has all the necessary tables.
 */
export class TenantProvisioningService {

    /**
     * Runs the DDL statements to create all Tenant-specific tables.
     * @param db The resolved Tenant Database connection
     */
    async initializeTenantDatabase(db: IDatabase) {
        logger.info('Initializing Tenant Database Schema...');

        // Projects
        await db.exec(`
            CREATE TABLE IF NOT EXISTS projects (
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                code VARCHAR(100),
                name TEXT NOT NULL,
                description TEXT,
                location TEXT,
                type VARCHAR(100),
                status VARCHAR(50),
                health VARCHAR(50),
                progress REAL,
                budget REAL,
                spent REAL,
                startDate TEXT,
                endDate TEXT,
                manager TEXT,
                image TEXT,
                teamSize INTEGER,
                weatherLocation TEXT,
                aiAnalysis TEXT,
                zones TEXT,
                phases TEXT,
                timelineOptimizations TEXT,
                createdAt TEXT,
                updatedAt TEXT
            )
        `);

        // Shared Links
        await db.exec(`
            CREATE TABLE IF NOT EXISTS shared_links (
                id VARCHAR(255) PRIMARY KEY,
                projectId VARCHAR(255) NOT NULL,
                companyId VARCHAR(255) NOT NULL,
                token VARCHAR(255) UNIQUE NOT NULL,
                password TEXT,
                expiresAt TEXT NOT NULL,
                createdBy VARCHAR(255) NOT NULL,
                createdAt TEXT NOT NULL,
                lastAccessedAt TEXT,
                accessCount INTEGER DEFAULT 0,
                isActive BOOLEAN DEFAULT TRUE,
                FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
            )
        `);

        // Tasks
        await db.exec(`
            CREATE TABLE IF NOT EXISTS tasks (
                id VARCHAR(255) PRIMARY KEY,
                projectId VARCHAR(255) NOT NULL,
                companyId VARCHAR(255) NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                status VARCHAR(50) NOT NULL,
                priority VARCHAR(50) NOT NULL,
                assignedTo TEXT,
                assigneeId VARCHAR(255),
                assigneeName TEXT,
                assigneeType VARCHAR(50),
                dueDate TEXT,
                startDate TEXT,
                duration INTEGER,
                dependencies TEXT,
                progress INTEGER DEFAULT 0,
                color TEXT,
                createdBy VARCHAR(255),
                latitude REAL,
                longitude REAL,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
            )
        `);

        // Team (Tenant Members / Project Team)
        // Note: 'users' table is in Platform DB. 'team' is often used for Project-specific roles or caching.
        // We keep it here as it links to projects.
        await db.exec(`
            CREATE TABLE IF NOT EXISTS team (
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                name TEXT NOT NULL,
                email TEXT,
                role TEXT NOT NULL,
                phone TEXT,
                skills TEXT,
                certifications TEXT,
                status TEXT,
                projectId TEXT,
                availability TEXT,
                location TEXT,
                avatar TEXT,
                hourlyRate REAL
            )
        `);

        // Documents
        await db.exec(`
            CREATE TABLE IF NOT EXISTS documents (
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                projectId VARCHAR(255) NOT NULL,
                projectName TEXT,
                name TEXT NOT NULL,
                type VARCHAR(100) NOT NULL,
                size TEXT,
                date TEXT,
                status VARCHAR(50),
                url TEXT,
                linkedTaskIds TEXT,
                currentVersion INTEGER,
                FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
            )
        `);

        // Clients
        await db.exec(`
            CREATE TABLE IF NOT EXISTS clients (
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                name TEXT NOT NULL,
                company TEXT,
                email TEXT,
                phone TEXT,
                projects TEXT,
                totalValue REAL,
                status TEXT
            )
        `);

        // Inventory
        await db.exec(`
            CREATE TABLE IF NOT EXISTS inventory (
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                name TEXT NOT NULL,
                category TEXT,
                quantity INTEGER,
                unit TEXT,
                location TEXT,
                reorderLevel INTEGER,
                status TEXT,
                supplier TEXT,
                unitCost REAL,
                totalValue REAL,
                lastRestocked TEXT
            )
        `);

        // Equipment
        await db.exec(`
            CREATE TABLE IF NOT EXISTS equipment (
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                name TEXT NOT NULL,
                type TEXT,
                model TEXT,
                serialNumber TEXT,
                status TEXT,
                location TEXT,
                assignedTo TEXT,
                purchaseDate TEXT,
                nextMaintenance TEXT,
                utilizationRate INTEGER
            )
        `);

        // RFIs
        await db.exec(`
            CREATE TABLE IF NOT EXISTS rfis (
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                projectId VARCHAR(255) NOT NULL,
                number TEXT NOT NULL,
                subject TEXT NOT NULL,
                description TEXT,
                raisedBy TEXT,
                assignedTo TEXT,
                priority TEXT,
                status TEXT,
                dueDate TEXT,
                createdAt TEXT,
                response TEXT,
                FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
            )
        `);

        // Punch Items
        await db.exec(`
            CREATE TABLE IF NOT EXISTS punch_items (
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                projectId VARCHAR(255) NOT NULL,
                location TEXT,
                description TEXT,
                priority TEXT,
                assignedTo TEXT,
                status TEXT,
                dueDate TEXT,
                createdAt TEXT,
                FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
            )
        `);

        // Daily Logs
        await db.exec(`
            CREATE TABLE IF NOT EXISTS daily_logs (
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                projectId VARCHAR(255) NOT NULL,
                date TEXT,
                weather TEXT,
                temperature TEXT,
                workforce INTEGER,
                activities TEXT,
                equipment TEXT,
                delays TEXT,
                safetyIssues TEXT,
                notes TEXT,
                createdBy TEXT,
                status TEXT DEFAULT 'Draft',
                signedBy TEXT,
                signedAt TEXT,
                attachments TEXT,
                FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
            )
        `);

        // Dayworks
        await db.exec(`
            CREATE TABLE IF NOT EXISTS dayworks (
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                projectId VARCHAR(255) NOT NULL,
                date TEXT,
                description TEXT,
                labor TEXT,
                materials TEXT,
                grandTotal REAL,
                status TEXT,
                attachments TEXT,
                FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
            )
        `);

        // Safety Incidents
        await db.exec(`
            CREATE TABLE IF NOT EXISTS safety_incidents (
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                projectId TEXT,
                type TEXT,
                title TEXT,
                severity TEXT,
                date TEXT,
                location TEXT,
                description TEXT,
                personInvolved TEXT,
                actionTaken TEXT,
                status TEXT
            )
        `);

        // Safety Hazards
        await db.exec(`
            CREATE TABLE IF NOT EXISTS safety_hazards (
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                projectId TEXT,
                type TEXT,
                severity TEXT,
                riskScore REAL,
                description TEXT,
                recommendation TEXT,
                regulation TEXT,
                box_2d TEXT,
                createdAt TEXT NOT NULL
            )
        `);

        // Timesheets
        await db.exec(`
            CREATE TABLE IF NOT EXISTS timesheets (
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                userId TEXT,
                userName TEXT,
                date TEXT,
                projectId TEXT,
                projectName TEXT,
                hoursWorked REAL,
                task TEXT,
                status TEXT
            )
        `);

        // Channels
        await db.exec(`
            CREATE TABLE IF NOT EXISTS channels (
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                isPrivate BOOLEAN,
                memberIds TEXT,
                createdAt TEXT
            )
        `);

        // Team Messages
        await db.exec(`
            CREATE TABLE IF NOT EXISTS team_messages (
                id VARCHAR(255) PRIMARY KEY,
                channelId VARCHAR(255) NOT NULL,
                userId VARCHAR(255) NOT NULL,
                userName TEXT NOT NULL,
                message TEXT NOT NULL,
                createdAt TEXT NOT NULL,
                avatar TEXT,
                attachments TEXT,
                FOREIGN KEY (channelId) REFERENCES channels(id) ON DELETE CASCADE
            )
        `);

        // Transactions
        await db.exec(`
            CREATE TABLE IF NOT EXISTS transactions (
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                projectId TEXT,
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                description TEXT,
                category TEXT,
                date TEXT,
                status TEXT,
                costCodeId TEXT
            )
        `);

        // Purchase Orders
        await db.exec(`
            CREATE TABLE IF NOT EXISTS purchase_orders (
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                projectId TEXT,
                poNumber TEXT UNIQUE NOT NULL,
                vendor TEXT NOT NULL,
                items TEXT NOT NULL,
                total REAL NOT NULL,
                status TEXT NOT NULL,
                requestedBy TEXT,
                approvers TEXT,
                dateCreated TEXT,
                dateRequired TEXT,
                notes TEXT
            )
        `);

        // Defects
        await db.exec(`
            CREATE TABLE IF NOT EXISTS defects (
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                projectId VARCHAR(255) NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                severity TEXT,
                status TEXT,
                reportedBy TEXT,
                assignedTo TEXT,
                location TEXT,
                box_2d TEXT,
                createdAt TEXT,
                FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
            )
        `);

        // Project Risks
        await db.exec(`
            CREATE TABLE IF NOT EXISTS project_risks (
                id VARCHAR(255) PRIMARY KEY,
                projectId VARCHAR(255) NOT NULL,
                riskLevel TEXT,
                predictedDelayDays INTEGER,
                factors TEXT,
                recommendations TEXT,
                createdAt TEXT NOT NULL,
                trend TEXT,
                FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
            )
        `);

        // AI Assets (Innovation)
        await db.exec(`
            CREATE TABLE IF NOT EXISTS ai_assets(
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                projectId VARCHAR(255),
                userId VARCHAR(255) NOT NULL,
                type VARCHAR(50) NOT NULL,
                url TEXT,
                prompt TEXT,
                metadata TEXT,
                createdAt TEXT NOT NULL
            )
        `);

        // Vendors (Supply Chain)
        await db.exec(`
            CREATE TABLE IF NOT EXISTS vendors(
            id VARCHAR(255) PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT,
            contact TEXT,
            email TEXT,
            phone TEXT,
            rating REAL,
            status TEXT,
            companyId VARCHAR(255)
            )
        `);

        // Cost Codes (Financials)
        await db.exec(`
            CREATE TABLE IF NOT EXISTS cost_codes(
                id VARCHAR(255) PRIMARY KEY,
                projectId VARCHAR(255),
                companyId VARCHAR(255),
                code TEXT,
                description TEXT,
                budget REAL,
                spent REAL DEFAULT 0,
                FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
            )
        `);

        // Invoices
        await db.exec(`
            CREATE TABLE IF NOT EXISTS invoices(
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                projectId VARCHAR(255),
                number TEXT,
                vendorId VARCHAR(255),
                amount REAL,
                date TEXT,
                dueDate TEXT,
                status TEXT,
                costCodeId VARCHAR(255),
                items TEXT,
                files TEXT,
                FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
            )
        `);

        // Expense Claims
        await db.exec(`
            CREATE TABLE IF NOT EXISTS expense_claims(
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                projectId VARCHAR(255),
                userId VARCHAR(255),
                description TEXT,
                amount REAL,
                date TEXT,
                category TEXT,
                status TEXT,
                costCodeId VARCHAR(255),
                receiptUrl TEXT,
                FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
            )
        `);

        // Notifications
        await db.exec(`
            CREATE TABLE IF NOT EXISTS notifications(
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                userId VARCHAR(255) NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT,
                link TEXT,
                isRead BOOLEAN DEFAULT FALSE,
                createdAt TEXT NOT NULL
            )
        `);

        // Comments table for collaboration
        await db.exec(`
            CREATE TABLE IF NOT EXISTS comments(
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                entityType TEXT NOT NULL,
                entityId VARCHAR(255) NOT NULL,
                userId VARCHAR(255) NOT NULL,
                userName TEXT,
                parentId VARCHAR(255),
                content TEXT NOT NULL,
                mentions TEXT,
                attachments TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT
            )
        `);

        // Activity feed table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS activity_feed(
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                projectId VARCHAR(255),
                userId VARCHAR(255) NOT NULL,
                userName TEXT,
                action TEXT NOT NULL,
                entityType TEXT NOT NULL,
                entityId VARCHAR(255) NOT NULL,
                metadata TEXT,
                createdAt TEXT NOT NULL
            )
        `);

        // Task assignments for resource allocation
        await db.exec(`
            CREATE TABLE IF NOT EXISTS task_assignments(
                id VARCHAR(255) PRIMARY KEY,
                taskId VARCHAR(255) NOT NULL,
                userId VARCHAR(255) NOT NULL,
                userName TEXT,
                role TEXT,
                allocatedHours REAL,
                actualHours REAL DEFAULT 0,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(taskId) REFERENCES tasks(id) ON DELETE CASCADE
            )
        `);

        // Automations Table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS automations(
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                name TEXT NOT NULL,
                triggerType TEXT NOT NULL,
                actionType TEXT NOT NULL,
                configuration TEXT,
                enabled BOOLEAN DEFAULT TRUE,
                createdAt TEXT,
                updatedAt TEXT
            )
        `);

        // Safety Audit Checklists
        await db.exec(`
            CREATE TABLE IF NOT EXISTS safety_checklists(
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                projectId VARCHAR(255),
                name TEXT NOT NULL,
                date TEXT NOT NULL,
                inspector TEXT,
                status TEXT DEFAULT 'In Progress',
                score REAL,
                signedBy TEXT,
                signedAt TEXT,
                notes TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT,
                FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE SET NULL
            )
        `);

        // Safety Checklist Items
        await db.exec(`
            CREATE TABLE IF NOT EXISTS safety_checklist_items(
                id VARCHAR(255) PRIMARY KEY,
                checklistId VARCHAR(255) NOT NULL,
                category TEXT NOT NULL,
                text TEXT NOT NULL,
                status TEXT DEFAULT 'PENDING',
                notes TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT,
                FOREIGN KEY(checklistId) REFERENCES safety_checklists(id) ON DELETE CASCADE
            )
        `);

        // Module Installations (Tenant)
        await db.exec(`
            CREATE TABLE IF NOT EXISTS module_installations(
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                moduleId VARCHAR(255) NOT NULL,
                config TEXT,
                isActive BOOLEAN DEFAULT TRUE,
                installedAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                UNIQUE(companyId, moduleId)
            )
        `);

        // Audit Logs
        await db.exec(`
            CREATE TABLE IF NOT EXISTS audit_logs(
                id VARCHAR(255) PRIMARY KEY,
                companyId VARCHAR(255) NOT NULL,
                userId VARCHAR(255),
                userName VARCHAR(255),
                action VARCHAR(100) NOT NULL,
                resource VARCHAR(100) NOT NULL,
                resourceId VARCHAR(255),
                changes TEXT,
                status VARCHAR(50),
                details TEXT,
                ipAddress VARCHAR(50),
                userAgent TEXT,
                severity TEXT DEFAULT 'info',
                createdAt TEXT NOT NULL
            )
        `);

        logger.info('Tenant Database Schema Initialized Successfully');
    }
}

export const tenantProvisioningService = new TenantProvisioningService();
