import React, { useState, useEffect } from 'react';
import { X, Copy, Link2, Lock, Calendar, Eye, Trash2, CheckCircle, AlertCircle, Ban } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { SharedLink } from '@/types';
import { supabase } from '@/services/supabaseClient';

interface ShareProjectModalProps {
    projectId: string;
    projectName: string;
    onClose: () => void;
}

/**
 * Share Project Modal
 * Allows project managers to generate and manage share links for external client access
 */
const ShareProjectModal: React.FC<ShareProjectModalProps> = ({ projectId, projectName, onClose }) => {
    const { addToast } = useToast();
    const [activeLinks, setActiveLinks] = useState<SharedLink[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    // Form state for new link
    const [password, setPassword] = useState('');
    const [expiresIn, setExpiresIn] = useState(30); // days
    const [usePassword, setUsePassword] = useState(false);

    useEffect(() => {
        loadShareLinks();
    }, [projectId]);

    const loadShareLinks = async () => {
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token || '';

            const response = await fetch(`/api/client-portal/${projectId}/shares`, {
                headers: {
                    'x-company-id': localStorage.getItem('companyId') || '',
                    'x-user-id': localStorage.getItem('userId') || '',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setActiveLinks(data.data || []);
            }
        } catch (error) {
            console.error('Failed to load share links:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateLink = async () => {
        setIsGenerating(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token || '';

            const response = await fetch(`/api/client-portal/${projectId}/share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': localStorage.getItem('companyId') || '',
                    'x-user-id': localStorage.getItem('userId') || '',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    expiresIn,
                    password: usePassword ? password : undefined
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate share link');
            }

            const data = await response.json();

            // Copy to clipboard
            await navigator.clipboard.writeText(data.data.shareUrl);
            addToast('Share link generated and copied to clipboard!', 'success');

            // Reload links
            await loadShareLinks();

            // Reset form
            setPassword('');
            setUsePassword(false);
            setExpiresIn(30);
        } catch (error: any) {
            addToast(error.message || 'Failed to generate share link', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyLink = async (token: string) => {
        const shareUrl = `${window.location.origin}/client-portal/${token}`;
        try {
            await navigator.clipboard.writeText(shareUrl);
            addToast('Link copied to clipboard!', 'success');
        } catch (error) {
            addToast('Failed to copy link', 'error');
        }
    };

    const handleRevokeLink = async (linkId: string) => {
        if (!confirm('Are you sure you want to revoke this share link? It will no longer be accessible.')) {
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token || '';

            const response = await fetch(`/api/client-portal/shares/${linkId}`, {
                method: 'DELETE',
                headers: {
                    'x-company-id': localStorage.getItem('companyId') || '',
                    'x-user-id': localStorage.getItem('userId') || '',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to revoke share link');
            }

            addToast('Share link revoked successfully', 'success');
            await loadShareLinks();
        } catch (error: any) {
            addToast(error.message || 'Failed to revoke link', 'error');
        }
    };

    const isExpired = (expiresAt: string) => {
        return new Date(expiresAt) < new Date();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-zinc-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900">Share Project</h2>
                        <p className="text-zinc-500 text-sm mt-1">Generate secure links for external client access to {projectName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                    >
                        <X size={24} className="text-zinc-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Generate New Link Section */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                        <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
                            <Link2 size={20} className="text-blue-600" />
                            Generate New Share Link
                        </h3>

                        <div className="space-y-4">
                            {/* Expiration */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-2">
                                    Link Expiration
                                </label>
                                <select
                                    value={expiresIn}
                                    onChange={(e) => setExpiresIn(Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value={7}>7 days</option>
                                    <option value={14}>14 days</option>
                                    <option value={30}>30 days</option>
                                    <option value={60}>60 days</option>
                                    <option value={90}>90 days</option>
                                </select>
                            </div>

                            {/* Password Protection */}
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={usePassword}
                                        onChange={(e) => setUsePassword(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-zinc-700">
                                        Password protect this link
                                    </span>
                                </label>

                                {usePassword && (
                                    <input
                                        type="text"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter password"
                                        className="w-full mt-2 px-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                )}
                            </div>

                            <button
                                onClick={handleGenerateLink}
                                disabled={isGenerating || (usePassword && !password)}
                                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Link2 size={18} />
                                        Generate & Copy Link
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Active Links Section */}
                    <div>
                        <h3 className="font-bold text-zinc-900 mb-4 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Eye size={20} className="text-zinc-600" />
                                Active Share Links ({activeLinks.filter(l => l.isActive && !isExpired(l.expiresAt)).length})
                            </span>
                        </h3>

                        {isLoading ? (
                            <div className="text-center py-8 text-zinc-500">
                                Loading share links...
                            </div>
                        ) : activeLinks.length === 0 ? (
                            <div className="text-center py-8 text-zinc-500 bg-zinc-50 rounded-lg border border-zinc-200">
                                <Link2 size={48} className="mx-auto mb-2 text-zinc-300" />
                                <p>No share links generated yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {activeLinks.map(link => {
                                    const expired = isExpired(link.expiresAt);
                                    const shareUrl = `${window.location.origin}/client-portal/${link.token}`;

                                    return (
                                        <div
                                            key={link.id}
                                            className={`border rounded-lg p-4 ${expired || !link.isActive
                                                ? 'bg-zinc-50 border-zinc-200'
                                                : 'bg-white border-zinc-200 hover:border-blue-300'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    {/* URL */}
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <code className="text-xs bg-zinc-100 px-2 py-1 rounded font-mono truncate flex-1">
                                                            {shareUrl}
                                                        </code>
                                                    </div>

                                                    {/* Meta */}
                                                    <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={12} />
                                                            Expires: {new Date(link.expiresAt).toLocaleDateString()}
                                                        </span>
                                                        {link.password && (
                                                            <span className="flex items-center gap-1 text-purple-600">
                                                                <Lock size={12} />
                                                                Password protected
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-1">
                                                            <Eye size={12} />
                                                            {link.accessCount} views
                                                        </span>
                                                    </div>

                                                    {/* Status */}
                                                    {expired && (
                                                        <div className="mt-2 flex items-center gap-1 text-xs text-red-600 font-medium">
                                                            <AlertCircle size={12} />
                                                            Expired
                                                        </div>
                                                    )}
                                                    {!link.isActive && !expired && (
                                                        <div className="mt-2 flex items-center gap-1 text-xs text-zinc-500 font-medium">
                                                            <Ban size={12} />
                                                            Revoked
                                                        </div>
                                                    )}
                                                    {link.isActive && !expired && (
                                                        <div className="mt-2 flex items-center gap-1 text-xs text-green-600 font-medium">
                                                            <CheckCircle size={12} />
                                                            Active
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                {link.isActive && !expired && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleCopyLink(link.token)}
                                                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                                            title="Copy link"
                                                        >
                                                            <Copy size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleRevokeLink(link.id)}
                                                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                                            title="Revoke link"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-zinc-200 bg-zinc-50">
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                        <Lock size={16} />
                        <p>Share links provide read-only access to project overview, documents, and photos.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShareProjectModal;
