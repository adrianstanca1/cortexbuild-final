import { z } from 'zod';

export const projectSchema = z.object({
    id: z.string().uuid().optional(),
    companyId: z.string().uuid().optional(), // Often set by middleware reference
    name: z.string().min(1, 'Project name is required'),
    code: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    type: z.string().optional(),
    status: z.enum(['Active', 'Completed', 'On Hold', 'Planning']).default('Planning'),
    health: z.enum(['Good', 'At Risk', 'Critical']).default('Good'),
    progress: z.number().min(0).max(100).default(0),
    budget: z.number().nonnegative().default(0),
    spent: z.number().nonnegative().default(0),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    manager: z.string().optional(),
    image: z.string().url().optional().or(z.literal('')),
    teamSize: z.number().int().nonnegative().default(0),
    weatherLocation: z.any().optional(),
    aiAnalysis: z.string().optional(),
    zones: z.any().optional(),
    phases: z.any().optional(),
    timelineOptimizations: z.any().optional()
});

export const updateProjectSchema = projectSchema.partial();
