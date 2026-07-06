# MedGrid 🏥

**Distributed Healthcare Resource Coordination and Emergency Response Platform**

MedGrid is a distributed microservice-based platform built to coordinate real-time healthcare inventory (e.g., blood products, medications, PPE, medical equipment) across different healthcare facilities and bank networks. It empowers coordination managers to discover supply status globally and execute emergency resource transfers instantly.

---

## 🚀 Key Features

- **Real-time Inventory Tracking**: Direct control over stocks categorized by `BLOOD`, `MEDICATION`, `PPE`, and `MEDICAL_EQUIPMENT`.
- **EMCON Network Directory**: Dynamic search panels mapping available supplies across regions, districts, and coordinates.
- **Expiry Monitoring Scanner**: Automated daily background scans auditing inventory expiration timelines, issuing color-coded alerts (`SAFE`, `WARNING`, `CRITICAL`), and auto-publishing critical stocks as marketplace offers.
- **Redistribution Marketplace**: Inter-facility dashboard listing nearby surplus inventories (sorted using Haversine distance calculation) for simplified resource claims and routing.
- **Dynamic Access Enforcements**: Restricts resource generation based on facility profiles (e.g., Blood Banks are restricted to `BLOOD` inventory; Pharmacies are restricted to `MEDICATION`).
- **Gateway Throttling**: Strict login rate limiting (max 5 requests per minute per IP/Email) defending the API gateway from brute-force intrusions.
- **Inter-facility Request Workflows**: End-to-end request pipelines managing transfer requests, priority flags, transit statuses, and delivery confirmations.
- **System Audit Logging**: Comprehensive audit logging tracking all administrative role state adjustments.

---

## 🏗️ Architecture

MedGrid is designed as a distributed, high-performance monorepo using **Turborepo** and **pnpm** workspaces:

```
                  ┌───────────────────────┐
                  │   Vite React Client   │◄── WebSocket (Socket.io Events)
                  └───────────┬───────────┘              │
                              │ HTTPS                    │
                              ▼                          │
                  ┌───────────────────────┐              │
                  │      API Gateway      ├──────────────┘
                  │ (Rate Limiting, Auth  │
                  │  & Socket.io Server)  │
                  └─────┬─────┬─────┬─────┘
                        │     │     │
      ┌─────────────────┘     │     └─────────────────┐
      ▼                       ▼                       ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│ Auth Service │        │ Facility Svc │        │ Coord. Svc   │
└──────────────┘        └──────┬───────┘        └──────────────┘
                               │ (daily cron)
                               ▼
                        ┌──────────────┐
                        │ Expiry Check │ (Background Alerts &
                        │   Scanner    │  Redistribution Offers)
                        └──────┬───────┘
                               │
                               ▼
                  ┌───────────────────────┐
                  │    PostgreSQL DB      │ (Shared Prisma Schema)
                  └───────────────────────┘
```

- **API Gateway (`apps/gateway`)**: Serves as the reverse proxy. Enforces authorization rate limiters and distributes requests downstream.
- **Auth Service (`apps/auth-service`)**: Manages identity provider services, credential validation, elevated role authorization, and audit logs.
- **Facility Service (`apps/facility-service`)**: Handles facility directory registration, staff hierarchies, and active inventory tracking.
- **Coordination Service (`apps/coordination-service`)**: Handles inter-facility transfer requests, status tracking, and dispatch logs.
- **Shared Modules (`packages/`)**:
  - `database`: Houses Prisma schemas, migrations, and standard query clients.
  - `shared`: Stores DTO schemas, Zod request validations, resource rules, and TypeScript enums.

---

## 🛠️ Technology Stack

- **Language**: TypeScript (v6)
- **Build System**: Turborepo & pnpm Workspaces
- **Database**: PostgreSQL with Prisma ORM
- **Microservices Backend**: Node.js & Express.js
- **Frontend Webapp**: React (Vite, TailwindCSS, Lucide Icons, React Hook Form, TanStack Query)

---

## 🏁 Getting Started

### 1. Prerequisites

Ensure you have the following installed on your local machine:

- [Node.js](https://nodejs.org) (v18+)
- [pnpm](https://pnpm.io) (v10+)
- [PostgreSQL](https://www.postgresql.org) database instance running

### 2. Environment Configuration

Create a `.env` file at the project root:

```env
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/medgrid?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
```

### 3. Database Initialization

Generate client queries and sync migration schemas:

```bash
# Generate Prisma Client classes
pnpm db:generate

# Execute schema updates
pnpm db:migrate
```

### 4. Running the Workspaces

Launch all microservices and the Vite dashboard client concurrently:

```bash
# Start development workspace
pnpm dev
```

### 5. Build for Production

```bash
# Clean and compile code
pnpm build
```
