import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../utils/supabase.js';
import { getDb } from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

export const setupSuperadmin = async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, name } = req.body;
    if (!email) throw new AppError('Email is required', 400);
    if (!supabaseAdmin) throw new AppError('Supabase Admin not available', 503);

    logger.info(`Starting Ultra-Resilient Superadmin Setup for ${email}`);
    const db = getDb();
    let userId: string | null = null;
    const finalPassword = password || 'BuildPro2025!';

    const attemptProvisioning = async () => {
        // 1. Try to create user
        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: finalPassword,
            email_confirm: true,
            user_metadata: {
                name: name || 'Super Admin',
                role: 'SUPERADMIN',
                companyId: 'platform-admin'
            }
        });

        if (!createError) return createData.user.id;

        // 2. If creation fails (for any reason, including 500 or 422), try generateLink recovery
        logger.warn(`Creation failed (${createError.status}): ${createError.message}. Attempting recovery via generateLink...`);
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: email
        });

        if (linkData?.user?.id) {
            logger.info('User ID recovered via magiclink workaround');
            // Ensure metadata is updated even during recovery
            await supabaseAdmin.auth.admin.updateUserById(linkData.user.id, {
                password: finalPassword,
                user_metadata: {
                    name: name || linkData.user.user_metadata?.name || 'Super Admin',
                    role: 'SUPERADMIN',
                    companyId: 'platform-admin'
                }
            });
            return linkData.user.id;
        }

        // 3. Last resort: listUsers (only if recovery failed)
        logger.warn(`Recovery failed. Falling back to listUsers...`);
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;

        const found = listData.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
        if (found) {
            await supabaseAdmin.auth.admin.updateUserById(found.id, {
                password: finalPassword,
                user_metadata: {
                    name: name || found.user_metadata?.name || 'Super Admin',
                    role: 'SUPERADMIN',
                    companyId: 'platform-admin'
                }
            });
            return found.id;
        }

        throw createError; // Throw the original creation error if nothing worked
    };

    try {
        // Retry logic: 3 attempts with exponential backoff
        for (let i = 0; i < 3; i++) {
            try {
                userId = await attemptProvisioning();
                if (userId) break;
            } catch (err: any) {
                logger.error(`Attempt ${i + 1} failed: ${err.message}`);
                if (i === 2) throw err;
                await new Promise(r => setTimeout(r, 2000 * (i + 1)));
            }
        }

        if (!userId) throw new Error('Failed to provision user after 3 attempts');

        // Sync to Local DB and grant SuperAdmin (same as before)
        const platformCompanyId = 'platform-admin';
        await db.run(
            `INSERT INTO companies (id, name, isActive, createdAt, updatedAt, plan, status, slug)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE updatedAt = ?`,
            [platformCompanyId, 'Platform Administration', 1, new Date().toISOString(), new Date().toISOString(), 'ENTERPRISE', 'ACTIVE', 'platform-admin', new Date().toISOString()]
        );

        await db.run(
            `INSERT INTO users (id, email, password, name, role, companyId, status, isActive, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE role = ?, companyId = ?, updatedAt = ?`,
            [userId, email, 'managed-by-supabase', name || 'Super Admin', 'SUPERADMIN', platformCompanyId, 'active', 1, new Date().toISOString(), new Date().toISOString(), 'SUPERADMIN', platformCompanyId, new Date().toISOString()]
        );

        const mId = uuidv4();
        await db.run(
            `INSERT INTO memberships (id, userId, companyId, role, status, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE role = ?, status = ?, updatedAt = ?`,
            [mId, userId, platformCompanyId, 'SUPERADMIN', 'active', new Date().toISOString(), new Date().toISOString(), 'SUPERADMIN', 'active', new Date().toISOString()]
        );

        res.json({ success: true, message: 'Superadmin setup complete', user: { id: userId, email, role: 'SUPERADMIN' } });
    } catch (error: any) {
        logger.error('Final Setup error:', error);
        next(error);
    }
};



