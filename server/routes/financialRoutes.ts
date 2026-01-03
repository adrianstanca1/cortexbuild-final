import { Router } from 'express';
import * as invoiceController from '../controllers/invoiceController.js';
import * as expenseController from '../controllers/expenseController.js';
import * as costCodeController from '../controllers/costCodeController.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { validateActiveMembership } from '../middleware/apiValidationMiddleware.js';
import { requireModule } from '../middleware/moduleMiddleware.js';
import { CompanyModule } from '../types/modules.js';

const router = Router();

// Middleware - require FINANCIALS module for all routes
router.use(validateActiveMembership);
router.use(requireModule(CompanyModule.FINANCIALS));

// --- Invoices ---
router.get('/invoices', requirePermission('financials', 'read'), invoiceController.getInvoices);
router.get('/invoices/:id', requirePermission('financials', 'read'), invoiceController.getInvoice);
router.post('/invoices', requirePermission('financials', 'create'), invoiceController.createInvoice);
router.put('/invoices/:id', requirePermission('financials', 'update'), invoiceController.updateInvoice);
router.delete('/invoices/:id', requirePermission('financials', 'delete'), invoiceController.deleteInvoice);

// --- Expenses ---
router.get('/expenses', requirePermission('financials', 'read'), expenseController.getExpenses);
router.post('/expenses', requirePermission('financials', 'create'), expenseController.createExpense);
router.put('/expenses/:id', requirePermission('financials', 'update'), expenseController.updateExpense);
router.delete('/expenses/:id', requirePermission('financials', 'delete'), expenseController.deleteExpense);

// --- Cost Codes ---
router.get('/cost-codes', requirePermission('financials', 'read'), costCodeController.getCostCodes);
router.post('/cost-codes', requirePermission('financials', 'create'), costCodeController.createCostCode);
router.put('/cost-codes/:id', requirePermission('financials', 'update'), costCodeController.updateCostCode);

export default router;
