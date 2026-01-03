import React from 'react';


export interface SystemHealth {
  api: 'healthy' | 'degraded' | 'down';
  database: 'healthy' | 'degraded' | 'down';
  auth: 'healthy' | 'degraded' | 'down' | 'offline';
  storage: 'healthy' | 'degraded' | 'down' | 'offline';
  databaseLatency?: string;
  uptime: number;
  timestamp: string;
  memoryUsage?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  osLoad?: number[];
  freeMem?: number;
  totalMem?: number;
}

export interface PlatformStats {
  totalCompanies: number;
  totalUsers: number;
  totalProjects: number;
  monthlyRevenue: number;
  systemStatus: string;
  environment: string;
}

export interface SystemSettings {
  maintenance: boolean;
  maintenanceMode?: boolean; // For legacy/frontend compatibility
  betaFeatures: boolean;
  registrations: boolean;
  aiEngine: boolean;
}

export enum Page {
  ANALYTICS = 'ANALYTICS',
  LOGIN = 'LOGIN',
  PROFILE = 'PROFILE',
  AI_TOOLS = 'AI_TOOLS',
  REPORTS = 'REPORTS',
  SCHEDULE = 'SCHEDULE',
  DASHBOARD = 'DASHBOARD',
  CHAT = 'CHAT', // AI Assistant
  TEAM_CHAT = 'TEAM_CHAT', // Team Chat
  LIVE = 'LIVE',
  PROJECTS = 'PROJECTS',
  PROJECT_DETAILS = 'PROJECT_DETAILS',
  TASKS = 'TASKS',
  TEAM = 'TEAM',
  TIMESHEETS = 'TIMESHEETS',
  DOCUMENTS = 'DOCUMENTS',
  SAFETY = 'SAFETY',
  EQUIPMENT = 'EQUIPMENT',
  FINANCIALS = 'FINANCIALS',
  MAP_VIEW = 'MAP_VIEW',
  ML_INSIGHTS = 'ML_INSIGHTS',
  COMPLIANCE = 'COMPLIANCE',
  PROCUREMENT = 'PROCUREMENT',
  CLIENTS = 'CLIENTS',
  INVENTORY = 'INVENTORY',
  CUSTOM_DASH = 'CUSTOM_DASH',
  WORKFORCE = 'WORKFORCE',
  INTEGRATIONS = 'INTEGRATIONS',
  SECURITY = 'SECURITY',
  MARKETPLACE = 'MARKETPLACE',
  EXECUTIVE = 'EXECUTIVE',
  IMAGINE = 'IMAGINE',
  MY_DESKTOP = 'MY_DESKTOP',
  LIVE_PROJECT_MAP = 'LIVE_PROJECT_MAP',
  PROJECT_LAUNCHPAD = 'PROJECT_LAUNCHPAD',
  TENANT_MANAGEMENT = 'TENANT_MANAGEMENT',
  TENANT_ANALYTICS = 'TENANT_ANALYTICS',
  RESOURCE_OPTIMIZATION = 'RESOURCE_OPTIMIZATION',
  DAILY_LOGS = 'DAILY_LOGS',
  RFI = 'RFI',
  CLIENT_PORTAL = 'CLIENT_PORTAL',
  MAINTENANCE = 'MAINTENANCE',

  // Phase 14
  AUTOMATIONS = 'AUTOMATIONS',
  PREDICTIVE_ANALYSIS = 'PREDICTIVE_ANALYSIS',
  SMART_DOCS = 'SMART_DOCS',
  PLATFORM_DASHBOARD = 'PLATFORM_DASHBOARD',
  COMPANY_MANAGEMENT = 'COMPANY_MANAGEMENT',
  COMPANY_SETTINGS = 'COMPANY_SETTINGS',
  USER_MANAGEMENT = 'USER_MANAGEMENT', // New Company Admin settings page
  PLATFORM_MEMBERS = 'PLATFORM_MEMBERS',
  ACCESS_CONTROL = 'ACCESS_CONTROL',
  SYSTEM_LOGS = 'SYSTEM_LOGS',
  SQL_CONSOLE = 'SQL_CONSOLE',
  REGISTER = 'REGISTER',
  SECURITY_CENTER = 'SECURITY_CENTER',
  SUPPORT_CENTER = 'SUPPORT_CENTER',
  PLATFORM_NOTIFICATIONS = 'PLATFORM_NOTIFICATIONS',
  GLOBAL_SETTINGS = 'GLOBAL_SETTINGS',
  AUTOMATION = 'AUTOMATION',
  EXPORT_CENTER = 'EXPORT_CENTER',
  USAGE_ANALYTICS = 'USAGE_ANALYTICS',

