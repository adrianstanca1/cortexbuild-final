import React from 'react';

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    className?: string;
    count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = '1rem',
    className = '',
    count = 1
}) => {
    const skeletons = Array.from({ length: count }, (_, i) => i);

    return (
        <>
            {skeletons.map((_, index) => (
                <div
                    key={index}
                    className={`animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded ${className}`}
                    style={{
                        width: typeof width === 'number' ? `${width}px` : width,
                        height: typeof height === 'number' ? `${height}px` : height,
                        marginBottom: count > 1 && index < count - 1 ? '0.5rem' : '0'
                    }}
                />
            ))}
        </>
    );
};

// Preset skeleton components
export const SkeletonCard: React.FC = () => (
    <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 shadow-sm">
        <Skeleton height={24} width="60%" className="mb-4" />
        <Skeleton height={16} count={3} />
    </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
    <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
            <Skeleton height={20} width="30%" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="p-4 border-b border-zinc-200 dark:border-zinc-700 last:border-b-0 flex gap-4">
                <Skeleton width={40} height={40} className="rounded-full flex-shrink-0" />
                <div className="flex-1">
                    <Skeleton height={16} width="40%" className="mb-2" />
                    <Skeleton height={14} width="60%" />
                </div>
            </div>
        ))}
    </div>
);

export const SkeletonChart: React.FC = () => (
    <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 shadow-sm">
        <Skeleton height={24} width="40%" className="mb-6" />
        <div className="flex items-end gap-2 h-48">
            {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton
                    key={i}
                    width="100%"
                    height={(i * 37) % 150 + 50}
                    className="flex-1"
                />
            ))}
        </div>
    </div>
);
