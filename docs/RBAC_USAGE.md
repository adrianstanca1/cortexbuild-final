# RBAC Frontend Usage Examples

Quick reference guide for using the multi-tenant RBAC system in the frontend.

---

## 🎯 Permission Hooks

### usePermissions Hook

```typescript
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent() {
  const { can, canAny, canAll, cannot } = usePermissions();

  // Check single permission
  if (can('projects.create')) {
    // User can create projects
  }

  // Check multiple permissions (ANY)
  if (canAny(['projects.update', 'projects.delete'])) {
    // User can update OR delete projects
  }

  // Check multiple permissions (ALL)
  if (canAll(['finance.read', 'finance.export'])) {
    // User can read AND export finance data
  }

  // Check if user cannot do something
  if (cannot('team.delete')) {
    // User cannot delete team members
  }
}
```

### useRoleCheck Hook

```typescript
import { useRoleCheck, UserRole } from '@/hooks/useRoleCheck';

function MyComponent() {
  const { userRole, isRole, isAtLeast, isSuperadmin } = useRoleCheck();

  // Check specific role
  if (isRole(UserRole.PROJECT_MANAGER)) {
    // User is a project manager
  }

  // Check minimum role level
  if (isAtLeast(UserRole.SUPERVISOR)) {
    // User is supervisor or higher
  }

  // Check if superadmin
  if (isSuperadmin) {
    // User is superadmin
  }

  // Display current role
  console.log('Current role:', userRole);
}
```

---

## 🛡️ Protected Components

### ProtectedRoute Component

```typescript
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { UserRole } from '@/hooks/useRoleCheck';

// Protect by permission
<ProtectedRoute permission="projects.create">
  <CreateProjectPage />
</ProtectedRoute>

// Protect by role
<ProtectedRoute minRole={UserRole.PROJECT_MANAGER}>
  <ProjectManagementPage />
</ProtectedRoute>

// Protect by multiple permissions (ALL required)
<ProtectedRoute permissions={['finance.read', 'finance.export']}>
  <FinanceExportPage />
</ProtectedRoute>

// Protect by multiple permissions (ANY required)
<ProtectedRoute anyPermission={['projects.update', 'projects.delete']}>
  <ProjectActionsPage />
</ProtectedRoute>

// Superadmin only
<ProtectedRoute requireSuperadmin>
  <SuperadminDashboard />
</ProtectedRoute>

// Custom fallback
<ProtectedRoute 
  permission="team.manage"
  fallback={<AccessDeniedMessage />}
>
  <TeamManagementPage />
</ProtectedRoute>
```

### Can Component

```typescript
import { Can, Cannot } from '@/components/Can';
import { UserRole } from '@/hooks/useRoleCheck';

// Show button only if user has permission
<Can permission="projects.create">
  <button onClick={createProject}>Create Project</button>
</Can>

// Show content based on role
<Can minRole={UserRole.FINANCE}>
  <FinancialSummary />
</Can>

// Show different content based on permission
<Can 
  permission="projects.edit"
  fallback={<ReadOnlyProjectView />}
>
  <EditableProjectView />
</Can>

// Multiple permissions (ALL required)
<Can permissions={['finance.read', 'finance.approve']}>
  <ApproveInvoiceButton />
</Can>

// Multiple permissions (ANY required)
<Can anyPermission={['projects.update', 'projects.delete']}>
  <ProjectActionsMenu />
</Can>

// Inverse - show only if user LACKS permission
<Cannot permission="team.delete">
  <p>You don't have permission to delete team members</p>
</Cannot>
```

---

## 🎨 UI Patterns

### Conditional Button Rendering

```typescript
import { Can } from '@/components/Can';

function ProjectCard({ project }) {
  return (
    <div className="project-card">
      <h3>{project.name}</h3>
      
      <div className="actions">
        <Can permission="projects.read">
          <button onClick={() => viewProject(project.id)}>View</button>
        </Can>
        
        <Can permission="projects.update">
          <button onClick={() => editProject(project.id)}>Edit</button>
        </Can>
        
        <Can permission="projects.delete">
          <button onClick={() => deleteProject(project.id)}>Delete</button>
        </Can>
      </div>
    </div>
  );
}
```

