import { getDb } from './database.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './utils/logger.js';

export async function seedDatabase() {
  const db = getDb();

  const result = await db.all('SELECT count(*) as count FROM companies');
  const companyCount = result[0];

  if (companyCount && (companyCount.count > 0 || companyCount.count === '1')) { // Postgres count might be string
    logger.info('Database already seeded');
    return;
  }

  logger.info('Seeding database...');

  // --- Companies ---
  const companies = [
    {
      id: 'c1',
      name: 'BuildCorp Solutions',
      subscriptionTier: 'ENTERPRISE',
      maxProjects: 100,
      maxUsers: 50,
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ];

  for (const c of companies) {
    await db.run(
      `INSERT INTO companies (id, name, subscriptionTier, maxProjects, maxUsers, isActive, createdAt, updatedAt, plan, status, slug)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.name, c.subscriptionTier, c.maxProjects, c.maxUsers, c.isActive ? 1 : 0, c.createdAt, c.createdAt, 'ENTERPRISE', 'ACTIVE', 'buildcorp']
    );
  }

  // --- Users ---
  const users = [
    {
      id: 'demo-user',
      email: 'demo@buildpro.app',
      password: 'demo-password-hash',
      name: 'Demo User',
      role: 'admin',
      companyId: 'c1',
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'u1',
      email: 'john@buildcorp.com',
      password: 'password-hash',
      name: 'John Anderson',
      role: 'admin',
      companyId: 'c1',
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'u2',
      email: 'sarah@buildcorp.com',
      password: 'password-hash',
      name: 'Sarah Mitchell',
      role: 'admin',
      companyId: 'c1',
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ];

  for (const u of users) {
    await db.run(
      `INSERT INTO users (id, email, password, name, role, companyId, status, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.id, u.email, u.password, u.name, u.role, u.companyId, 'active', u.isActive ? 1 : 0, u.createdAt, u.createdAt]
    );
  }


  const projects = [
    {
      id: 'p1',
      companyId: 'c1',
      name: 'City Centre Plaza Development',
      code: 'CCP-2025',
      description: 'A mixed-use development featuring 40 stories of office space and a luxury retail podium.',
      location: 'Downtown Metro',
      type: 'Commercial',
      status: 'Active',
      health: 'Good',
      progress: 74,
      budget: 25000000,
      spent: 18500000,
      startDate: '2025-01-15',
      endDate: '2026-12-31',
      manager: 'John Anderson',
      image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      teamSize: 24,
      weatherLocation: JSON.stringify({ city: 'New York', temp: '72°', condition: 'Sunny' }),
      aiAnalysis: 'Project is progressing ahead of schedule. Structural steel completion is imminent.'
    },
    {
      id: 'p2',
      companyId: 'c1',
      name: 'Residential Complex - Phase 2',
      code: 'RCP-002',
      description: 'Three tower residential complex with 400 units and shared amenities.',
      location: 'Westside Heights',
      type: 'Residential',
      status: 'Active',
      health: 'At Risk',
      progress: 45,
      budget: 15000000,
      spent: 16500000,
      startDate: '2025-02-01',
      endDate: '2025-11-30',
      manager: 'Sarah Mitchell',
      image: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      teamSize: 18,
      weatherLocation: JSON.stringify({ city: 'Chicago', temp: '65°', condition: 'Windy' })
    }
  ];

  for (const p of projects) {
    await db.run(
      `INSERT INTO projects (id, companyId, name, code, description, location, type, status, health, progress, budget, spent, startDate, endDate, manager, image, teamSize, weatherLocation, aiAnalysis, zones, phases, timelineOptimizations, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.companyId, p.name, p.code, p.description, p.location, p.type, p.status, p.health, p.progress, p.budget, p.spent, p.startDate, p.endDate, p.manager, p.image, p.teamSize, p.weatherLocation, p.aiAnalysis, '[]', '[]', '[]', new Date().toISOString(), new Date().toISOString()]
    );
  }

  const tasks = [
    { id: 't1', title: 'Safety inspection - Site A', description: 'Conduct full perimeter safety check.', projectId: 'p1', companyId: 'c1', status: 'To Do', priority: 'High', assigneeId: 'u1', assigneeName: 'Mike Thompson', assigneeType: 'user', dueDate: '2025-11-12', latitude: 40.7128, longitude: -74.0060, dependencies: '[]' },
    { id: 't2', title: 'Concrete pouring - Level 2', description: 'Pour and finish slab for level 2 podium.', projectId: 'p1', companyId: 'c1', status: 'Blocked', priority: 'Critical', assigneeId: 'role-operative', assigneeName: 'All Operatives', assigneeType: 'role', dueDate: '2025-11-20', latitude: 40.7135, longitude: -74.0055, dependencies: '["t1"]' }
  ];

  for (const t of tasks) {
    await db.run(
      `INSERT INTO tasks (id, title, description, projectId, companyId, status, priority, assigneeId, dueDate, dependencies, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [t.id, t.title, t.description, t.projectId, t.companyId, t.status, t.priority, t.assigneeId, t.dueDate, t.dependencies, new Date().toISOString(), new Date().toISOString()]
    );
  }

  // --- Additional Seeds ---

  const rfis = [
    { id: 'rfi-1', companyId: 'c1', projectId: 'p1', number: 'RFI-001', subject: 'Clarification on Curtain Wall Anchors', question: 'The specs for anchors on level 4 seem to conflict with structural drawings.', assignedTo: 'Sarah Mitchell', status: 'Open', dueDate: '2025-11-15', createdAt: '2025-11-08' },
    { id: 'rfi-2', companyId: 'c1', projectId: 'p1', number: 'RFI-002', subject: 'Lobby Flooring Material', question: 'Is the marble finish confirmed for the main entrance?', answer: 'Yes, specs confirmed in Rev 3.', assignedTo: 'John Anderson', status: 'Closed', dueDate: '2025-10-30', createdAt: '2025-10-25' },
  ];

  for (const r of rfis) {
    await db.run(
      `INSERT INTO rfis (id, companyId, projectId, number, subject, description, response, assignedTo, status, dueDate, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [r.id, r.companyId, r.projectId, r.number, r.subject, r.question, r.answer, r.assignedTo, r.status, r.dueDate, r.createdAt]
    );
  }

  const punchItems = [
    { id: 'pi-1', companyId: 'c1', projectId: 'p1', title: 'Paint scratch in hallway', location: 'Level 3, Corridor B', description: 'Minor scuff marks on north wall.', status: 'Open', priority: 'Low', assignedTo: 'David Chen', createdAt: '2025-11-09' },
    { id: 'pi-2', companyId: 'c1', projectId: 'p1', title: 'Loose electrical socket', location: 'Unit 402', description: 'Socket not flush with wall.', status: 'Resolved', priority: 'Medium', assignedTo: 'Robert Garcia', createdAt: '2025-11-05' },
  ];

  for (const p of punchItems) {
    await db.run(
      `INSERT INTO punch_items (id, companyId, projectId, title, location, description, status, priority, assignedTo, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.companyId, p.projectId, p.title, p.location, p.description, p.status, p.priority, p.assignedTo, p.createdAt]
    );
  }

  const dailyLogs = [
    { id: 'dl-1', companyId: 'c1', projectId: 'p1', date: '2025-11-10', weather: 'Sunny, 72°F', notes: 'Site visit by inspectors went well.', workPerformed: 'Concrete pouring on sector 4 completed.', crewCount: 18, author: 'Mike Thompson', createdAt: '2025-11-10' },
    { id: 'dl-2', companyId: 'c1', projectId: 'p1', date: '2025-11-09', weather: 'Cloudy, 68°F', notes: 'Delay in steel delivery caused 2h downtime.', workPerformed: 'Formwork setup for Level 5.', crewCount: 22, author: 'Mike Thompson', createdAt: '2025-11-09' },
  ];

  for (const d of dailyLogs) {
    await db.run(
      `INSERT INTO daily_logs (id, companyId, projectId, date, weather, notes, activities, workforce, createdBy, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.id, d.companyId, d.projectId, d.date, d.weather, d.notes, d.workPerformed, d.crewCount, d.author, d.createdAt]
    );
  }

  const dayworks = [
    {
      id: 'dw-1', companyId: 'c1', projectId: 'p1', date: '2025-11-08', description: 'Emergency cleanup after storm. Removed debris from north access road to allow delivery trucks.', status: 'Approved', createdAt: '2025-11-08',
      labor: JSON.stringify([{ name: 'Adrian', trade: 'Laborer', hours: 12, rate: 30 }]),
      materials: JSON.stringify([{ item: 'Sandbags', quantity: 50, unit: 'bags', cost: 5.50 }]),
      attachments: '[]',
      totalLaborCost: 360,
      totalMaterialCost: 275,
      grandTotal: 635
    },
    {
      id: 'dw-2', companyId: 'c1', projectId: 'p1', date: '2025-11-10', description: 'Extra excavation for utility line reroute due to unforeseen obstruction.', status: 'Pending', createdAt: '2025-11-10',
      labor: JSON.stringify([{ name: 'Team A', trade: 'Groundworks', hours: 8, rate: 45 }]),
      materials: JSON.stringify([{ item: 'Gravel', quantity: 2, unit: 'ton', cost: 80 }]),
      attachments: '[]',
      totalLaborCost: 360,
      totalMaterialCost: 160,
      grandTotal: 520
    },
  ];

  for (const dw of dayworks) {
    await db.run(
      `INSERT INTO dayworks (id, companyId, projectId, date, description, status, createdAt, labor, materials, attachments, totalLaborCost, totalMaterialCost, grandTotal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [dw.id, dw.companyId, dw.projectId, dw.date, dw.description, dw.status, dw.createdAt, dw.labor, dw.materials, dw.attachments, dw.totalLaborCost, dw.totalMaterialCost, dw.grandTotal]
    );
  }

  // --- Memberships (Demo Users) ---
  const memberships = [
    { id: 'm1', userId: 'u1', companyId: 'c1', role: 'SUPERADMIN', status: 'active' },
    { id: 'm2', userId: 'u2', companyId: 'c1', role: 'COMPANY_ADMIN', status: 'active' },
    { id: 'm3', userId: 'demo-user', companyId: 'c1', role: 'SUPERADMIN', status: 'active' }
  ];
  for (const m of memberships) {
    await db.run(
      `INSERT INTO memberships (id, userId, companyId, role, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [m.id, m.userId, m.companyId, m.role, m.status, new Date().toISOString(), new Date().toISOString()]
    );
  }

  // --- Feature Definitions moved to database.ts ---

  // --- Permissions & Role Permissions ---
  // --- Permissions & Role Permissions ---
  const RESOURCES = ['projects', 'tasks', 'companies', 'users', 'roles', 'automations', 'reports', 'settings', 'client_portal', 'daily_logs', 'documents', 'rfis', 'punch_items', 'safety_incidents', 'equipment', 'timesheets', 'chats', 'finance', 'inventory', 'defects', 'risks'];
  const ACTIONS = ['create', 'read', 'update', 'delete', 'manage'];

  const perms: any[] = [];

  // 1. Generate standard resource permissions
  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      perms.push({
        id: uuidv4(),
        name: `${resource}.${action}`,
        resource,
        action,
        description: `Allow ${action} on ${resource}`
      });
    }
  }

  // 2. Add specific granular permissions if not covered above
  // (e.g. specific to modules not in the standard list, or special actions)

  for (const p of perms) {
    // Check if exists to avoid duplicates if re-seeding without cleaning
    const existing = await db.get('SELECT id FROM permissions WHERE name = ?', [p.name]);
    let permId = existing?.id;

    if (!existing) {
      permId = p.id;
      await db.run(
        `INSERT INTO permissions (id, name, resource, action, description, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
        [p.id, p.name, p.resource, p.action, p.description, new Date().toISOString()]
      );
    }

    // Grant all to SUPERADMIN
    const existingRolePerm = await db.get('SELECT * FROM role_permissions WHERE roleId = ? AND permissionId = ?', ['SUPERADMIN', permId]);
    if (!existingRolePerm) {
      await db.run(
        `INSERT INTO role_permissions (roleId, permissionId) VALUES (?, ?)`,
        ['SUPERADMIN', permId]
      );
    }
  }

  logger.info('Seeding complete');

  // --- Team ---
  const team = [
    { id: 'u1', companyId: 'c1', name: 'John Anderson', initials: 'JA', role: 'Project Manager', status: 'On Site', projectId: 'p1', projectName: 'City Centre Plaza', phone: '+1 555-0101', email: 'john@buildcorp.com', color: 'bg-blue-500', bio: 'Senior PM with 15 years experience.', location: 'Site Office', skills: '["Management", "Safety"]', certifications: '[]', performanceRating: 95, completedProjects: 12, joinDate: '2020-01-15', hourlyRate: 85.00 },
    { id: 'u2', companyId: 'c1', name: 'Sarah Mitchell', initials: 'SM', role: 'Site Supervisor', status: 'On Site', projectId: 'p1', projectName: 'City Centre Plaza', phone: '+1 555-0102', email: 'sarah@buildcorp.com', color: 'bg-green-500', bio: 'Expert in structural steel.', location: 'Sector 4', skills: '["Steel", "Logistics"]', certifications: '[]', performanceRating: 92, completedProjects: 8, joinDate: '2021-03-10', hourlyRate: 65.00 }
  ];
  for (const m of team) {
    await db.run(
      `INSERT INTO team (id, companyId, name, initials, role, status, projectId, projectName, phone, email, color, bio, location, skills, certifications, performanceRating, completedProjects, joinDate, hourlyRate)

       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [m.id, m.companyId, m.name, m.initials, m.role, m.status, m.projectId, m.projectName, m.phone, m.email, m.color, m.bio, m.location, m.skills, m.certifications, m.performanceRating, m.completedProjects, m.joinDate, m.hourlyRate]
    );
  }

  // --- Clients ---
  const clients = [
    { id: 'cl1', companyId: 'c1', name: 'Metro Developers', contactPerson: 'Alice Wright', role: 'Director', email: 'alice@metro.com', phone: '+1 555-0201', status: 'Active', tier: 'Platinum', activeProjects: 1, totalValue: '$25M' }
  ];
  for (const c of clients) {
    await db.run(
      `INSERT INTO clients (id, companyId, name, contactPerson, role, email, phone, status, tier, activeProjects, totalValue)

       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.companyId, c.name, c.contactPerson, c.role, c.email, c.phone, c.status, c.tier, c.activeProjects, c.totalValue]
    );
  }

  // --- Inventory ---
  const inventory = [
    { id: 'inv1', companyId: 'c1', name: 'Cement Bags', category: 'Materials', quantity: 150, unit: 'bags', reorderLevel: 50, status: 'In Stock', location: 'Warehouse A', lastRestocked: '2025-10-01', unitCost: 12.50 }
  ];
  for (const i of inventory) {
    await db.run(
      `INSERT INTO inventory (id, companyId, name, category, quantity, unit, reorderLevel, status, location, lastRestocked, unitCost)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [i.id, i.companyId, i.name, i.category, i.quantity, i.unit, i.reorderLevel, i.status, i.location, i.lastRestocked, i.unitCost]
    );
  }

  // --- Safety Incidents ---
  const incidents = [
    { id: 'si1', companyId: 'c1', title: 'Near miss with forklift', projectName: 'City Centre Plaza', projectId: 'p1', severity: 'Medium', status: 'Investigating', date: '2025-11-01', type: 'Machinery' }
  ];
  for (const s of incidents) {
    await db.run(
      `INSERT INTO safety_incidents (id, companyId, title, projectName, projectId, severity, status, date, type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.id, s.companyId, s.title, s.projectName, s.projectId, s.severity, s.status, s.date, s.type]
    );
  }

  // --- Project Risks ---
  const risks = [
    { id: 'risk1', companyId: 'c1', projectId: 'p2', riskLevel: 'High', predictedDelayDays: 14, factors: '["Budget overrun", "Supply chain bottleneck"]', recommendations: '["Review vendor contracts", "Reallocate contingency fund"]', createdAt: new Date().toISOString() }
  ];
  for (const r of risks) {
    await db.run(
      `INSERT INTO project_risks (id, companyId, projectId, riskLevel, predictedDelayDays, factors, recommendations, createdAt, trend)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [r.id, r.companyId, r.projectId, r.riskLevel, r.predictedDelayDays, r.factors, r.recommendations, r.createdAt, 'Stable']
    );
  }

  // --- Equipment ---
  const equipment = [
    { id: 'eq1', name: 'Excavator CAT-320', type: 'Heavy Machinery', status: 'In Use', projectId: 'p1', projectName: 'City Centre Plaza', lastService: '2025-09-15', nextMaintenance: '2025-12-15', companyId: 'c1', image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' }
  ];
  for (const e of equipment) {
    await db.run(
      `INSERT INTO equipment (id, name, type, status, projectId, projectName, lastService, nextMaintenance, companyId, image)

       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [e.id, e.name, e.type, e.status, e.projectId, e.projectName, e.lastService, e.nextMaintenance, e.companyId, e.image]
    );
  }

  // --- Timesheets ---
  const timesheets = [
    { id: 'ts1', userId: 'u1', userName: 'Mike Thompson', projectId: 'p1', projectName: 'City Centre Plaza', date: '2025-11-10', hoursWorked: 8, startTime: '07:00', endTime: '15:00', status: 'Approved', companyId: 'c1' }
  ];
  for (const t of timesheets) {
    await db.run(
      `INSERT INTO timesheets (id, userId, userName, projectId, projectName, date, hoursWorked, startTime, endTime, status, companyId)

       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [t.id, t.userId, t.userName, t.projectId, t.projectName, t.date, t.hoursWorked, t.startTime, t.endTime, t.status, t.companyId]
    );
  }

  // --- Channels ---
  const channels = [
    { id: 'c1', companyId: 'c1', name: 'city-centre-plaza', type: 'public', unreadCount: 0 },
    { id: 'c2', companyId: 'c1', name: 'residential-complex', type: 'public', unreadCount: 3 },
    { id: 'c3', companyId: 'c1', name: 'safety-alerts', type: 'public', unreadCount: 0 },
    { id: 'c4', companyId: 'c1', name: 'site-logistics', type: 'public', unreadCount: 0 },
    { id: 'c5', companyId: 'c1', name: 'managers-only', type: 'private', unreadCount: 0 }
  ];
  for (const c of channels) {
    await db.run(
      `INSERT INTO channels (id, companyId, name, type, unreadCount) VALUES (?, ?, ?, ?, ?)`,
      [c.id, c.companyId, c.name, c.type, c.unreadCount]
    );
  }

  // --- Team Messages ---
  // --- Team Messages ---
  const messages = [
    { id: 'm1', channelId: 'c1', userId: 'u2', userName: 'Mike Thompson', avatar: 'MT', message: 'Foundation work is progressing well. Should be done by Friday.', createdAt: '2025-11-23T09:30:00' },
    { id: 'm2', channelId: 'c1', userId: 'u3', userName: 'David Chen', avatar: 'DC', message: 'Great! I\'ll schedule the inspection for Saturday morning.', createdAt: '2025-11-23T09:45:00' },
    { id: 'm3', channelId: 'c1', userId: 'u1', userName: 'John Anderson', avatar: 'JA', message: 'Do we have the concrete delivery confirmed for Phase 2?', createdAt: '2025-11-23T10:15:00' },
    { id: 'm4', channelId: 'c2', userId: 'u2', userName: 'Sarah Mitchell', avatar: 'SM', message: 'Updated the blueprints for the east wing.', createdAt: '2025-11-22T14:00:00' }
  ];
  for (const m of messages) {
    await db.run(
      `INSERT INTO team_messages (id, channelId, userId, userName, avatar, message, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [m.id, m.channelId, m.userId, m.userName, m.avatar, m.message, m.createdAt]
    );
  }

  // --- Transactions ---
  const transactions = [
    { id: 'tx1', companyId: 'c1', projectId: 'p1', date: '2025-12-01', description: 'Monthly Retainer - Phase 1', amount: 150000, type: 'income', category: 'Project Fee', status: 'completed' },
    { id: 'tx2', companyId: 'c1', projectId: 'p1', date: '2025-12-05', description: 'Concrete Supply - Level 4', amount: -45000, type: 'expense', category: 'Materials', status: 'completed' },
    { id: 'tx3', companyId: 'c1', projectId: 'p1', date: '2025-12-08', description: 'Site Security Services', amount: -12000, type: 'expense', category: 'Services', status: 'completed' },
    { id: 'tx4', companyId: 'c1', projectId: 'p2', date: '2025-12-02', description: 'Initial Mobilization Fee', amount: 85000, type: 'income', category: 'Project Fee', status: 'completed' }
  ];
  for (const t of transactions) {
    await db.run(
      `INSERT INTO transactions (id, companyId, projectId, date, description, amount, type, category, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [t.id, t.companyId, t.projectId, t.date, t.description, t.amount, t.type, t.category, t.status]
    );
  }

  // --- Invoices ---
  const invoices = [
    { id: 'inv-101', companyId: 'c1', projectId: 'p1', vendorId: 'v1', amount: 12500, status: 'Draft', dueDate: '2026-01-15' },
    { id: 'inv-102', companyId: 'c1', projectId: 'p1', vendorId: 'v2', amount: 450, status: 'Approved', dueDate: '2025-12-28' },
    { id: 'inv-103', companyId: 'c1', projectId: 'p1', vendorId: 'v1', amount: 8900, status: 'Pending', dueDate: '2026-01-20' }
  ];
  for (const i of invoices) {
    await db.run(
      `INSERT INTO invoices (id, companyId, projectId, vendorId, amount, status, dueDate, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [i.id, i.companyId, i.projectId, i.vendorId, i.amount, i.status, i.dueDate, new Date().toISOString()]
    );
  }

  // --- Automations ---
  const automations = [
    { id: 'auto1', companyId: 'c1', name: 'High Risk Alert', triggerType: 'safety_incident_high', actionType: 'send_email', config: JSON.stringify({ to: 'admin@buildcorp.com', subject: 'Priority Safety Alert' }), enabled: 1 },
    { id: 'auto2', companyId: 'c1', name: 'Large Invoice Task', triggerType: 'large_invoice_received', actionType: 'create_task', config: JSON.stringify({ title: 'Review Large Invoice', priority: 'High' }), enabled: 1 }
  ];
  for (const a of automations) {
    await db.run(
      `INSERT INTO automations (id, companyId, name, triggerType, actionType, configuration, enabled, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [a.id, a.companyId, a.name, a.triggerType, a.actionType, a.config, a.enabled, new Date().toISOString()]
    );
  }

  // --- Marketplace Categories (Phase 12) ---
  const marketplaceCategories = [
    { id: 'cat1', name: 'AI & Intelligence', slug: 'ai-intelligence', description: 'Advanced AI tools and predictive analytics.', icon: 'Brain', sortOrder: 1 },
    { id: 'cat2', name: 'Safety & Compliance', slug: 'safety-compliance', description: 'Tools for site safety and regulatory compliance.', icon: 'Shield', sortOrder: 2 },
    { id: 'cat3', name: 'Financials', slug: 'financials', description: 'Cost tracking, invoicing, and budgeting tools.', icon: 'DollarSign', sortOrder: 3 },
    { id: 'cat4', name: 'Field Tools', slug: 'field-tools', description: 'On-site reporting and construction management.', icon: 'HardHat', sortOrder: 4 }
  ];

  for (const cat of marketplaceCategories) {
    await db.run(
      `INSERT INTO module_categories (id, name, slug, description, icon, sortOrder) VALUES (?, ?, ?, ?, ?, ?)`,
      [cat.id, cat.name, cat.slug, cat.description, cat.icon, cat.sortOrder]
    );
  }

  // --- Marketplace Modules (Phase 12) ---
  const marketplaceModules = [
    {
      id: 'mod1',
      developer_id: 'demo-user',
      name: 'SiteGuard AI',
      slug: 'siteguard-ai',
      description: 'Real-time hazard detection using project cameras and AI computer vision.',
      category: 'Safety & Compliance',
      version: '2.1.0',
      price: 49.99,
      is_free: 0,
      status: 'published',
      downloads: 1250,
      rating: 4.8,
      reviews_count: 42,
      icon: 'Eye'
    },
    {
      id: 'mod2',
      developer_id: 'demo-user',
      name: 'AutoBill Pro',
      slug: 'autobill-pro',
      description: 'Automated invoice processing and material cost tracking with OCR.',
      category: 'Financials',
      version: '1.0.5',
      price: 0,
      is_free: 1,
      status: 'published',
      downloads: 3400,
      rating: 4.5,
      reviews_count: 128,
      icon: 'Receipt'
    },
    {
      id: 'mod3',
      developer_id: 'demo-user',
      name: 'DroneSurvey Link',
      slug: 'dronesurvey-link',
      description: 'Import and analyze drone survey data directly into your project maps.',
      category: 'Field Tools',
      version: '3.2.1',
      price: 99.00,
      is_free: 0,
      status: 'published',
      downloads: 850,
      rating: 4.9,
      reviews_count: 15,
      icon: 'Plane'
    }
  ];

  for (const m of marketplaceModules) {
    await db.run(
      `INSERT INTO modules (id, developerId, name, slug, description, category, version, price, isFree, status, publishedAt, updatedAt, downloads, rating, reviewsCount, icon)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [m.id, m.developer_id, m.name, m.slug, m.description, m.category, m.version, m.price, m.is_free ? 1 : 0, m.status, new Date().toISOString(), new Date().toISOString(), m.downloads, m.rating, m.reviews_count, m.icon]
    );
  }

  logger.info('Seeding complete');
}
