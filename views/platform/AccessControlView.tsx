import React, { useState, useEffect } from 'react';
import { Shield, Lock, Users, CheckCircle, Settings, Loader2 } from 'lucide-react';
import { UserRole } from '@/types';
import { db } from '@/services/db';

/**
 * AccessControlView
 * Superadmin-only view for managing roles and permissions
 */
const AccessControlView: React.FC = () => {
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
    const [roles, setRoles] = useState<any[]>([]);
    const [availablePermissions, setAvailablePermissions] = useState<any[]>([]);
    const [rolePermissions, setRolePermissions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Create Role State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRole, setNewRole] = useState({ name: '', description: '' });

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [rolesData, permsData] = await Promise.all([
                    db.getRoles(),
                    db.getPermissions()
                ]);
                setRoles(rolesData);
                setAvailablePermissions(permsData);
            } catch (error) {
                console.error("Failed to load RBAC data", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedRole) {
            const loadRolePermissions = async () => {
                try {
                    const perms = await db.getRolePermissions(selectedRole);
                    setRolePermissions(perms);
                } catch (error) {
                    console.error("Failed to load role permissions", error);
                }
            };
            loadRolePermissions();
        } else {
            setRolePermissions([]);
        }
    }, [selectedRole]);

    // Group permissions by resource for the matrix
    const groupedPermissions = Object.values(
        availablePermissions.reduce((acc: any, perm: any) => {
            if (!acc[perm.resource]) {
                acc[perm.resource] = { category: perm.resource, actions: new Set() };
            }
            acc[perm.resource].actions.add(perm.action);
            return acc;
        }, {})
    ).map((group: any) => ({
        category: group.category,
        actions: Array.from(group.actions).sort() as string[]
    }));

    // Unique actions across all permissions for table columns
    const allActions = Array.from(new Set(availablePermissions.map(p => p.action))).sort();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const handleSavePermissions = async () => {
        if (!selectedRole) return;
        try {
            const payload = rolePermissions.map(p => {
                const [resource, action] = p.split('.');
                return { id: p, resource, action };
            });

            await db.updateRolePermissions(selectedRole, payload);
            alert('Permissions saved successfully');
        } catch (error) {
            console.error('Failed to save permissions', error);
            alert('Failed to save changes');
        }
    };

    const handleCreateRole = async () => {
        if (!newRole.name) return;
        try {
            await db.createRole({ ...newRole, permissions: [] });
            setShowCreateModal(false);
            setNewRole({ name: '', description: '' });
            // Refresh roles
            const updatedRoles = await db.getRoles();
            setRoles(updatedRoles);
            alert('Role created successfully');
        } catch (error) {
            console.error('Failed to create role', error);
            alert('Failed to create role');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                        Access Control
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                        Manage roles, permissions, and access levels
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 rounded-lg transition-colors"
                    >
                        <Settings className="w-5 h-5" />
                        Manage Custom Roles
                    </button>
                    <button
                        onClick={handleSavePermissions}
                        disabled={!selectedRole}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Shield className="w-5 h-5" />
                        Save Changes
                    </button>
                </div>
            </div>

            {/* Role Hierarchy */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    System Roles
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {roles.map((roleInfo) => (
                        <button
                            key={roleInfo.id}
                            onClick={() => setSelectedRole(roleInfo.id)}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${selectedRole === roleInfo.id
                                ? `border-blue-500 bg-blue-50 dark:bg-blue-900/20`
                                : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-2xl font-bold text-blue-600`}>
                                    L{roleInfo.level || 0}
                                </span>
                                <Users className="w-5 h-5 text-zinc-400" />
                            </div>
                            <h3 className="font-bold text-zinc-900 dark:text-white mb-1">
                                {roleInfo.name}
                            </h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 line-clamp-2">
                                {roleInfo.description}
                            </p>
                            <p className="text-xs text-zinc-500">
                                {roleInfo.users || 0} users
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Permission Matrix */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Permission Matrix
                    {selectedRole && (
                        <span className="ml-2 px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                            {roles.find(r => r.id === selectedRole)?.name}
                        </span>
                    )}
                </h2>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                    Resource
                                </th>
                                {allActions.map((action) => (
                                    <th
                                        key={action}
                                        className="px-4 py-3 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"
                                    >
                                        {action}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                            {groupedPermissions.map((resource) => (
                                <tr key={resource.category} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white capitalize">
                                        {resource.category}
                                    </td>
                                    {allActions.map((action) => {
                                        const permissionName = `${resource.category}.${action}`;
                                        const isAvailable = resource.actions.includes(action);
                                        const hasPerm = selectedRole && rolePermissions.includes(permissionName);

                                        return (
                                            <td key={action} className="px-4 py-3 text-center cursor-pointer"
                                                onClick={() => {
                                                    if (!isAvailable || !selectedRole) return;
                                                    setRolePermissions(prev =>
                                                        prev.includes(permissionName)
                                                            ? prev.filter(p => p !== permissionName)
                                                            : [...prev, permissionName]
                                                    );
                                                }}
                                            >
                                                {!isAvailable ? (
                                                    <div className="w-5 h-5 mx-auto bg-zinc-100 dark:bg-zinc-800/50 rounded-full opacity-20" />
                                                ) : selectedRole ? (
                                                    hasPerm ? (
                                                        <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                                                    ) : (
                                                        <div className="w-5 h-5 border-2 border-zinc-300 dark:border-zinc-600 rounded-full mx-auto" />
                                                    )
                                                ) : (
                                                    <div className="w-5 h-5 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto" />
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {!selectedRole && (
                    <p className="text-center text-zinc-500 mt-4 italic">
                        Select a role above to view its technical permissions
                    </p>
                )}
            </div>

            {/* Role Details */}
            {selectedRole && (
                <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Role Configuration
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-medium text-zinc-900 dark:text-white mb-2 underline decoration-blue-500 underline-offset-4">
                                Role Information
                            </h3>
                            <dl className="space-y-4 pt-2">
                                <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-700 pb-2">
                                    <dt className="text-sm text-zinc-600 dark:text-zinc-400">Display Name</dt>
                                    <dd className="font-bold text-zinc-900 dark:text-white">
                                        {roles.find(r => r.id === selectedRole)?.name}
                                    </dd>
                                </div>
                                <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-700 pb-2">
                                    <dt className="text-sm text-zinc-600 dark:text-zinc-400">Technical Identifier</dt>
                                    <dd className="font-mono text-xs bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded">
                                        {selectedRole}
                                    </dd>
                                </div>
                                <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-700 pb-2">
                                    <dt className="text-sm text-zinc-600 dark:text-zinc-400">Hierarchy Level</dt>
                                    <dd className="font-bold text-blue-600">
                                        L{roles.find(r => r.id === selectedRole)?.level}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                        <div>
                            <h3 className="font-medium text-zinc-900 dark:text-white mb-2 underline decoration-blue-500 underline-offset-4">
                                Description & Purpose
                            </h3>
                            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed pt-2">
                                {roles.find(r => r.id === selectedRole)?.description}
                            </p>
                            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg">
                                <p className="text-xs text-amber-800 dark:text-amber-300">
                                    <strong>Note:</strong> Permissions are strictly inherited from the database schema. Manual overrides at the user level will supersede these defaults.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Role Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Create New Role</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Role Name
                                </label>
                                <input
                                    type="text"
                                    value={newRole.name}
                                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                                    placeholder="e.g. Auditor"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={newRole.description}
                                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white h-24 resize-none"
                                    placeholder="Describe the role's purpose..."
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateRole}
                                disabled={!newRole.name}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Create Role
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccessControlView;
