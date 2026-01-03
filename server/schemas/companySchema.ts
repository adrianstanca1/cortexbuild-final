import { z } from 'zod';

export const companySchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1, 'Company name is required'),
    plan: z.string().default('Free Beta'),
    status: z.enum(['Active', 'Inactive', 'Suspended']).default('Active'),
    users: z.number().int().nonnegative().optional().default(0),
    projects: z.number().int().nonnegative().optional().default(0),
    mrr: z.number().nonnegative().optional().default(0),
    joinedDate: z.string().optional(),
    description: z.string().optional(),
    logo: z.string().url().optional().or(z.literal('')),
    website: z.string().url().optional().or(z.literal('')),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
    settings: z.any().optional(), // JSON
    subscription: z.any().optional(), // JSON
    features: z.array(z.string()).optional(), // JSON array
    maxUsers: z.number().int().positive().optional().default(1000),
    maxProjects: z.number().int().positive().optional().default(1000)
});

export const updateCompanySchema = companySchema.partial();
