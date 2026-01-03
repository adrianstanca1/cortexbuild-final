import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, X, Loader2 } from 'lucide-react';
import { db } from '@/services/db';
import { useAuth } from '@/contexts/AuthContext';
import { MentionInput } from './MentionInput';
import { CommentList } from './CommentList';

interface Comment {
    id: string;
    user_name: string;
    content: string;
    created_at: string;
    updated_at?: string;
    mentions?: string[];
}

interface CommentSectionProps {
    entityType: 'task' | 'rfi' | 'daily_log' | 'document' | 'project';
    entityId: string;
    onCommentAdded?: () => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ entityType, entityId, onCommentAdded }) => {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadComments();
    }, [entityType, entityId]);

    const loadComments = async () => {
        setLoading(true);
        try {
            const data = await db.getComments(entityType, entityId);
            setComments(data);
        } catch (error) {
            console.error('Failed to load comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const extractMentions = (text: string): string[] => {
        const mentionRegex = /@(\w+)/g;
        const matches = text.match(mentionRegex);
        return matches ? matches.map(m => m.substring(1)) : [];
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const mentions = extractMentions(newComment);
            await db.addComment({
                entityType,
                entityId,
                content: newComment,
                mentions,
            });

            setNewComment('');
            await loadComments();
            onCommentAdded?.();
        } catch (error) {
            console.error('Failed to add comment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditSave = async () => {
        if (!editContent.trim() || !editingId) return;

        try {
            await db.updateComment(editingId, editContent);
            setEditingId(null);
            setEditContent('');
            await loadComments();
        } catch (error) {
            console.error('Failed to update comment:', error);
        }
    };

    const handleDelete = async (commentId: string) => {
        if (!confirm('Are you sure you want to delete this comment?')) return;

        try {
            await db.deleteComment(commentId);
            await loadComments();
        } catch (error) {
            console.error('Failed to delete comment:', error);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <MessageCircle size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-900">Discussion</h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{comments.length} Comments</p>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 min-h-0 mb-6">
                {loading && comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-2 opacity-50" />
                        <p className="text-sm">Loading comments...</p>
                    </div>
                ) : (
                    <CommentList
                        comments={comments}
                        formatDate={formatDate}
                        onDelete={handleDelete}
                        onEdit={(id, content) => {
                            setEditingId(id);
                            setEditContent(content);
                        }}
                    />
                )}
            </div>

            {/* Edit Modal (simple overlay for now) */}
            {editingId && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-zinc-200 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-zinc-900">Edit Comment</h4>
                            <button onClick={() => setEditingId(null)} className="p-1 hover:bg-zinc-100 rounded-full text-zinc-500"><X size={20} /></button>
                        </div>
                        <MentionInput
                            value={editContent}
                            onChange={setEditContent}
                            className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none mb-4"
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setEditingId(null)} className="px-4 py-2 text-zinc-600 font-bold text-sm">Cancel</button>
                            <button
                                onClick={handleEditSave}
                                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-900/10 transition-all"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Form */}
            <form onSubmit={handleSubmit} className="relative group">
                <MentionInput
                    value={newComment}
                    onChange={setNewComment}
                    placeholder="Write a comment... use @ to mention"
                    disabled={isSubmitting}
                    className="w-full p-4 pr-16 bg-white border border-zinc-200 rounded-2xl text-sm text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none shadow-sm transition-all group-focus-within:shadow-md"
                />
                <button
                    type="submit"
                    disabled={isSubmitting || !newComment.trim()}
                    className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:bg-zinc-400 transition-all shadow-lg shadow-blue-900/20"
                >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
            </form>
        </div>
    );
};
