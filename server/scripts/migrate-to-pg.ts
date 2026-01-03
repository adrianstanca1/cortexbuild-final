
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);
const { Pool } = require('pg');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const dotenv = require('dotenv');

console.log("DEBUG: Script started");

// Load Env
const envPath = resolve(__dirname, '../.env');
console.log(`DEBUG: Loading .env from ${envPath}`);
dotenv.config({ path: envPath });
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Removed for security

async function migrate() {
  try {
    console.log('🚀 Starting migration check...');

    const pgUrl = process.env.DATABASE_URL;
    if (!pgUrl) {
      console.error('❌ Error: DATABASE_URL is not defined in .env');
      return;
    }
    console.log(`DEBUG: DATABASE_URL found (length: ${pgUrl.length})`);

    // 1. Connect to SQLite
    const sqlitePath = resolve(__dirname, '../buildpro_db.sqlite');
    console.log(`📂 Opening SQLite database at ${sqlitePath}...`);
    const sqliteDb = await open({
      filename: sqlitePath,
      driver: sqlite3.Database
    });
    console.log('DEBUG: SQLite connected');

    // 2. Connect to Postgres
    console.log('🐘 Connecting to PostgreSQL...');
    const pool = new Pool({
      connectionString: pgUrl,
      ssl: pgUrl.includes('localhost') ? false : { rejectUnauthorized: process.env.NODE_ENV === 'production' }
    });
    const pgClient = await pool.connect();
    console.log('DEBUG: PostgreSQL connected');

    // 3. Schema Definition (Inlined to avoid import issues)
    const schemaSql = `
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      companyId TEXT,
      name TEXT,
      code TEXT,
      description TEXT,
      location TEXT,
      type TEXT,
      status TEXT,
      health TEXT,
      progress INTEGER,
      budget REAL,
      spent REAL,
      startDate TEXT,
      endDate TEXT,
      manager TEXT,
      image TEXT,
      teamSize INTEGER,
      weatherLocation TEXT,
      aiAnalysis TEXT,
      zones TEXT,
      phases TEXT,
      timelineOptimizations TEXT
    );

    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT,
      plan TEXT,
      status TEXT,
      users INTEGER DEFAULT 0,
      projects INTEGER DEFAULT 0,
      mrr REAL DEFAULT 0,
      joinedDate TEXT,
      description TEXT,
      logo TEXT,
      website TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zipCode TEXT,
      country TEXT,
      settings TEXT,
      subscription TEXT,
      features TEXT,
      maxUsers INTEGER,
      maxProjects INTEGER,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      companyId TEXT,
      title TEXT,
      description TEXT,
      projectId TEXT,
      status TEXT,
      priority TEXT,
      assigneeId TEXT,
      assigneeName TEXT,
      assigneeType TEXT,
      dueDate TEXT,
      latitude REAL,
      longitude REAL,
      dependencies TEXT,
      FOREIGN KEY(projectId) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS team (
      id TEXT PRIMARY KEY,
      companyId TEXT,
      name TEXT,
      initials TEXT,
      role TEXT,
      status TEXT,
      projectId TEXT,
      projectName TEXT,
      phone TEXT,
      color TEXT,
      email TEXT,
      bio TEXT,
      location TEXT,
      skills TEXT,
      certifications TEXT,
      performanceRating INTEGER,
      completedProjects INTEGER,
      joinDate TEXT,
      hourlyRate REAL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT,
      projectId TEXT,
      companyId TEXT,
      projectName TEXT,
      size TEXT,
      date TEXT,
      status TEXT,
      url TEXT,
      linkedTaskIds TEXT
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      companyId TEXT,
      name TEXT,
      contactPerson TEXT,
      role TEXT,
      email TEXT,
      phone TEXT,
      status TEXT,
      tier TEXT,
      activeProjects INTEGER,
      totalValue TEXT
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      companyId TEXT,
      name TEXT,
      category TEXT,
      stock INTEGER,
      unit TEXT,
      threshold INTEGER,
      status TEXT,
      location TEXT,
      lastOrderDate TEXT,
      costPerUnit REAL
    );

    CREATE TABLE IF NOT EXISTS rfis (
      id TEXT PRIMARY KEY,
      projectId TEXT,
      companyId TEXT,
      number TEXT,
      subject TEXT,
      question TEXT,
      answer TEXT,
      assignedTo TEXT,
      status TEXT,
      dueDate TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS punch_items (
      id TEXT PRIMARY KEY,
      projectId TEXT,
      companyId TEXT,
      title TEXT,
      location TEXT,
      description TEXT,
      status TEXT,
      priority TEXT,
      assignedTo TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS daily_logs (
      id TEXT PRIMARY KEY,
      projectId TEXT,
      companyId TEXT,
      date TEXT,
      weather TEXT,
      notes TEXT,
      workPerformed TEXT,
      crewCount INTEGER,
      author TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS dayworks (
      id TEXT PRIMARY KEY,
      projectId TEXT,
      companyId TEXT,
      date TEXT,
      description TEXT,
      status TEXT,
      createdAt TEXT,
      labor TEXT,
      materials TEXT,
      attachments TEXT,
      totalLaborCost REAL,
      totalMaterialCost REAL,
      grandTotal REAL
    );

    CREATE TABLE IF NOT EXISTS safety_incidents (
      id TEXT PRIMARY KEY,
      title TEXT,
      project TEXT,
      projectId TEXT,
      companyId TEXT,
      severity TEXT,
      status TEXT,
      date TEXT,
      type TEXT
    );

    CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT,
      status TEXT,
      projectId TEXT,
      projectName TEXT,
      lastService TEXT,
      nextService TEXT,
      companyId TEXT,
      image TEXT
    );

    CREATE TABLE IF NOT EXISTS timesheets (
      id TEXT PRIMARY KEY,
      employeeId TEXT,
      employeeName TEXT,
      projectId TEXT,
      projectName TEXT,
      date TEXT,
      hours REAL,
      startTime TEXT,
      endTime TEXT,
      status TEXT,
      companyId TEXT
    );

    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      companyId TEXT,
      name TEXT,
      type TEXT,
      unreadCount INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS team_messages (
      id TEXT PRIMARY KEY,
      channelId TEXT,
      senderId TEXT,
      senderName TEXT,
      senderRole TEXT,
      senderAvatar TEXT,
      content TEXT,
      createdAt TEXT,
      FOREIGN KEY(channelId) REFERENCES channels(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      companyId TEXT,
      projectId TEXT,
      date TEXT,
      description TEXT,
      amount REAL,
      type TEXT,
      category TEXT,
      status TEXT,
      invoice TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      companyId TEXT,
      userId TEXT,
      userName TEXT,
      action TEXT,
      resource TEXT,
      resourceId TEXT,
      changes TEXT,
      status TEXT,
      timestamp TEXT,
      ipAddress TEXT,
      userAgent TEXT
    );
     
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      permissions TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      companyId TEXT NOT NULL,
      roleId TEXT NOT NULL,
      assignedBy TEXT,
      assignedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS tenant_usage_logs (
      id TEXT PRIMARY KEY,
      companyId TEXT NOT NULL,
      resourceType TEXT NOT NULL,
      amount INTEGER DEFAULT 1,
      timestamp TEXT NOT NULL,
      metadata TEXT
    );
    `;

    console.log('🏗️  Applying schema to PostgreSQL...');
    await pgClient.query(schemaSql);
    console.log('✅ Schema initialized.');

    // 4. Migrate Data
    const tables = [
      'companies',
      'projects',
      'roles',
      'team',
      'clients',
      'inventory',
      'rfis',
      'punch_items',
      'daily_logs',
      'dayworks',
      'safety_incidents',
      'equipment',
      'timesheets',
      'channels',
      'transactions',
      'audit_logs',
      'tenant_usage_logs',
      'tasks', // Foreign keys
      'documents',
      'user_roles',
      'team_messages'
    ];

    for (const table of tables) {
      console.log(`📦 Processing table: ${table}`);

      let rows = [];
      try {
        rows = await sqliteDb.all(`SELECT * FROM ${table}`);
      } catch (e: any) {
        console.log(`   (Skipping table ${table} - possibly missing in SQLite: ${e.message})`);
        continue;
      }

      if (rows.length === 0) {
        console.log(`   (No data in ${table})`);
        continue;
      }

      console.log(`   Found ${rows.length} rows.`);
      const columns = Object.keys(rows[0]);

      // Add companyId if missing and expected in Postgres
      if (!columns.map(c => c.toLowerCase()).includes('companyid')) {
        console.log(`   💡 Adding default companyId 'c1' for table ${table}`);
        columns.push('companyId');
        rows.forEach(r => r.companyId = 'c1');
      } else {
        // Ensure no nulls for companyId
        rows.forEach(r => {
          if (r.companyId === null || r.companyId === undefined || r.companyId === '') {
            r.companyId = 'c1';
          }
        });
      }

      // Add createdAt/updatedAt if missing
      if (!columns.map(c => c.toLowerCase()).includes('createdat')) {
        console.log(`   💡 Adding default createdAt for table ${table}`);
        columns.push('createdAt');
        const now = new Date().toISOString();
        rows.forEach(r => r.createdAt = now);
      }
      if (!columns.map(c => c.toLowerCase()).includes('updatedat')) {
        console.log(`   💡 Adding default updatedAt for table ${table}`);
        columns.push('updatedAt');
        const now = new Date().toISOString();
        rows.forEach(r => r.updatedAt = now);
      }

      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const columnNames = columns.map(c => `"${c.toLowerCase()}"`).join(', ');

      const insertSql = `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

      for (const row of rows) {
        const values = columns.map(col => row[col]);
        try {
          await pgClient.query(insertSql, values);
        } catch (e: any) {
          console.error(`   ❌ Insert failed for ${table}:`, e.message);
        }
      }
    }

    console.log('🎉 Migration completed successfully!');

    pgClient.release();
    await pool.end();
    await sqliteDb.close();

  } catch (err) {
    console.error('❌ FATAL ERROR:', err);
    // Print full error explicitly
    if (err instanceof Error) {
      console.error(err.stack);
    } else {
      console.error(JSON.stringify(err, null, 2));
    }
    process.exit(1);
  }
}

migrate();
