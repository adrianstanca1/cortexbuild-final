import { z } from 'zod';

// Task validation schemas
export const createTaskSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().optional(),
    projectId: z.string().uuid('Invalid project ID'),
    assigneeId: z.string().uuid('Invalid assignee ID').optional(),
    assigneeName: z.string().optional(),
    assigneeType: z.enum(['user', 'role']),
    status: z.enum(['To Do', 'In Progress', 'Done', 'Blocked']),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
    dueDate: z.string().datetime('Invalid date format'),
    startDate: z.string().datetime('Invalid date format').optional(),
    duration: z.number().int().min(1).optional(),
    dependencies: z.array(z.string().uuid()).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

// Project validation schemas
export const createProjectSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.enum(['Planning', 'Active', 'On Hold', 'Completed', 'Archived']),
    managerName: z.string().optional(),
    budget: z.number().positive().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

// RFI validation schemas
export const createRFISchema = z.object({
    subject: z.string().min(1).max(200),
    description: z.string().min(1),
    projectId: z.string().uuid(),
    assignedTo: z.string().uuid().optional(),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
    status: z.enum(['Draft', 'Open', 'In Progress', 'Closed']).optional(),
    dueDate: z.string().datetime().optional(),
});

export const updateRFISchema = createRFISchema.partial();

// Daily Log validation schemas
export const createDailyLogSchema = z.object({
    projectId: z.string().uuid(),
    date: z.string().datetime(),
    weather: z.string().optional(),
    temperature: z.number().optional(),
    workPerformed: z.string().min(1),
    manpower: z.number().int().min(0).optional(),
    equipment: z.string().optional(),
    materials: z.string().optional(),
    visitors: z.string().optional(),
    delays: z.string().optional(),
    safetyIssues: z.string().optional(),
    notes: z.string().optional(),
    attachments: z.array(z.string()).optional(),
    signature: z.string().optional(),
    signedBy: z.string().optional(),
});

export const updateDailyLogSchema = createDailyLogSchema.partial();

// Safety validation schemas
export const createSafetyIncidentSchema = z.object({
    projectId: z.string().uuid(),
    type: z.enum(['Near Miss', 'First Aid', 'Medical Treatment', 'Lost Time', 'Fatality']),
    severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
    description: z.string().min(1),
    location: z.string().optional(),
    reportedBy: z.string().optional(),
    date: z.string().datetime(),
    personsInvolved: z.string().optional(),
    witnessNames: z.string().optional(),
    actionsTaken: z.string().optional(),
    rootCause: z.string().optional(),
    preventiveMeasures: z.string().optional(),
});

export const createSafetyHazardSchema = z.object({
    projectId: z.string().uuid(),
    type: z.string().min(1),
    severity: z.string().min(1),
    riskScore: z.number().int().min(1).max(25).optional(),
    description: z.string().min(1),
    recommendation: z.string().optional(),
    regulation: z.string().optional(),
    box2d: z.string().optional(), // JSON string
});

// Comment validation schema (for Phase 9B)
export const createCommentSchema = z.object({
    entityType: z.enum(['task', 'rfi', 'daily_log', 'document', 'project']),
    entityId: z.string().uuid(),
    content: z.string().min(1).max(5000),
    parentId: z.string().uuid().optional(),
    mentions: z.array(z.string().uuid()).optional(),
    attachments: z.array(z.string()).optional(),
});

// User validation schemas
export const createUserSchema = z.object({
    email: z.string().email('Invalid email address'),
    name: z.string().min(1).max(200),
    role: z.enum(['superadmin', 'company_admin', 'project_manager', 'team_member', 'client', 'subcontractor']),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    phone: z.string().optional(),
    title: z.string().optional(),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

// Vendor validation schema
export const createVendorSchema = z.object({
    name: z.string().min(1).max(200),
    type: z.string().min(1),
    contactName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    rating: z.number().min(1).max(5).optional(),
    specialties: z.array(z.string()).optional(),
});

export const updateVendorSchema = createVendorSchema.partial();

// Cost Code validation schema
export const createCostCodeSchema = z.object({
    code: z.string().min(1).max(50),
    description: z.string().min(1).max(200),
    category: z.string().optional(),
    budget: z.number().min(0).optional(),
});

export const updateCostCodeSchema = createCostCodeSchema.partial();
