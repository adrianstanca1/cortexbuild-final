# 🏗️ CortexBuild Pro - Construction Management Platform

**Status:** ✅ Production Ready | **Version:** 1.3.0 | **Build:** Passing | **Security:** Hardened | **Performance:** Optimized

## 🎯 Overview

CortexBuild Pro is a **comprehensive construction project management platform** powered by **AI** and **real-time collaboration**. Manage projects, teams, timesheets, safety, equipment, and more—all in one place with AI-assisted decision making.

**Live Demo:** https://buildproapp-9m1wg4vlq-adrianstanca1s-projects.vercel.app

## ✨ Key Features

🤖 **Advanced AI Intelligence (Gemini 3 Pro)**
- **AI Project Launchpad**: Grounded project architecture & site analysis.
- **AI Safety Center**: Real-time hazard detection & compliance advisor.
- **AI Predictive Fleet**: IoT telemetry simulation & predictive maintenance.
- **AI Financial Command**: Smart budget forecasting & risk mitigation insights.
- **AI Workforce Analytics**: Skill gap analysis & automated training plans.

📊 **Comprehensive**
- 37 fully functional views
- 40 integrated routes
- 15 data models
- Real-time updates

👥 **Collaborative**
- Team messaging
- Role-based access control (RBAC)
- Full Multi-tenant architecture
- Resource-limit enforcement (Plan-based)
- Tenant-specific branding & analytics

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Development

```bash
# Install dependencies
npm install

# Setup backend
cd server && npm install
cd ..

# Set environment variables (copy .env.example to .env)
cp .env.example .env

# Start development server (Frontend + Backend)
npm run dev
# Visit: http://localhost:3000
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [**MEMBER_MANAGEMENT.md**](docs/MEMBER_MANAGEMENT.md) | Team onboarding & invitations guide |
| [**DEPLOYMENT_GUIDE.md**](docs/DEPLOYMENT_GUIDE.md) | Setup & configuration guide |
| [**SUPABASE_SETUP.md**](docs/SUPABASE_SETUP.md) | Database & auth configuration |
| [**TENANT_MANAGEMENT.md**](docs/TENANT_MANAGEMENT.md) | Multi-tenant organization guide |
| [**API_ENDPOINTS.md**](docs/API_ENDPOINTS.md) | Backend API reference |
| [**SECURITY_DECISIONS.md**](docs/SECURITY_DECISIONS.md) | Security posture & decisions log |

**Start here:** Read [MEMBER_MANAGEMENT.md](docs/MEMBER_MANAGEMENT.md) for team setup.

---

## 🛠️ Tech Stack

### Frontend
- **React 19.2.0** with TypeScript
- **Vite 6.2.0** for fast builds
- **TailwindCSS** for styling
- **Lucide React** for icons
- **Leaflet** for maps

### Backend/Services
- **Supabase** - Auth, Database, Real-time
- **Google Gemini 3 Pro** - AI Engine
- **PostgreSQL + SQLite** - Data
- **Express.js** (optional) - REST API

### DevOps
- **Vercel** - Hosting & Auto-deployment
- **GitHub** - Version Control

---

## 📊 Project Stats

| Metric | Value |
|--------|-------|
| **Views** | 37 (all working) |
| **Routes** | 40 |
| **Data Models** | 15 |
| **Build Modules** | 1825 |
| **Build Time** | ~2s |
| **TypeScript Errors** | 0 |
| **Notification System** | Toast (100% Normalized) |
| **Architecture** | Monorepo (FE/BE) |

---

## 🔧 Configuration

### Environment Variables

Create `.env` file with:
```
VITE_GEMINI_API_KEY=your_gemini_key_here
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_key
```

See `.env.example` for all options.

---

## 📁 Project Structure

```
├── views/               # 37 view components
├── components/          # Reusable UI components
├── contexts/            # State management
├── services/            # API & business logic
├── hooks/               # Custom React hooks
├── types.ts             # TypeScript definitions
├── App.tsx              # Main app with routing
├── vite.config.ts       # Build configuration
└── package.json         # Dependencies (cleaned)
```

---

## ✅ Quality Assurance

✅ **TypeScript:** 0 errors
✅ **Build:** All passing
✅ **Deployment:** Live & ready
✅ **Documentation:** Comprehensive
✅ **Git:** Clean history with meaningful commits
✅ **Dependencies:** Audited & minimal

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for detailed instructions.

---

## 📋 Feature Checklist

- ✅ Project management
- ✅ Task scheduling
- ✅ Team collaboration
- ✅ Timesheet tracking
- ✅ Safety management
- ✅ Equipment inventory
- ✅ Financial tracking
- ✅ Document management
- ✅ Real-time chat
- ✅ AI-powered features
- ✅ Offline support
- ✅ Error handling
- ✅ Mobile responsive

---

## 🔒 Recent Improvements (v1.3.0)

### Security Hardening
- **Enhanced CSP:** Added objectSrc, frameSrc, baseUri, formAction, upgradeInsecureRequests directives
- **Environment-based CORS:** Automatic production/development origin separation
- **Referrer Policy:** Privacy protection with strict-origin-when-cross-origin

### Performance Optimization
- **Database Indexes:** 30+ performance indexes for high-traffic tables
- **Code Splitting:** All views use lazy loading with chunk load error recovery
- **Bundle Optimization:** Strategic vendor chunking (752KB ONNX isolated)

### Architecture
- **Consolidated Audit Logging:** Single source of truth for all system events
- **Unified Activity Tracking:** Backend-driven activity feed with real-time updates
- **Enhanced Error Handling:** Consistent AppError usage across all controllers

---

## 🤝 Contributing

This is a production-ready application. For bug reports or feature requests, please check the documentation first.

---

## 📄 License

Private project - BuildPro Construction

---

## 🎯 Next Steps

1. **Review** [FINAL_STATUS.md](FINAL_STATUS.md) for complete overview
2. **Setup** environment variables from `.env.example`
3. **Install** dependencies: `npm install`
4. **Run** dev server: `npm run dev`
5. **Deploy** to production: `vercel --prod`

---

**Status:** ✅ Ready for production use  
**Version:** 1.3.0  
**Last Updated:** January 3, 2026
