import React from 'react';
import { Modal } from './Modal';
import { useProjects } from '@/contexts/ProjectContext';
import { Project } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { Building, MapPin, User, Calendar, DollarSign, FileText } from 'lucide-react';

interface AddProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({ isOpen, onClose }) => {
    const { addProject } = useProjects();
    const { addToast } = useToast();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const newProject: Project = {
            id: `proj-${Date.now()}`,
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            status: 'Planning',
            location: formData.get('location') as string,
            manager: formData.get('manager') as string,
            progress: 0,
            startDate: formData.get('startDate') as string,
            endDate: formData.get('endDate') as string,
            budget: parseFloat(formData.get('budget') as string),
            health: 'Good',
            companyId: 'c1', // Default
            code: 'P-' + Math.floor(Math.random() * 1000),
            type: 'Commercial',
            spent: 0,
            teamSize: 0,
            tasks: { total: 0, completed: 0, overdue: 0 },
            image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=1000' // Default placeholder
        };

        try {
            await addProject(newProject);
            addToast("Project created successfully", "success");
            onClose();
        } catch (error) {
            console.error("Failed to create project", error);
            addToast("Failed to create project", "error");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Start New Project" size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">Project Name</label>
                    <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input name="name" required placeholder="e.g. Skyline Tower Phase 2" className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-[#0f5c82] outline-none" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">Description</label>
                    <div className="relative">
                        <FileText className="absolute left-3 top-3 text-zinc-400" size={16} />
                        <textarea name="description" rows={3} placeholder="Brief details about the project scope..." className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-[#0f5c82] outline-none resize-none"></textarea>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-1">Location</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                            <input name="location" required placeholder="City, Country" className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-[#0f5c82] outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-1">Project Manager</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                            <input name="manager" required placeholder="Full Name" className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-[#0f5c82] outline-none" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-1">Start Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                            <input type="date" name="startDate" required className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-[#0f5c82] outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-1">End Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                            <input type="date" name="endDate" required className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-[#0f5c82] outline-none" />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">Estimated Budget</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">£</span>
                        <input type="number" name="budget" required placeholder="0.00" className="w-full pl-8 pr-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-[#0f5c82] outline-none font-mono" />
                    </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-zinc-300 text-zinc-700 font-bold rounded-lg hover:bg-zinc-50">Cancel</button>
                    <button type="submit" className="flex-1 py-2.5 bg-[#0f5c82] text-white font-bold rounded-lg hover:bg-[#0c4a6e] shadow-lg">Create Project</button>
                </div>
            </form>
        </Modal>
    );
};
