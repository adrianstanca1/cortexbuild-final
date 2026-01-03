import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

/**
 * Middleware factory for validating request data using Zod schemas
 * @param schema - Zod schema to validate against
 * @param source - Which part of the request to validate ('body' | 'query' | 'params')
 */
export const validate = (schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const dataToValidate = req[source];
            const validated = await schema.parseAsync(dataToValidate);

            // Replace the original data with the validated & sanitized data
            req[source] = validated;

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errorMessages = (error as any).errors.map((issue: any) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                }));

                return res.status(400).json({
                    error: 'Validation failed',
                    details: errorMessages,
                });
            }

            // For any other errors, pass to error handler
            next(error);
        }
    };
};

/**
 * Sanitize string inputs to prevent XSS
 */
export const sanitizeString = (input: string): string => {
    return input
        .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
        .trim();
};

/**
 * Validate UUID format
 */
export const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};
