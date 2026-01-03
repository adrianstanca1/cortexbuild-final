import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';
import { ZodError } from 'zod';

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    // Handling Zod Validation Errors
    if (err instanceof ZodError) {
        return res.status(400).json({
            status: 'fail',
            message: 'Validation failed',
            errors: err.issues.map(e => ({
                path: e.path.join('.'),
                message: e.message
            }))
        });
    }

    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        logger.error('DEV ERROR:', {
            id: (req as any).id,
            statusCode: err.statusCode,
            status: err.status,
            message: err.message,
            stack: err.stack,
            error: err
        });

        res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        });
    } else {
        // Production
        if (err.isOperational) {
            // Trusted operational error: send message to client
            logger.warn('OPERATIONAL ERROR:', {
                id: (req as any).id,
                message: err.message,
                statusCode: err.statusCode,
                path: req.originalUrl,
                method: req.method,
                tenantId: (req as any).tenantId || 'unknown'
            });
            res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            });
        } else {
            // Programming or other unknown error: don't leak details
            logger.error('PROGRAMMING ERROR:', {
                id: (req as any).id,
                err,
                path: req.originalUrl,
                method: req.method,
                tenantId: (req as any).tenantId || 'unknown',
                stack: err.stack
            });
            res.status(500).json({
                status: 'error',
                message: 'Something went very wrong!'
            });
        }
    }
};

export default errorHandler;
