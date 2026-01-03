import React from 'react';
import { CommentSection } from './collaboration/CommentSection';

interface CommentsProps {
    entityType: 'task' | 'rfi' | 'daily_log' | 'document' | 'project';
    entityId: string;
    onCommentAdded?: () => void;
}

export const Comments: React.FC<CommentsProps> = (props) => {
    return <CommentSection {...props} />;
};
