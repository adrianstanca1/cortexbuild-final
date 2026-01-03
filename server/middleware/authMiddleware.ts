import crypto from 'crypto';
import { supabaseAdmin } from '../utils/supabase.js';
import { logger } from '../utils/logger.js';

const base64UrlDecode = (value: string): string => {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(value.length + (4 - value.length % 4) % 4, '=');
    return Buffer.from(padded, 'base64').toString('utf8');
};

const base64UrlEncode = (value: Buffer): string => value.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const verifySupabaseJwt = (token: string, secret: string) => {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT format');

    const [headerB64, payloadB64, signatureB64] = parts;
    const payloadRaw = base64UrlDecode(payloadB64);
    const payload = JSON.parse(payloadRaw);

    const data = `${headerB64}.${payloadB64}`;
    const expected = base64UrlEncode(crypto.createHmac('sha256', secret).update(data).digest());

    if (signatureB64.length !== expected.length ||
        !crypto.timingSafeEqual(Buffer.from(signatureB64), Buffer.from(expected))) {
        throw new Error('Invalid JWT signature');
    }

    if (payload.exp && Date.now() / 1000 > payload.exp) {
        throw new Error('JWT expired');
    }

    return payload;
};

const applyUserContext = (req: any, res: any, user: any) => {
    req.user = user;
    req.userId = user.id;

    const jwtTenantId = user.user_metadata?.companyId;
    const headerTenantId = req.headers['x-company-id'];
    req.tenantId = jwtTenantId || headerTenantId;

    // Use originalUrl or path, but normalize to ensure segments are found
    const fullPath = req.originalUrl || req.path || '';
    const isPlatformRoute = fullPath.includes('/companies') ||
        fullPath.includes('/platform') ||
        fullPath.includes('/system-settings') ||
        fullPath.includes('/auth');

    const userRole = user.user_metadata?.role || 'user';
    const isSuperAdmin = userRole.toUpperCase() === 'SUPERADMIN' || userRole.toLowerCase() === 'super_admin';

    if (!req.tenantId && !isPlatformRoute && !isSuperAdmin) {
        logger.warn(`[Auth] No tenant context for user ${user.id} on path ${fullPath}`);
        return res.status(403).json({ error: 'Tenant context required' });
    }

    // Normalize role to match UserRole enum (super_admin -> SUPERADMIN)
    let normalizedRole = user.user_metadata?.role || 'user';
    if (normalizedRole === 'super_admin') {
        normalizedRole = 'SUPERADMIN';
    }

    req.context = {
        userId: req.userId,
        tenantId: req.tenantId,
        role: normalizedRole,
        isSuperadmin: isSuperAdmin,
        ipAddress: req.ip || req.header('x-forwarded-for') || req.socket.remoteAddress
    };

    return null;
};

export const authenticateToken = async (req: any, res: any, next: any) => {
    // List of public paths that don't require authentication
    const publicPaths = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/users/forgot-password',
        '/api/users/reset-password-confirm',
        '/api/invitations/accept',
        '/api/invitations/verify',
        '/api/health',
        '/api/live',
        '/live'
    ];

    if (publicPaths.some(path => req.originalUrl.startsWith(path)) || req.originalUrl.includes('/api/client-portal/shared/')) {
        return next();
    }

    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // Handle string "null" or "undefined" from frontend
    if (token === 'null' || token === 'undefined') token = undefined;

    // Check environment (default to development if missing/undefined in local)
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV || process.env.ENABLE_DEMO_AUTH === 'true';

    // DEV BACKDOOR: Support demo user login in development without real Supabase JWT
    if (token === 'dev-token-placeholder' && isDev) {
        const demoUser = {
            id: 'demo-user',
            email: 'demo@buildpro.app',
            user_metadata: {
                full_name: 'Demo Super Admin',
                role: 'SUPERADMIN',
                companyId: 'c1'
            }
        };
        applyUserContext(req, res, demoUser);
        return next();
    }

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Check for Impersonation Token
    if (token.startsWith('imp_v1:')) {
        try {
            const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (!secret) {
                logger.error('SUPABASE_SERVICE_ROLE_KEY missing; cannot validate impersonation tokens');
                return res.status(500).json({ error: 'Server misconfigured' });
            }
            const parts = token.split(':');
            // Format: imp_v1:{userId}:{timestamp}:{signature}
            // token looks like: imp_v1:userId:timestamp:signature
            // But split might handle colons, userId shouldn't have colons (uuid)

            if (parts.length !== 4) throw new Error('Invalid token format');

            const [prefix, userId, timestamp, signature] = parts;
            const payload = `${prefix}:${userId}:${timestamp}`;

            // Verify HMAC
            const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

            if (signature !== expectedSignature) {
                return res.status(403).json({ error: 'Invalid impersonation token signature' });
            }

            // Check Database Session (Structured Impersonation)
            const db = (await import('../database.js')).getDb();
            const session = await db.get(
                `SELECT * FROM impersonation_sessions 
                 WHERE token = ? AND status = 'active'`,
                [token]
            );

            if (!session) {
                return res.status(401).json({ error: 'Impersonation session strictly required' });
            }

            // Check Expiry
            if (new Date(session.expiresAt) < new Date()) {
                await db.run("UPDATE impersonation_sessions SET status = 'expired' WHERE id = ?", [session.id]);
                return res.status(401).json({ error: 'Impersonation session expired' });
            }

            // Hydrate User Context
            req.userId = userId;
            req.user = {
                id: userId,
                email: 'impersonated@session',
                app_metadata: { provider: 'impersonation', adminId: session.adminId }
            };

            // Allow header override for tenant context in impersonation
            req.tenantId = req.headers['x-company-id'] || session.companyId;

            req.context = {
                userId: req.userId,
                tenantId: req.tenantId,
                role: 'impersonated',
                isSuperadmin: false,
                impersonatorId: session.adminId
            };

            return next();
        } catch (e) {
            logger.error('Impersonation Auth Failed:', e);
            return res.status(403).json({ error: 'Invalid impersonation token' });
        }
    }

    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (jwtSecret) {
        try {
            const parts = token.split('.');
            logger.debug(`[Auth] Verifying JWT for path: ${req.originalUrl}, length: ${token.length}, segments: ${parts.length}`);
            if (parts.length !== 3) {
                logger.warn(`[Auth] Malformed token preview: ${token.substring(0, 20)}...`);
            }
            const payload = verifySupabaseJwt(token, jwtSecret);
            const user = {
                id: payload.sub,
                email: payload.email,
                user_metadata: payload.user_metadata || {},
                app_metadata: payload.app_metadata || {}
            };
            const errorResponse = applyUserContext(req, res, user);
            if (errorResponse) return;
            return next();
        } catch (err: any) {
            logger.debug(`[Auth] Local JWT verification failed, falling back to Supabase API: ${err.message}`);
            // Fall back to Supabase admin validation if JWT verification fails
        }
    }

    if (!supabaseAdmin || !supabaseAdmin.auth) {
        logger.error('Supabase admin client not configured; cannot validate tokens');
        return res.status(500).json({ error: 'Server misconfigured' });
    }

    try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            logger.error('[Auth] Token validation failed:', { message: error?.message });
            return res.status(403).json({ error: 'Invalid or expired token' });
        }

        const errorResponse = applyUserContext(req, res, user);
        if (errorResponse) return;
        return next();
    } catch (err) {
        logger.error('[Auth] Exception during token validation:', err);
        return res.status(500).json({ error: 'Internal auth error' });
    }
};
