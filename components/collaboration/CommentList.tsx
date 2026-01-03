import React from 'react';
import { Trash2, Edit3, MessageCircle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Comment {
    id: string;
    user_name: string;
    content: string;
    created_at: string;
    updated_at?: string;
}

interface CommentListProps {
    comments: Comment[];
    onEdit: (commentId: string, content: string) => void;
    onDelete: (commentId: string) => void;
    formatDate: (dateString: string) => string;
}

export const CommentList: React.FC<CommentListProps> = ({
    comments,
    onEdit,
    onDelete,
    formatDate
}) => {
    const { user } = useAuth();

    return (
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {comments.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">No comments yet. Start the conversation!</p>
                </div>
            ) : (
                comments.map((comment) => (
                    <div key={comment.id} className="group/comment bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex gap-3">
                            {/* Avatar */}
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#0f5c82] to-blue-400 flex items-center justify-center text-white text-sm font-bold shadow-inner">
                                {comment.user_name?.[0]?.toUpperCase() || 'U'}
                            </div>

                            {/* Comment Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <div>
                                        <span className="font-bold text-sm text-zinc-900">
                                            {comment.user_name}
                                        </span>
                                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium">
                                            <Clock size={10} />
                                            {formatDate(comment.created_at)}
                                            {comment.updated_at && comment.updated_at !== comment.created_at && (
                                                <span className="italic opacity-60">(edited)</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions (only for own comments) */}
                                    {user?.name === comment.user_name && (
                                        <div className="flex gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => onEdit(comment.id, comment.content)}
                                                className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-600 transition-colors"
                                                title="Edit comment"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onDelete(comment.id)}
                                                className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                                                title="Delete comment"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap break-words">
                                    {comment.content}
                                </p>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};