### Role-Based Navigation

```typescript
import { Can } from '@/components/Can';
import { UserRole } from '@/hooks/useRoleCheck';

function Sidebar() {
  return (
    <nav>
      <Can permission="projects.read">
        <NavLink to="/projects">Projects</NavLink>
      </Can>
      
      <Can permission="tasks.read">
        <NavLink to="/tasks">Tasks</NavLink>
      </Can>
      
      <Can minRole={UserRole.FINANCE}>
        <NavLink to="/financials">Financials</NavLink>
      </Can>
      
      <Can minRole={UserRole.COMPANY_ADMIN}>
        <NavLink to="/settings">Settings</NavLink>
      </Can>
      
      <Can requireSuperadmin>
        <NavLink to="/superadmin">Platform Admin</NavLink>
      </Can>
    </nav>
  );
}
```

### Dynamic Form Fields

```typescript
import { usePermissions } from '@/hooks/usePermissions';

function ProjectForm() {
  const { can } = usePermissions();

  return (
    <form>
      <input name="name" placeholder="Project Name" />
      <input name="description" placeholder="Description" />
      
      {can('projects.budget') && (
        <input name="budget" type="number" placeholder="Budget" />
      )}
      
      {can('projects.assign') && (
        <select name="manager">
          <option>Select Manager</option>
          {/* ... */}
        </select>
      )}
      
      <button type="submit">
        {can('projects.create') ? 'Create Project' : 'Request Project'}
      </button>
    </form>
  );
}
```

### Conditional Table Columns

```typescript
import { usePermissions } from '@/hooks/usePermissions';

function ProjectsTable({ projects }) {
  const { can } = usePermissions();

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Status</th>
          {can('finance.read') && <th>Budget</th>}
          {can('finance.read') && <th>Spent</th>}
          {can('projects.update') && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {projects.map(project => (
          <tr key={project.id}>
            <td>{project.name}</td>
            <td>{project.status}</td>
            {can('finance.read') && <td>{project.budget}</td>}
            {can('finance.read') && <td>{project.spent}</td>}
            {can('projects.update') && (
              <td>
                <button onClick={() => edit(project.id)}>Edit</button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## 🔒 Route Protection in App.tsx

```typescript
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { UserRole } from '@/hooks/useRoleCheck';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute permission="projects.read">
          <DashboardView />
        </ProtectedRoute>
      } />
      
      <Route path="/projects" element={
        <ProtectedRoute permission="projects.read">
          <ProjectsView />
        </ProtectedRoute>
      } />
      
      <Route path="/financials" element={
        <ProtectedRoute minRole={UserRole.FINANCE}>
          <FinancialsView />
        </ProtectedRoute>
      } />
      
      <Route path="/settings" element={
        <ProtectedRoute minRole={UserRole.COMPANY_ADMIN}>
          <SettingsView />
        </ProtectedRoute>
      } />
      
      <Route path="/superadmin/*" element={
        <ProtectedRoute requireSuperadmin>
          <SuperadminRoutes />
        </ProtectedRoute>
      } />
      
      {/* Fallback */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
    </Routes>
  );
}
```

---

## 📝 Permission Naming Convention

Follow this pattern: `resource.action`

**Resources**: projects, tasks, finance, team, documents, reports, settings, platform

**Actions**: create, read, update, delete, export, approve, assign, roles

**Examples**:
- `projects.create` - Create new projects
- `tasks.assign` - Assign tasks to team members
- `finance.approve` - Approve invoices and expenses
- `team.roles` - Manage team member roles
- `platform.companies` - Manage all companies (Superadmin)

---

## 🎯 Best Practices

1. **Use Can for UI elements** - Buttons, links, menu items
2. **Use ProtectedRoute for pages** - Entire views and routes
3. **Check permissions early** - Fail fast and show appropriate fallbacks
4. **Combine with loading states** - Show skeleton while checking permissions
5. **Provide clear feedback** - Tell users why they can't access something
6. **Test all role levels** - Ensure each role sees the correct UI

---

**Status**: ✅ Frontend RBAC components ready for use!
