import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import { createCommentSchema } from '../validation/schemas.js';
import { sendNotification } from '../services/notificationService.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

/**
 * Get comments for an entity
 */
export const getComments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const companyId = req.tenantId;
        const { entityType, entityId } = req.query;

        if (!entityType || !entityId) {
            throw new AppError('entityType and entityId are required', 400);
        }

        const comments = await db.all(`
      SELECT * FROM comments
      WHERE companyId = ? AND entityType = ? AND entityId = ?
      ORDER BY createdAt ASC
    `, [companyId, entityType, entityId]);

        // Parse JSON fields
        const parsedComments = comments.map((comment: any) => ({
            ...comment,
            mentions: comment.mentions ? JSON.parse(comment.mentions) : [],
            attachments: comment.attachments ? JSON.parse(comment.attachments) : [],
        }));

        res.json(parsedComments);
    } catch (error: any) {
        logger.error('Error fetching comments:', error);
        next(error);
    }
};

/**
 * Create a new comment
 */
export const createComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Validate request body
        const validatedData = createCommentSchema.parse(req.body);

        const db = getDb();
        const companyId = req.tenantId;
        const userId = (req as any).userId;
        const userName = (req as any).userName;
        const id = uuidv4();

        await db.run(`
      INSERT INTO comments (
        id, companyId, entityType, entityId, userId, userName,
        parentId, content, mentions, attachments, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            id,
            companyId,
            validatedData.entityType,
            validatedData.entityId,
            userId,
            userName,
            validatedData.parentId || null,
            validatedData.content,
            validatedData.mentions ? JSON.stringify(validatedData.mentions) : null,
            validatedData.attachments ? JSON.stringify(validatedData.attachments) : null,
            new Date().toISOString()
        ]);

        // Send notifications to mentioned users
        if (validatedData.mentions && validatedData.mentions.length > 0) {
            for (const mentionedUserId of validatedData.mentions) {
                try {
                    await sendNotification(
                        companyId,
                        mentionedUserId,
                        'info',
                        'New Mention',
                        `${userName} mentioned you in a comment`,
                        `/${validatedData.entityType}s/${validatedData.entityId}`
                    );
                } catch (notifErr) {
                    logger.warn('Failed to send mention notification', notifErr);
                }
            }
        }

        const comment = await db.get('SELECT * FROM comments WHERE id = ?', [id]);

        // Broadcast Real-time Event
        try {
            const { broadcastToCompany } = await import('../socket.js');
            broadcastToCompany(companyId, {
                type: 'entity_update',
                entityType: validatedData.entityType,
                entityId: validatedData.entityId,
                feature: 'comments',
                data: comment,
                timestamp: new Date().toISOString()
            });
        } catch (socketErr) {
            logger.warn('Failed to broadcast comment event', socketErr);
        }

        res.json(comment);
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return next(new AppError('Validation failed', 400));
        }
        logger.error('Error creating comment:', error);
        next(error);
    }
};

/**
 * Update a comment
 */
export const updateComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const companyId = req.tenantId;
        const userId = (req as any).userId;
        const { id } = req.params;
        const { content } = req.body;

        // Verify the comment belongs to the user
        const existingComment = await db.get(`
      SELECT * FROM comments WHERE id = ? AND companyId = ? AND userId = ?
    `, [id, companyId, userId]);

        if (!existingComment) {
            throw new AppError('Comment not found or unauthorized', 404);
        }

        await db.run(`
      UPDATE comments
      SET content = ?, updatedAt = ?
      WHERE id = ?
    `, [content, new Date().toISOString(), id]);

        const updatedComment = await db.get('SELECT * FROM comments WHERE id = ?', [id]);
        res.json(updatedComment);
    } catch (error: any) {
        logger.error('Error updating comment:', error);
        next(error);
    }
};

/**
 * Delete a comment
 */
export const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDb();
        const companyId = req.tenantId;
        const userId = (req as any).userId;
        const { id } = req.params;

        // Verify the comment belongs to the user
        const existingComment = await db.get(`
      SELECT * FROM comments WHERE id = ? AND companyId = ? AND userId = ?
    `, [id, companyId, userId]);

        if (!existingComment) {
            throw new AppError('Comment not found or unauthorized', 404);
        }

        await db.run('DELETE FROM comments WHERE id = ?', [id]);
        res.json({ message: 'Comment deleted successfully' });
    } catch (error: any) {
        logger.error('Error deleting comment:', error);
        next(error);
    }
};
