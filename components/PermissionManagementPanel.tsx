import React, { useState, useEffect } from 'react';
import { Shield, User, Lock, Unlock, Check, X } from 'lucide-react';

interface Permission {
    id: string;
    role: string;
    resource: string;
    action: string;
    scope: string;
    effect: string;
}

interface PermissionManagementPanelProps {
    companyId?: string;
    userId?: string;
    onSave?: () => void;
}

const ROLES = ['SUPERADMIN', 'SUPPORT_ADMIN', 'COMPANY_OWNER', 'COMPANY_ADMIN', 'MANAGER', 'USER', 'AUDITOR'];
const SCOPES = ['SYSTEM', 'TENANT', 'RESOURCE'];
const EFFECTS = ['ALLOW', 'DENY'];

export default function PermissionManagementPanel({ companyId, userId, onSave }: PermissionManagementPanelProps) {
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [groupBy, setGroupBy] = useState<'resource' | 'action'>('resource');

    useEffect(() => {
        fetchPermissions();
    }, [selectedRole]);

    const fetchPermissions = async () => {
        setLoading(true);
        try {
            const url = selectedRole
                ? `/api/permissions/roles/${selectedRole}`
                : `/api/permissions`;

            const response = await fetch(url, { credentials: 'include' });

            if (response.ok) {
                const data = await response.json();
                setPermissions(data.permissions || []);
            }
        } catch (error) {
            console.error('Failed to fetch permissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const groupedPermissions = permissions.reduce((acc, perm) => {
        const key = groupBy === 'resource' ? perm.resource : perm.action;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

    return (
        <div className="bg-white rounded-lg border border-gray-200">
            {/* Header */}
            <div className="p-6 border-b">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Shield className="w-6 h-6 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Permission Management</h3>
                    </div>
                </div>
                <p className="text-sm text-gray-600">
                    Manage role-based access control policies
                </p>
            </div>

            {/* Filters */}
            <div className="p-4 border-b bg-gray-50 flex items-center gap-4">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        Filter by Role
                    </label>
                    <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Roles</option>
                        {ROLES.map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        Group By
                    </label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setGroupBy('resource')}
                            className={`px-3 py-2 rounded-lg text-sm font-medium ${groupBy === 'resource'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            Resource
                        </button>
                        <button
                            onClick={() => setGroupBy('action')}
                            className={`px-3 py-2 rounded-lg text-sm font-medium ${groupBy === 'action'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            Action
                        </button>
                    </div>
                </div>
            </div>

            {/* Permissions List */}
            {loading ? (
                <div className="p-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
            ) : (
                <div className="divide-y max-h-[600px] overflow-y-auto">
                    {Object.entries(groupedPermissions).map(([group, perms]) => (
                        <div key={group} className="p-4">
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                {group}
                            </h4>
                            <div className="space-y-2">
                                {perms.map((perm) => (
                                    <div
                                        key={perm.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${perm.effect === 'ALLOW'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                }`}>
                                                {perm.effect === 'ALLOW' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                {perm.effect}
                                            </span>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm text-gray-900">
                                                        {perm.action}
                                                    </span>
                                                    <span className="text-xs text-gray-500">on</span>
                                                    <span className="font-medium text-sm text-gray-900">
                                                        {perm.resource}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                                        {perm.scope}
                                                    </span>
                                                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {perm.role}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {Object.keys(groupedPermissions).length === 0 && (
                        <div className="p-12 text-center">
                            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-500">No permissions found</p>
                        </div>
                    )}
                </div>
            )}

            {/* Stats Footer */}
            <div className="p-4 border-t bg-gray-50">
                <p className="text-sm text-gray-600">
                    Showing <span className="font-medium">{permissions.length}</span> permission policies
                    {selectedRole && <span> for role <span className="font-medium">{selectedRole}</span></span>}
                </p>
            </div>
        </div>
    );
}
