import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.js';
import { extractDocumentData } from '../services/storageService.js';
import { AppError } from '../utils/AppError.js';
import multer from 'multer';

const upload = multer();

/**
 * Extract data from uploaded file using Gemini Vision OCR
 */
export const extractData = [
    upload.single('file'),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.file) throw new AppError('No file uploaded', 400);

            const { type = 'general' } = req.body;
            const data = await extractDocumentData(
                req.file.buffer,
                req.file.mimetype,
                type as 'invoice' | 'rfi' | 'general'
            );

            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }
];
