import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    secondaryActionLabel,
    onSecondaryAction,
}) => {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-500">
            <div className="mb-6 p-6 bg-gradient-to-br from-zinc-50 to-zinc-100 rounded-full">
                <Icon size={48} className="text-zinc-400" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">{title}</h3>
            <p className="text-zinc-500 max-w-md mb-8 leading-relaxed">{description}</p>
            {(actionLabel || secondaryActionLabel) && (
                <div className="flex items-center gap-3">
                    {actionLabel && onAction && (
                        <button
                            onClick={onAction}
                            className="px-6 py-3 bg-[#0f5c82] text-white rounded-xl font-semibold hover:bg-[#0c4a6e] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-200"
                        >
                            {actionLabel}
                        </button>
                    )}
                    {secondaryActionLabel && onSecondaryAction && (
                        <button
                            onClick={onSecondaryAction}
                            className="px-6 py-3 bg-white border-2 border-zinc-200 text-zinc-700 rounded-xl font-semibold hover:border-zinc-300 hover:bg-zinc-50 transition-all"
                        >
                            {secondaryActionLabel}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default EmptyState;
