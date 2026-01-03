
import { Router } from 'express';
import * as supportController from '../controllers/supportController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { UserRole } from '../types.js';

const router = Router();

// Support routes for company users
router.post('/tickets', authenticateToken, supportController.createTicket);
router.get('/my-tickets', authenticateToken, supportController.getTickets); // filtered by req.companyId in controller logic if needed, but here we can just use req.query or refactor controller
router.get('/tickets/:ticketId/messages', authenticateToken, supportController.getTicketMessages);
router.post('/tickets/:ticketId/reply', authenticateToken, supportController.replyToTicket);

// Support management for SuperAdmins
router.get('/admin/tickets', authenticateToken, requireRole([UserRole.SUPERADMIN]), supportController.getTickets);
router.put('/admin/tickets/:ticketId/status', authenticateToken, requireRole([UserRole.SUPERADMIN]), supportController.updateTicketStatus);

export default router;