  // CortexBuild Pages
  CORTEX_BUILD_HOME = 'CORTEX_BUILD_HOME',
  NEURAL_NETWORK = 'NEURAL_NETWORK',
  PLATFORM_FEATURES = 'PLATFORM_FEATURES',
  CONNECTIVITY = 'CONNECTIVITY',
  DEVELOPER_PLATFORM = 'DEVELOPER_PLATFORM',

  // Public Pages
  PUBLIC_LOGIN = 'PUBLIC_LOGIN',
  SETUP = 'SETUP',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_CONFIRM = 'PASSWORD_RESET_CONFIRM'
}

export enum UserRole {
  CLIENT = 'CLIENT',
  READ_ONLY = 'READ_ONLY',
  OPERATIVE = 'OPERATIVE',
  SUPERVISOR = 'SUPERVISOR',
  FINANCE = 'FINANCE',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  SUPERADMIN = 'SUPERADMIN',
}

/**
 * Role hierarchy for privilege comparison
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.CLIENT]: -1,
  [UserRole.READ_ONLY]: 0,
  [UserRole.OPERATIVE]: 1,
  [UserRole.SUPERVISOR]: 2,
  [UserRole.FINANCE]: 3,
  [UserRole.PROJECT_MANAGER]: 4,
  [UserRole.COMPANY_ADMIN]: 5,
  [UserRole.SUPERADMIN]: 6,
};

export interface Permission {
  id: string;
  name: string; // e.g., 'projects.create'
  resource: string;
  action: string;
  description?: string;
}

export interface Membership {
  id: string;
  userId: string;
  companyId: string;
  role: UserRole;
  permissions?: string[];
  status: 'active' | 'suspended' | 'invited' | 'inactive';
}

export interface Company {
  id: string;
  name: string;
  plan: 'Enterprise' | 'Business' | 'Starter' | 'Free' | 'Pro';
  status: 'Active' | 'Suspended' | 'Trial';
  users: number;
  projects: number;
  mrr: number;
  joinedDate: string;
}

// Enhanced tenant management types

export interface Invoice {
  id: string;
  companyId: string;
  projectId?: string;
  number: string;
  vendor: string;
  vendorId?: string;
  amount: number;
  total: number;
  tax?: number;
  date: string;
  dueDate: string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Paid' | 'Overdue';
  costCodeId?: string;
  items?: string; // JSON string for backend
  files?: string;
  attachments?: string[];
  // Transformed on frontend
  lineItems?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
}
export interface Tenant {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  plan: 'Enterprise' | 'Business' | 'Starter' | 'Custom' | 'Free' | 'Pro';
  status: 'Active' | 'Suspended' | 'Trial' | 'Inactive';
  settings: {
    timezone: string;
    language: string;
    dateFormat: string;
    currency: string;
    emailNotifications: boolean;
    dataRetention: number;
    twoFactorAuth: boolean;
    ipWhitelist?: string[];
    sso: boolean;
    customBranding: boolean;
    primaryColor?: string;
    accentColor?: string;
  };
  subscription: TenantSubscription;
  createdAt: string;
  updatedAt: string;
  maxUsers?: number;
  maxProjects?: number;
  features?: TenantFeature[];
  // Enhanced stats types
  users?: number;
  projects?: number;
  mrr?: number;
  joinedDate?: string;
  members?: Array<{ id: string; name: string; email: string; role?: string; lastActive?: string; }>;
  location?: string;
}
export interface TenantSubscription {
  id: string;
  planId: string;
  status: 'active' | 'cancelled' | 'suspended' | 'past_due' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt?: string;
  billingEmail: string;
  billingAddress?: string;
  paymentMethod?: string;
}

export interface TenantFeature {
  id: string;
  name: string;
  enabled: boolean;
  limit?: number; // e.g., max users, projects
  usedCount?: number;
}

export interface TenantAuditLog {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  message?: string;
  timestamp: string;
}

export interface TenantMember {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
  lastActive?: string;
  isActive: boolean;
}

export interface TenantUsage {
  tenantId: string;
  currentUsers: number;
  currentProjects: number;
  currentStorage: number; // MB
  currentApiCalls: number;
  period: string; // YYYY-MM
  limit: {
    users?: number;
    projects?: number;
    storage?: number; // MB
    apiCalls?: number;
  };
}

export interface TenantAnalytics {
  tenantId: string;
  period: string;
  usage: TenantUsage;
  trends: {
    usersGrowth: number;
    projectsGrowth: number;
    storageGrowth: number;
    apiCallsGrowth: number;
  };
  activityHeatmap: Record<string, number>;
  securityScore: number;
}

export interface Zone {
  id: string;
  label: string;
  type: 'danger' | 'warning' | 'success' | 'info';
  top: number;
  left: number;
  width: number;
  height: number;
  protocol?: string;
  trigger?: string;
}

export interface ProjectPhase {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Delayed';
  progress: number; // 0-100
  riskLevel: 'Low' | 'Medium' | 'High';
  color?: string;
}

export interface Project {
  id: string;
  companyId: string; // Multi-tenant segregation
  name: string;
  code: string;
  description: string;
  location: string;
  type: 'Commercial' | 'Residential' | 'Infrastructure' | 'Industrial' | 'Healthcare';
  status: 'Active' | 'Planning' | 'Delayed' | 'Completed' | 'On Hold';
  health: 'Good' | 'At Risk' | 'Critical';
  progress: number;
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  manager: string;
  image: string;
  teamSize: number;
  tasks: {
    total: number;
    completed: number;
    overdue: number;
  };
  weatherLocation?: {
    city: string;
    temp: string;
    condition: string;
  };
  aiAnalysis?: string; // AI generated summary
  aiExecutiveSummary?: string; // New field for high-level summary
  timelineOptimizations?: string[]; // AI generated timeline optimizations
  zones?: Zone[];
  phases?: ProjectPhase[]; // New field for high-level phases
}

export interface Task {
  id: string;
  title: string;
  projectId: string;
  status: 'To Do' | 'In Progress' | 'Done' | 'Blocked';
  priority: 'High' | 'Medium' | 'Low' | 'Critical';
  assigneeId?: string;
  assigneeName?: string; // Denormalized for easy display
  assigneeType: 'user' | 'role';
  dueDate: string;
  description?: string;
  dependencies?: string[]; // Array of Task IDs that must be completed before this task. Used for blocking logic.
  latitude?: number;
  longitude?: number;
  startDate?: string; // ISO date string
  duration?: number; // Number of days
  progress?: number; // 0-100 percentage for Gantt chart
  color?: string; // Hex color for Gantt visualization
}

export interface Certification {
  id?: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  status: 'Valid' | 'Expiring' | 'Expired';
  docUrl?: string;
  // Extended fields for file upload
  fileName?: string;
  fileType?: string;
  fileData?: string; // Base64 encoded string
}

export interface Skill {
  name: string;
  level: 1 | 2 | 3 | 4 | 5; // 1=Novice, 5=Expert
  verified: boolean;
}

export interface PayRates {
  standard: number;
  overtime: number;
  currency: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface TeamMember {
  id: string;
  companyId: string; // Multi-tenant segregation
  name: string;
  initials: string;
  role: string;
  status: 'On Site' | 'Off Site' | 'On Break' | 'Leave' | 'Invited';
  projectId?: string; // Current assignment
  projectName?: string; // Denormalized
  phone: string;
  email: string;
  color: string;
  // Extended Fields
  bio?: string;
  location?: string;
  joinDate?: string;
  skills?: Skill[];
  certifications?: Certification[];
  performanceRating?: number; // 0-100
  completedProjects?: number;
  rates?: PayRates; // Replaces hourlyRate
  hourlyRate?: number; // Deprecated, kept for backward compat temporarily
  // Enhanced Workforce Metrics
  experience?: number; // Years
  safetyIncidents?: number;
  hoursWorked?: number;
  availability?: string; // Denormalized status label if needed, or alias for status
  emergencyContact?: EmergencyContact;
  department?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export interface ProjectDocument {
  id: string;
  name: string;
  type: 'PDF' | 'Spreadsheet' | 'Document' | 'Image' | 'CAD' | 'Other';
  externalId?: string;
  number?: string;
  version?: string;
  projectId: string;
  projectName?: string;
  size: string;
  date: string;
  status: 'Approved' | 'Pending' | 'Draft';
  url?: string;
  linkedTaskIds?: string[]; // Linked tasks for easy reference
  linkedDayworkId?: string; // Link to Daywork for auto-generated docs
  // Version Control
  currentVersion: number;
  versions?: {
    id: string; // unique version ID
    version: number;
    url: string;
    date: string;
    author: string;
    size: string;
  }[];
  // Markup
  markupLayers?: string; // JSON string for Fabric.js/Canvas data containing annotations
}

export interface Client {
  id: string;
  companyId: string; // Multi-tenant segregation
  name: string;
  contactPerson: string;
  role: string;
  email: string;
  phone: string;
  status: 'Active' | 'Lead' | 'Inactive';
  tier: 'Platinum' | 'Gold' | 'Silver' | 'Government';
  activeProjects: number;
  totalValue: string;
}

export interface InventoryItem {
  id: string;
  companyId: string; // Multi-tenant segregation
  name: string;
  category: string;
  stock: number;
  unit: string;
  threshold: number;
  location: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  lastOrderDate?: string;
  costPerUnit?: number;
  image?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  permissions: string[];
  memberships: Membership[];
  companyId?: string;
  projectIds?: string[];
  avatarInitials: string;
  avatarUrl?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string;
  timestamp: number;
  isThinking?: boolean;
}

export interface GeneratedImage {
  id?: string;
  url: string;
  prompt: string;
  projectId?: string;
  createdAt?: string;
}

export interface MarketplaceApp {
  id: string;
  name: string;
  category: string;
  desc: string;
  rating: number;
  downloads: string;
  icon: React.ElementType | string;
  installed: boolean;
}

export interface PlanMetadata {
  documentId: string;
  x: number;
  y: number;
}

export interface RFI {
  id: string;
  projectId: string;
  number: string;
  subject: string;
  question: string;
  assignedTo: string;
  status: 'Draft' | 'Open' | 'Closed';
  dueDate: string;
  createdAt: string;
  answer?: string;
  planMetadata?: PlanMetadata;
}

export interface PunchItem {
  id: string;
  projectId: string;
  title: string;
  location: string;
  description?: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Closed' | 'Resolved';
  createdAt: string;
  assignedTo?: string;
  planMetadata?: PlanMetadata;
}

export interface DailyLog {
  id: string;
  projectId: string;
  date: string;
  weather: string;
  crewCount: number;
  workPerformed: string;
  notes?: string;
  author: string;
  createdAt: string;
  // Signature Fields
  status: 'Draft' | 'Signed';
  signedBy?: string;
  signedAt?: string;
  attachments?: { url: string; name: string }[];
}

export interface DayworkLabor {
  name: string;
  hours: number;
  trade: string;
  rate?: number; // Hourly rate
}

export interface DayworkMaterial {
  item: string;
  quantity: number;
  unit: string;
  cost?: number; // Unit Cost
}

export interface DayworkAttachment {
  name: string;
  type: string;
  data: string; // Base64
  size?: string;
}

export interface Daywork {
  id: string;
  projectId: string;
  date: string;
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;

  // Extended Details
  labor?: DayworkLabor[];
  materials?: DayworkMaterial[];
  attachments?: DayworkAttachment[];

  // Financials
  totalLaborCost?: number;
  totalMaterialCost?: number;
  grandTotal?: number;
}

export interface SafetyIncident {
  id?: string;
  title: string;
  project: string;
  projectId?: string;
  severity: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Resolved' | 'Investigating';
  date: string;
  type: string;
}

export interface SafetyHazard {
  id?: string;
  type: string; // Short classification
  severity: 'High' | 'Medium' | 'Low';
  riskScore?: number; // 1-10
  description?: string;
  recommendation: string;
  regulation?: string; // e.g. OSHA 1926.501
  box_2d?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000 scale
  timestamp?: number | string;
  projectId?: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  status: 'In Use' | 'Available' | 'Maintenance';
  projectId?: string;
  projectName?: string;
  lastService: string;
  nextService: string;
  companyId?: string;
  image?: string; // Added image field
}

export interface Timesheet {
  id: string;
  userId?: string;
  employeeId?: string;
  employeeName: string;
  projectId?: string;
  projectName: string;
  date: string;
  hoursWorked: number;
  startTime: string;
  endTime: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Active';
  companyId?: string;
}

export interface Channel {
  id: string;
  companyId: string;
  name: string;
  type: 'public' | 'private';
  unreadCount: number;
}

export interface TeamMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderAvatar: string;
  content: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  companyId: string;
  projectId?: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  status: 'completed' | 'pending';
  invoice?: string;
  linkedPurchaseOrderId?: string;
  costCodeId?: string;
  isExported?: boolean;
  exportDate?: string;
}

// --- Procurement & Supply Chain ---
export interface OrderItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Approver {
  id: string;
  name: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp?: string;
  comment?: string;
}

export interface PurchaseOrder {
  id: string;
  projectId?: string;
  number: string;
  vendor: string;
  date: string;
  amount: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'completed' | 'received';
  items: OrderItem[];
  createdBy: string;
  approvers: Approver[];
  notes: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  createdAt?: string;
  companyId?: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  contact: string;
  email: string;
  rating: number;
  performance: number;
  activeOrders: number;
  spend: string;
  status: 'Preferred' | 'Active' | 'Review';
  reliabilityScore: number;
  averageDeliveryDays: number;
  lat?: number;
  lng?: number;
}
// --- Quality Control & Defects ---
export interface Defect {
  id: string;
  projectId: string;
  title: string;
  description: string;
  severity: 'High' | 'Medium' | 'Low' | 'Critical';
  status: 'Open' | 'Resolved' | 'Remediating' | 'Closed';
  location: string;
  category: string;
  createdAt: string;
  resolvedAt?: string;
  image?: string;
  remediationTaskId?: string;
  recommendation?: string;
  companyId?: string;
  box_2d?: [number, number, number, number];
}

// --- Project Health Forecasting ---
export interface ProjectRisk {
  id: string;
  projectId: string;
  riskLevel: 'High' | 'Medium' | 'Low' | 'Critical';
  predictedDelayDays: number;
  factors: string[];
  recommendations: string[];
  timestamp: string;
  trend: 'Improving' | 'Degrading' | 'Stable';
}

export interface MLModel {
  id: string;
  companyId: string;
  name: string;
  type: 'regression' | 'classification' | 'anomaly' | 'forecast';
  accuracy: number;
  trainedSamples: number;
  lastTrained: string;
  status: 'idle' | 'training' | 'deployed';
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface MLPrediction {
  id: string;
  companyId: string;
  modelId: string;
  timestamp: string;
  input: string;
  output: string;
  confidence: number;
  actualValue?: number;
}

export interface CostCode {
  id: string;
  projectId: string;
  companyId: string;
  code: string;
  description: string;
  budget: number;
  spent: number;
  var?: number;
}

export interface ExpenseClaim {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  date: string;
  category: 'Travel' | 'Materials' | 'Food' | 'Accommodation' | 'Other';
  description: string;
  amount: number;
  receiptUrl?: string; // Image/PDF
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  costCodeId?: string;
  approvedBy?: string;
  approvedAt?: string;
  companyId: string;
}

export interface AccessLog {
  id: number;
  user: string;
  event: string;
  ip: string;
  time: string;
  status: 'success' | 'fail' | 'warning';
}

/**
 * Shared Link for Client Portal Access
 * Enables secure, token-based access to projects for external clients
 */
export interface SharedLink {
  id: string;
  projectId: string;
  companyId: string;
  token: string; // Cryptographically secure token for URL
  password?: string; // Optional password protection (hashed)
  expiresAt: string; // ISO timestamp
  createdBy: string; // User ID who created the link
  createdAt: string;
  lastAccessedAt?: string;
  accessCount: number;
  isActive: boolean; // Can be manually revoked
}
