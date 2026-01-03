import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/services/db';
import { Project, Task, TeamMember, Transaction } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

// Query Keys
export const queryKeys = {
    projects: ['projects'] as const,
    project: (id: string) => ['projects', id] as const,
    tasks: ['tasks'] as const,
    task: (id: string) => ['tasks', id] as const,
    teamMembers: ['teamMembers'] as const,
    transactions: ['transactions'] as const,
    companies: ['companies'] as const,
};

// Projects Hooks
export const useProjects = () => {
    const { token } = useAuth();
    return useQuery({
        queryKey: queryKeys.projects,
        queryFn: async () => {
            const response = await db.getProjects();
            return response as Project[];
        },
        enabled: !!token,
    });
};

export const useProject = (id: string | null) => {
    const { token } = useAuth();
    return useQuery({
        queryKey: queryKeys.project(id || ''),
        queryFn: async () => {
            if (!id) return null;
            // Get project from projects list since db.getProject doesn't exist
            const projects = await db.getProjects();
            return (projects as Project[]).find(p => p.id === id) || null;
        },
        enabled: !!token && !!id,
    });
};

// Tasks Hooks
export const useTasks = () => {
    const { token } = useAuth();
    return useQuery({
        queryKey: queryKeys.tasks,
        queryFn: async () => {
            const response = await db.getTasks();
            return response as Task[];
        },
        enabled: !!token,
    });
};

// Team Members Hooks
export const useTeamMembers = () => {
    const { token } = useAuth();
    return useQuery({
        queryKey: queryKeys.teamMembers,
        queryFn: async () => {
            const response = await db.getTeam();
            return response as TeamMember[];
        },
        enabled: !!token,
    });
};

// Transactions Hooks
export const useTransactions = () => {
    const { token } = useAuth();
    return useQuery({
        queryKey: queryKeys.transactions,
        queryFn: async () => {
            const response = await db.getTransactions();
            return response as Transaction[];
        },
        enabled: !!token,
    });
};

// Mutation Hooks
export const useCreateProject = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (project: Omit<Project, 'id'> & { id?: string }) => {
            return await db.addProject(project as any);
        },
        onSuccess: () => {
            // Invalidate and refetch projects
            queryClient.invalidateQueries({ queryKey: queryKeys.projects });
        },
    });
};

export const useUpdateProject = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<Project> }) => {
            return await db.updateProject(id, updates);
        },
        onSuccess: (_, variables) => {
            // Invalidate specific project and projects list
            queryClient.invalidateQueries({ queryKey: queryKeys.project(variables.id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.projects });
        },
    });
};

export const useCreateTask = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (task: Omit<Task, 'id'> & { id?: string }) => {
            return await db.addTask(task as any);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
        },
    });
};

export const useCreateTransaction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (transaction: Omit<Transaction, 'id'> & { id?: string }) => {
            return await db.addTransaction(transaction as any);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
        },
    });
};
