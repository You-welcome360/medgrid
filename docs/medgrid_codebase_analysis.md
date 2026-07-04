# MedGrid Codebase Analysis Report

> **Scope**: All directories in `D:\medgrid` except the `new/` folder.  
> **Date**: 2026-07-03  
> **Analyst**: Antigravity AI

---

## 1. System Architecture Overview

MedGrid is a **healthcare resource coordination platform** built as a **Turborepo monorepo**. It follows a microservices backend pattern exposed through a single API Gateway, consumed by a React/Vite frontend.

### Top-Level Structure

```
D:\medgrid
├── apps/
│   ├── frontend/            # React + Vite SPA
│   ├── auth-service/        # Authentication & user management microservice
│   ├── facility-service/    # Facility & inventory management microservice
│   ├── coordination-service/# Resource request coordination microservice
│   └── gateway/             # API Gateway (single entry point for all API calls)
├── packages/
│   ├── database/            # Shared Prisma schema + client (PostgreSQL)
│   ├── shared/              # Shared TypeScript types, enums, constants
│   ├── config/              # Shared config utilities
│   ├── tsconfig/            # Shared TypeScript configs
│   └── eslint-config/       # Shared ESLint config
├── docs/                    # ADR docs, standards, existing analysis
├── infrastructure/          # Infrastructure/deployment files
├── report/                  # Report artifacts
├── turbo.json               # Turborepo pipeline config
├── pnpm-workspace.yaml      # PNPM workspace definition
└── package.json             # Root package with dev tooling
```

### Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, React Router v6, TanStack Query, Zustand, Zod, shadcn/ui, Sonner |
| Backend (Auth) | Node.js, Express, JWT (access + refresh tokens), bcrypt |
| Backend (Facility) | Node.js, Express |
| Backend (Coordination) | Node.js, Express |
| API Gateway | Node.js, Express (proxy/aggregation) |
| Database | PostgreSQL via Prisma ORM |
| Tooling | Turborepo, PNPM workspaces, Husky, Commitlint, ESLint, Prettier |

---

## 2. Database Schema (Shared — `packages/database`)

All microservices share a single PostgreSQL database via a shared Prisma client.

### Key Enums

| Enum | Values |
|---|---|
| `UserRole` | `SUPER_ADMIN`, `FACILITY_ADMIN`, `COORDINATION_MANAGER`, `INVENTORY_MANAGER` |
| `UserStatus` | `PENDING_APPROVAL`, `ACTIVE`, `LOCKED`, `SUSPENDED`, `DEACTIVATED` |
| `FacilityType` | `HOSPITAL`, `PHARMACY`, `BLOOD_BANK`, `PPE_SUPPLIER` |
| `FacilityStatus` | `ACTIVE`, `INACTIVE`, `SUSPENDED` |
| `ResourceType` | `BLOOD`, `PPE`, `MEDICATION`, `MEDICAL_EQUIPMENT` |
| `InventoryStatus` | `AVAILABLE`, `RESERVED`, `UNAVAILABLE`, `MAINTENANCE`, `EXPIRED`, `DEPLETED` |
| `InventoryUnit` | `UNITS`, `TABLETS`, `CAPSULES`, `VIALS`, `BOXES`, `PACKS`, `PIECES`, `BOTTLES` |
| `StockMovementType` | `RESTOCK`, `CONSUMPTION`, `ADJUSTMENT`, `EXPIRED_REMOVAL`, `DAMAGE`, `TRANSFER_OUT`, `TRANSFER_IN` |
| `RequestStatus` | `PENDING`, `ACCEPTED`, `IN_TRANSIT`, `COMPLETED`, `CANCELLED`, `REJECTED`, `FAILED` |
| `RequestPriority` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `OnboardingRequestStatus` | `PENDING`, `APPROVED`, `REJECTED` |
| `AuditAction` | 30+ audit actions covering AUTH, ONBOARDING, FACILITY, USER, INVENTORY, REQUEST categories |

### Core Models

- **`User`** — email, password hash, first/last name, phone, role, status, facilityId, security fields (failed login attempts, locked until, must change password), audit metadata
- **`Facility`** — name, type, status, phone, email, region, district, addressLine, lat/lng coordinates
- **`OnboardingRequest`** — multi-field facility registration request with admin contact info, status, rejection reason
- **`InventoryItem`** — facilityId, resourceType, itemName, quantity, unit, status, thresholds (low stock, reserved), metadata, price, isMovable
- **`StockMovement`** — tracks every quantity change: movementType, quantity, reason, performedById, referenceId
- **`LowStockAlert`** — triggered when inventory falls below threshold; resolved flag
- **`ResourceRequest`** — complex inter-facility request entity: requesting/supplying facilityIds, priority, status, patient info (JSON), isEmergency, isBroadcast, maxRadiusKm, declinedBy[], timestamps for each lifecycle stage
- **`AuditLog`** — actorId, actorRole, action (AuditAction enum), entityType, entityId, facilityId, previousValue (JSON), newValue (JSON), ipAddress, userAgent

---

## 3. API Gateway (`apps/gateway`)

**Base URL**: `http://localhost:4000/api/v1`

The gateway is the **single entry point** for all frontend API calls. It enforces JWT authentication and RBAC before proxying requests to downstream microservices.

### Gateway Route Prefixes

| Prefix | Downstream Target |
|---|---|
| `/api/v1/auth` | auth-service `/auth` |
| `/api/v1/users` | auth-service `/users` |
| `/api/v1/audit-logs` | auth-service `/audit-logs` |
| `/api/v1/facilities` | facility-service `/facilities` |
| `/api/v1/inventory` | facility-service `/inventory` |
| `/api/v1/onboarding-requests` | facility-service `/onboarding-requests` |
| `/api/v1/requests` | coordination-service `/requests` |
| `/api/v1/health` | Local health check |
| `/api/v1/system` | Local system info |

### RBAC Middleware (Gateway-enforced)

- `requireRole(...roles)` — validates JWT and checks user role against allowed roles
- Roles: `SUPER_ADMIN`, `FACILITY_ADMIN`, `COORDINATION_MANAGER`, `INVENTORY_MANAGER`
- Request logger middleware on all routes

---

## 4. Backend Microservices

### 4.1 Auth Service (`apps/auth-service`)

**Internal port**: (configured separately, proxied via gateway)

#### Auth Module — `/auth`

| Method | Path | Controller | Description |
|---|---|---|---|
| `POST` | `/auth/login` | `loginController` | Authenticate user with email/password; returns JWT access token + sets httpOnly refresh cookie |
| `POST` | `/auth/refresh` | `refreshController` | Use refresh token cookie to get a new access token |
| `POST` | `/auth/logout` | `logoutController` | Clear refresh token cookie, invalidate session |
| `GET` | `/auth/me` | `meController` | Get current authenticated user profile |
| `PATCH` | `/auth/change-password` | `changePasswordController` | Change password (requires current password verification) |

#### Users Module — `/users`

| Method | Path | Controller | Description | Auth |
|---|---|---|---|---|
| `POST` | `/users/invite/complete` | `completeInvitationController` | Complete account registration using invitation token (public endpoint — token carries auth) | Token in body |
| `POST` | `/users/invite` | `inviteUserController` | Facility admin invites a new team member (COORDINATION_MANAGER or INVENTORY_MANAGER) | FACILITY_ADMIN |
| `GET` | `/users/` | `listUsersController` | List all users (scope depends on role: facility-scoped or global) | Protected |
| `GET` | `/users/:id` | `getUserByIdController` | Get single user by ID | Protected |
| `PATCH` | `/users/:id/status` | `updateUserStatusController` | Update user status (activate, suspend, deactivate) | Protected |
| `POST` | `/users/elevate` | `elevateController` | Step-up authentication for SUPER_ADMIN sensitive actions | SUPER_ADMIN |

#### Audit Module — `/audit-logs`

| Method | Path | Description |
|---|---|---|
| `GET` | `/audit-logs` | Query audit logs with filters (action, category, actorRole, facilityId, dateFrom, dateTo, search, page, limit) |

---

### 4.2 Facility Service (`apps/facility-service`)

#### Facilities Module — `/facilities`

| Method | Path | Controller | Description |
|---|---|---|---|
| `POST` | `/facilities/` | `createFacilityController` | Create a new facility (called by gateway after onboarding approval) |
| `GET` | `/facilities/` | `getAllFacilitiesController` | Get all facilities in the network |
| `GET` | `/facilities/:id` | `getFacilityByIdController` | Get a single facility by ID |
| `PATCH` | `/facilities/:id` | `updateFacilityController` | Update facility details (name, phone, email, address, location) |

#### Inventory Module — `/inventory`

| Method | Path | Controller | Description |
|---|---|---|---|
| `POST` | `/inventory/` | `createInventoryController` | Create a new inventory item for the facility |
| `GET` | `/inventory/` | `getInventoryController` | List all inventory items (facility-scoped; optional `resourceType` filter) |
| `GET` | `/inventory/alerts/active` | `getActiveAlertsController` | Get all active low stock alerts for the facility |
| `GET` | `/inventory/available` | `getAvailableInventoryController` | Get only `AVAILABLE` status inventory |
| `GET` | `/inventory/network/resources` | `getNetworkResourcesController` | Get distinct resource types/names available across the entire network |
| `GET` | `/inventory/network/facilities` | `getNetworkFacilitiesController` | Get facilities holding a specific resource (for network directory) |
| `GET` | `/inventory/:id` | `getInventoryItemController` | Get a single inventory item with full details |
| `PATCH` | `/inventory/:id/status` | `updateInventoryStatusController` | Update inventory item status |
| `DELETE` | `/inventory/:id` | `deleteInventoryController` | Delete an inventory item |
| `PATCH` | `/inventory/:id/threshold` | `setThresholdController` | Set low stock alert threshold |
| `PATCH` | `/inventory/:id/reserved-threshold` | `setReservedThresholdController` | Set reserved stock threshold |
| `POST` | `/inventory/:id/movements` | `createStockMovementController` | Record a stock movement (restock, consumption, damage, etc.) |
| `GET` | `/inventory/:id/movements` | `getStockMovementsController` | Get stock movement history for an item |
| `GET` | `/inventory/:id/alerts` | `getAlertsByInventoryController` | Get alert history for a specific inventory item |

#### Onboarding Module — `/onboarding-requests`

| Method | Path | Description |
|---|---|---|
| `POST` | `/onboarding-requests/` | Submit a new facility onboarding/registration request (public) |
| `GET` | `/onboarding-requests/` | List all onboarding requests (optional status filter) |
| `GET` | `/onboarding-requests/:id` | Get a single onboarding request |
| `PATCH` | `/onboarding-requests/:id/approve` | Approve a request (SUPER_ADMIN only); triggers facility + admin user creation |
| `PATCH` | `/onboarding-requests/:id/reject` | Reject a request with a reason (SUPER_ADMIN only) |

---

### 4.3 Coordination Service (`apps/coordination-service`)

#### Requests Module — `/requests`

| Method | Path | Controller | Description |
|---|---|---|---|
| `POST` | `/requests/` | `createRequestController` | Create a new inter-facility resource request |
| `GET` | `/requests/` | `getRequestsController` | List all requests (facility-scoped; optional `status` filter) |
| `GET` | `/requests/broadcasts` | `getBroadcastsController` | Get all active SOS broadcast requests (optional `ignoreRadius` to see all network) |
| `GET` | `/requests/:id` | `getRequestByIdController` | Get a single request with full details |
| `POST` | `/requests/:id/accept` | `acceptRequestController` | Accept a resource request (supplying facility action) |
| `POST` | `/requests/:id/reject` | `rejectRequestController` | Reject a request with a reason |
| `POST` | `/requests/:id/dispatch` | `dispatchRequestController` | Mark request as dispatched / in transit |
| `POST` | `/requests/:id/confirm` | `confirmReceiptController` | Confirm receipt of resources (requesting facility action) |
| `POST` | `/requests/:id/cancel` | `cancelRequestController` | Cancel a pending request with a reason |
| `POST` | `/requests/:id/fail` | `markFailedController` | Mark a request as failed |
| `POST` | `/requests/:id/accept-broadcast` | `claimBroadcastController` | Claim/accept an SOS broadcast request |
| `POST` | `/requests/:id/decline-broadcast` | `declineBroadcastController` | Decline an SOS broadcast request (adds to declinedBy list) |

#### Gateway RBAC for Requests

| Action | Allowed Roles |
|---|---|
| Create request | `COORDINATION_MANAGER` |
| Read requests / broadcasts | All roles |
| Accept / Reject request | `FACILITY_ADMIN`, `COORDINATION_MANAGER` |
| Dispatch / Mark Failed | `INVENTORY_MANAGER`, `FACILITY_ADMIN` |
| Confirm receipt | `INVENTORY_MANAGER`, `FACILITY_ADMIN` |
| Claim / Decline broadcast | `FACILITY_ADMIN`, `COORDINATION_MANAGER`, `INVENTORY_MANAGER` |
| Cancel request | `COORDINATION_MANAGER` |

---

## 5. Frontend Application (`apps/frontend`)

**Framework**: React 18 + Vite + TypeScript  
**Routing**: React Router v6 (file-based lazy loading)  
**State**: Zustand (auth store, theme store) + TanStack Query (server state)  
**API Base**: `http://localhost:4000/api/v1` (configurable via `VITE_API_URL`)  
**Auth**: Bearer JWT in memory + httpOnly refresh cookie auto-managed

### 5.1 Role Definitions (Frontend)

```
ADMIN_ROLES = ['SUPER_ADMIN']
FACILITY_ROLES = ['FACILITY_ADMIN', 'COORDINATION_MANAGER', 'INVENTORY_MANAGER']
```

### 5.2 Route Map

All routes use React lazy loading with a `<Suspense>` fallback (`<LoadingScreen />`).

| Route Path | Component | Access | Layout |
|---|---|---|---|
| `/` | Redirect → `/login` | Public | — |
| `/login` | `LoginPage` | Public | AuthLayout |
| `/register` | `RegisterPage` | Public | AuthLayout |
| `/invite/complete` | `CompleteInvitationPage` | Public (token) | AuthLayout |
| `/change-password` | `ChangePasswordPage` | All roles | AuthLayout |
| `/dashboard` | `DashboardPage` | Facility roles | DashboardLayout |
| `/sos-dashboard` | `SOSDashboardPage` | Facility roles | DashboardLayout |
| `/network-directory` | `NetworkDirectoryPage` | Facility roles | DashboardLayout |
| `/requests` | `RequestsPage` (index) | Facility roles | DashboardLayout |
| `/requests/new` | `RequestsPage` (create) | Facility roles | DashboardLayout |
| `/requests/:id` | `RequestsPage` (detail) | Facility roles | DashboardLayout |
| `/inventory` | `InventoryPage` (index) | Facility roles | DashboardLayout |
| `/inventory/new` | `InventoryPage` (create) | Facility roles | DashboardLayout |
| `/inventory/:id` | `InventoryPage` (detail) | Facility roles | DashboardLayout |
| `/facilities` | `FacilitiesPage` (index) | Facility roles | DashboardLayout |
| `/facilities/:id` | `FacilitiesPage` (detail) | Facility roles | DashboardLayout |
| `/notifications` | `NotificationsPage` | Facility roles | DashboardLayout |
| `/reports` | `ReportsPage` | Facility roles | DashboardLayout |
| `/settings` | `SettingsPage` | Facility roles | DashboardLayout |
| `/users` | `FacilityUsersPage` | `FACILITY_ADMIN` only | DashboardLayout |
| `/admin/dashboard` | `AdminDashboardPage` | `SUPER_ADMIN` only | DashboardLayout |
| `/admin/approvals` | `FacilityApprovalsPage` | `SUPER_ADMIN` only | DashboardLayout |
| `/admin/users` | `UsersPage (admin)` | `SUPER_ADMIN` only | DashboardLayout |
| `/admin/audit` | `AdminAuditLogsPage` | `SUPER_ADMIN` only | DashboardLayout |
| `/unauthorized` | Inline "Access denied" message | Public | — |
| `*` | Redirect → `/login` | — | — |

---

## 6. Page-by-Page Analysis

---

### PAGE: Login `/login`

**File**: [`apps/frontend/src/pages/auth/login.tsx`](file:///D:/medgrid/apps/frontend/src/pages/auth/login.tsx)  
**Layout**: `AuthLayout` (centered card design)  
**Access**: Public  
**Roles**: All (unauthenticated users)

#### Features & Functionality

- **Login Form** with email + password fields
  - Zod validation: valid email format, non-empty password
  - React Hook Form integration
  - Password visibility toggle (eye icon button)
  - Submitting state with spinner animation
- **Role-based Redirect on Login**
  - `SUPER_ADMIN` → `/admin/dashboard`
  - All other roles → `/dashboard`
  - `mustChangePassword: true` → `/change-password` (redirects before normal flow)
  - Preserves the original intended destination (`location.state.from`) if redirected due to auth
- **Error Handling**
  - `401` → Inline password field error
  - Other API errors → Toast notification via Sonner
- **Navigation Links**
  - "Submit a request" link → `/register` (for new facility registration)
- **API Called**: `POST /api/v1/auth/login`
- **State Updated**: Zustand `auth.store` (user + access token)

---

### PAGE: Register (Facility Onboarding) `/register`

**File**: [`apps/frontend/src/pages/auth/register.tsx`](file:///D:/medgrid/apps/frontend/src/pages/auth/register.tsx)  
**Layout**: `AuthLayout`  
**Access**: Public  
**Roles**: Unauthenticated (new facility admins)

#### Features & Functionality

- **4-Step Multi-Step Form** with animated progress stepper
  - **Step 1 — Facility Information**: Facility Name, Facility Type (Hospital / Pharmacy / Blood Bank / PPE Supplier), Facility Email, Facility Phone
  - **Step 2 — Location & Address**: Region, District, Address Line (optional), GPS Latitude, GPS Longitude
  - **Step 3 — Administrator Profile**: Admin First Name, Admin Last Name, Admin Email, Admin Phone (optional)
  - **Step 4 — Review & Submit**: Read-only summary of all entered data for final confirmation
- **Step Validation**: Each step validates only its own fields before advancing; Zod schema enforces:
  - Facility name ≥ 2 chars
  - Facility type must be one of the 4 enum values
  - Phone: 10–20 characters
  - Email: valid format
  - Region / District ≥ 2 chars
  - Latitude: -90 to 90, Longitude: -180 to 180
  - Admin name fields ≥ 2 chars
  - Admin phone: optional, 10–20 chars if provided
- **Navigation**: Back/Next Step buttons, submit on Step 4
- **Success State**: Animated checkmark confirmation screen; redirects to `/login`
- **API Called**: `POST /api/v1/onboarding-requests`
- **Side Navigation Link**: "Already have an account? Sign in" → `/login`
- **Decorative SVG**: Building illustration in left column (desktop only)

---

### PAGE: Complete Invitation `/invite/complete`

**File**: [`apps/frontend/src/pages/auth/complete-invitation.tsx`](file:///D:/medgrid/apps/frontend/src/pages/auth/complete-invitation.tsx)  
**Layout**: `AuthLayout`  
**Access**: Public (invitation token from URL query param)  
**Roles**: Invited users (token-based)

#### Features & Functionality

- Reads `?token=` from URL
- Form for new user to set their password and complete account setup
- **API Called**: `POST /api/v1/users/invite/complete`

---

### PAGE: Change Password `/change-password`

**File**: [`apps/frontend/src/pages/auth/change-password.tsx`](file:///D:/medgrid/apps/frontend/src/pages/auth/change-password.tsx)  
**Layout**: `AuthLayout`  
**Access**: All authenticated roles  
**Roles**: Any logged-in user (enforced via `ProtectedRoute`)

#### Features & Functionality

- Form to change password (same fields as settings page password section)
- Typically triggered when `mustChangePassword: true` on login
- **API Called**: `PATCH /api/v1/auth/change-password`

---

### PAGE: Dashboard `/dashboard`

**File**: [`apps/frontend/src/pages/dashboard.tsx`](file:///D:/medgrid/apps/frontend/src/pages/dashboard.tsx)  
**Layout**: `DashboardLayout`  
**Access**: Facility roles (`FACILITY_ADMIN`, `COORDINATION_MANAGER`, `INVENTORY_MANAGER`)

#### Features & Functionality

- **Personalized Greeting** ("Welcome back, [First Name]")
- **4 Stat Cards** (data from `useDashboardData` which fetches requests + inventory):
  1. **Active Requests** — count of requests with status PENDING / ACCEPTED / IN_TRANSIT; blue icon
  2. **Critical Requests** — count of HIGH or CRITICAL priority requests; red icon
  3. **Inventory Items** — total item count + number of active low stock alerts; green icon
  4. **Resources Available** — sum of quantity across all available inventory items; purple icon
- **Emergency Feed** — displays recent emergency/broadcast requests ordered by urgency
- **Inventory Health** — shows inventory items with low stock alerts and overall status distribution
- **Recent Activity** — recent state changes across all requests (timeline view)
- **Loading States**: All sections use Skeleton loaders while data fetches

#### Data Hooks

- `useDashboardData()` → calls `useRequests()` + `useInventory()` + `useActiveAlerts()` in parallel
- Derived: `activeRequests`, `criticalRequests`, `activeAlerts`, `availableResources`

#### API Calls (via TanStack Query)

- `GET /api/v1/requests` → all requests
- `GET /api/v1/inventory` → all inventory
- `GET /api/v1/inventory/alerts/active` → low stock alerts

---

### PAGE: SOS Dashboard `/sos-dashboard`

**File**: [`apps/frontend/src/pages/sos-dashboard.tsx`](file:///D:/medgrid/apps/frontend/src/pages/sos-dashboard.tsx)  
**Layout**: `DashboardLayout`  
**Access**: Facility roles

#### Features & Functionality

- **Dark-themed emergency UI** — red/gray color scheme with pulsing animations
- **"Live SOS Scan Active"** indicator with animated pulse
- **Radius Toggle** ("Nearby Only" vs. "All Network"):
  - Nearby Only (default): fetches broadcasts within `maxRadiusKm` of the user's facility
  - All Network: fetches ALL active broadcasts regardless of distance (`?ignoreRadius=true`)
- **Broadcast Signal List** (left panel):
  - Each signal shows priority badge, time ago, item + quantity, distance, requesting facility name
  - Pulsing red dot indicator on each card
  - Selected signal highlighted with red glow border
  - Scrollable list (max 600px height)
  - Empty state: animated radio icon with option to switch to All Network
- **Selected Signal Detail Panel** (right panel):
  - SOS badge + priority badge
  - Item name, quantity, unit
  - Time since broadcast was sent
  - Request description text
  - **Clinical Context** — patient condition & blood type (if patient data exists on request)
  - **Requesting Facility info** — name, region/district, distance, phone, email
  - **Action Buttons**:
    - "Dismiss Signal" → calls `declineBroadcast(id)` — removes from user's view (adds to declinedBy)
    - "Accept SOS & Dispatch" → calls `acceptBroadcast(id)` — claims the broadcast, transitions request to ACCEPTED
  - Loading/pending states on buttons

#### API Calls

- `GET /api/v1/requests/broadcasts[?ignoreRadius=true]` — fetches active SOS broadcasts
- `POST /api/v1/requests/:id/accept-broadcast` — claim broadcast
- `POST /api/v1/requests/:id/decline-broadcast` — dismiss broadcast

---

### PAGE: Network Directory `/network-directory`

**File**: [`apps/frontend/src/pages/network-directory.tsx`](file:///D:/medgrid/apps/frontend/src/pages/network-directory.tsx)  
**Layout**: `DashboardLayout`  
**Access**: Facility roles

#### Features & Functionality

- **Split-panel layout** (1/3 catalog + 2/3 supplier details)
- **Resource Catalog Panel** (left):
  - Search box (filters by item name in real-time)
  - Lists all distinct resource types/items available across the network
  - Each resource shows item name, type badge (Blood/PPE/Medication/Equipment), movable/fixed label
  - Clicking a resource selects it and triggers facility lookup
  - Active selection highlighted with primary color border
- **Supplier Details Panel** (right):
  - "Select an item" placeholder state when no resource selected
  - "Out of Stock" state when selected item has no available supply in network
  - **Supplier Table** (when suppliers found):
    - Columns: Facility name + type, Location (district, region), Contact phone, Available quantity + unit, Price, Action button
    - **"Request" button** → navigates to `/requests/new` with pre-filled state: `{ supplyingFacilityId, resourceType, itemName }`
  - Loading spinners while fetching

#### API Calls

- `GET /api/v1/inventory/network/resources` — all distinct resource types in network
- `GET /api/v1/inventory/network/facilities?resourceType=X&itemName=Y` — facilities holding a specific item

---

### PAGE: Requests (List) `/requests`

**File**: [`apps/frontend/src/pages/requests.tsx`](file:///D:/medgrid/apps/frontend/src/pages/requests.tsx)  
**Layout**: `DashboardLayout`  
**Access**: Facility roles

#### Features & Functionality

- **Status Filter Tabs**: All | Pending | Accepted | In Transit | Completed
- **Requests Table** (`RequestsTable` component):
  - Columns: Request ID, Item, Priority badge, Status badge, Requesting Facility, Supplying Facility, Date
  - Clicking a row navigates to `/requests/:id`
  - Loading skeleton rows
  - Empty state when no requests
- **"Create Request" button** (top right) — only visible to `COORDINATION_MANAGER` role → navigates to `/requests/new`

#### Sub-routes

- `/requests` (index) → Requests list
- `/requests/new` → Create Request form
- `/requests/:id` → Request detail

#### API Calls

- `GET /api/v1/requests[?status=X]`

---

### PAGE: Requests (Create) `/requests/new`

**File**: [`apps/frontend/src/features/requests/components/create-request-form.tsx`](file:///D:/medgrid/apps/frontend/src/features/requests/components/create-request-form.tsx)  
**Access**: `COORDINATION_MANAGER` only  
**Route**: `/requests/new`

#### Features & Functionality

- **Multi-field form**:
  - Resource Type (Blood / PPE / Medication / Medical Equipment)
  - Item Name (text)
  - Quantity (number)
  - Unit (select from InventoryUnit enum)
  - Priority (Low / Medium / High / Critical)
  - Description (textarea)
  - Supplying Facility ID (optional — can be pre-filled from Network Directory navigation state)
  - Patient Info section: Name, Age, Phone, Emergency Notes (optional)
  - **Emergency toggle**: `isEmergency` checkbox
  - **Broadcast toggle**: `isBroadcast` checkbox — enables SOS broadcast mode
  - Max Radius (km): enabled when broadcast is checked (filters which facilities receive the SOS)
- **Back button** → returns to `/requests`
- **API Called**: `POST /api/v1/requests`

---

### PAGE: Requests (Detail) `/requests/:id`

**File**: [`apps/frontend/src/features/requests/components/request-detail.tsx`](file:///D:/medgrid/apps/frontend/src/features/requests/components/request-detail.tsx)  
**Access**: All facility roles

#### Features & Functionality

- **Full request information display**:
  - Status badge + priority badge
  - Item name, type, quantity, unit
  - Description
  - Emergency / Broadcast flags
  - Patient information section (if applicable)
  - Requesting facility details (name, type, region, district, phone, email)
  - Supplying facility details (if assigned)
  - Timeline of status changes with timestamps (requested, accepted, dispatched, completed)
  - Rejection / cancellation reason display
  - Reserved threshold warning (if applicable)
- **Role-based Action Buttons** (vary by request status and user's role):
  - `ACCEPT` — supplying facility accepts a PENDING request
  - `REJECT` — supplying facility rejects with reason
  - `DISPATCH` — mark as IN_TRANSIT (inventory manager / facility admin of supplier)
  - `CONFIRM RECEIPT` — requesting facility confirms delivery (marks COMPLETED)
  - `CANCEL` — requesting coordination manager cancels with reason
  - `MARK FAILED`
- **Back button** → `/requests`

#### API Calls

- `GET /api/v1/requests/:id`
- `POST /api/v1/requests/:id/accept`
- `POST /api/v1/requests/:id/reject`
- `POST /api/v1/requests/:id/dispatch`
- `POST /api/v1/requests/:id/confirm`
- `POST /api/v1/requests/:id/cancel`
- `POST /api/v1/requests/:id/fail`

---

### PAGE: Inventory (List) `/inventory`

**File**: [`apps/frontend/src/pages/inventory.tsx`](file:///D:/medgrid/apps/frontend/src/pages/inventory.tsx)  
**Layout**: `DashboardLayout`  
**Access**: Facility roles

#### Features & Functionality

- **Resource Type Filter Tabs**: All | Blood | Medication | PPE | Equipment
- **Low Stock Alert Banner**: Orange warning banner showing count of items below threshold (shown when alerts > 0)
- **Inventory Table** (`InventoryTable` component):
  - Columns: Item Name, Resource Type badge, Quantity + Unit, Status badge, Threshold, Price
  - Clicking a row navigates to `/inventory/:id`
  - Loading skeletons, empty state
- **"Add Item" button** (top right) — visible to `INVENTORY_MANAGER` or `FACILITY_ADMIN` → `/inventory/new`

#### Sub-routes

- `/inventory` (index) → list
- `/inventory/new` → create form
- `/inventory/:id` → item detail

#### API Calls

- `GET /api/v1/inventory[?resourceType=X]`
- `GET /api/v1/inventory/alerts/active`

---

### PAGE: Inventory (Create) `/inventory/new`

**File**: [`apps/frontend/src/features/inventory/components/create-inventory-form.tsx`](file:///D:/medgrid/apps/frontend/src/features/inventory/components/create-inventory-form.tsx)  
**Access**: `INVENTORY_MANAGER`, `FACILITY_ADMIN`

#### Features & Functionality

- **Comprehensive creation form**:
  - Resource Type (select)
  - Item Name (text)
  - Quantity (number)
  - Unit (select from 8 options)
  - Status (Available / Reserved / Unavailable / etc.)
  - Low Stock Threshold (optional number)
  - Reserved Threshold (optional number)
  - Price (optional, for network directory pricing)
  - Is Movable toggle (whether item can be physically transferred)
  - Metadata fields (dynamic key-value pairs for custom attributes)
- **Form validation via Zod**
- **API Called**: `POST /api/v1/inventory`

---

### PAGE: Inventory (Detail) `/inventory/:id`

**File**: [`apps/frontend/src/features/inventory/components/inventory-item-detail.tsx`](file:///D:/medgrid/apps/frontend/src/features/inventory/components/inventory-item-detail.tsx)  
**Access**: All facility roles

#### Features & Functionality

- **Item overview card**: item name, type badge, status badge, quantity + unit
- **Threshold display**: low stock threshold, reserved threshold
- **Metadata display**: key-value pairs (custom fields)
- **Price and movable flag**
- **Stock Movement History**: chronological list/table of all movements (restock, consumption, adjustment, etc.) with movement type, quantity, reason, performer, timestamp
- **Record Movement dialog** (`record-movement-dialog.tsx`):
  - Movement Type (select: RESTOCK, CONSUMPTION, ADJUSTMENT, EXPIRED_REMOVAL, DAMAGE, TRANSFER_OUT, TRANSFER_IN)
  - Quantity
  - Reason (text)
  - Triggers: `POST /api/v1/inventory/:id/movements`
- **Alert History**: list of past low stock alerts for this item
- **Edit/Status Update** actions

#### API Calls

- `GET /api/v1/inventory/:id`
- `GET /api/v1/inventory/:id/movements`
- `GET /api/v1/inventory/:id/alerts`
- `POST /api/v1/inventory/:id/movements`
- `PATCH /api/v1/inventory/:id/status`
- `PATCH /api/v1/inventory/:id/threshold`
- `PATCH /api/v1/inventory/:id/reserved-threshold`

---

### PAGE: Facilities (List) `/facilities`

**File**: [`apps/frontend/src/pages/facilities.tsx`](file:///D:/medgrid/apps/frontend/src/pages/facilities.tsx)  
**Layout**: `DashboardLayout`  
**Access**: Facility roles

#### Features & Functionality

- **Live Search** (client-side filter): filters by facility name, region, or district
- **Facility Cards Grid** (responsive: 1 → 2 → 3 columns):
  - Each card shows: Facility Name, Facility Type badge (color-coded), Status badge, Location (district, region), Phone number
  - Clicking a card navigates to `/facilities/:id`
- **Loading State**: 6 skeleton cards while fetching
- **Empty State**: "No facilities found" with appropriate message

#### Sub-routes

- `/facilities` (index) → list
- `/facilities/:id` → facility profile detail

#### API Calls

- `GET /api/v1/facilities`

---

### PAGE: Facilities (Detail / Profile) `/facilities/:id`

**File**: [`apps/frontend/src/pages/facilities.tsx`](file:///D:/medgrid/apps/frontend/src/pages/facilities.tsx) (`FacilityProfile` component)  
**Access**: Facility roles

#### Features & Functionality

- **Details Card** (2/3 width):
  - Facility icon + Name + Type/Status badges
  - Contact section: Email (with mail icon), Phone (with phone icon)
  - Location section: District + Region, optional address line, GPS coordinates (latitude, longitude) in monospace font
- **Quick Info Card** (1/3 width):
  - Facility UUID (full ID in monospace for copying)
  - Date added (`createdAt`)
- **Back button** → `/facilities`
- **Not Found state**: if facility ID is invalid, shows empty state with "Back to directory" button

#### API Calls

- `GET /api/v1/facilities/:id`

---

### PAGE: Users (Facility Team) `/users`

**File**: [`apps/frontend/src/pages/users.tsx`](file:///D:/medgrid/apps/frontend/src/pages/users.tsx)  
**Layout**: `DashboardLayout`  
**Access**: `FACILITY_ADMIN` only

#### Features & Functionality

- **Team Members Table**:
  - Columns: Member (avatar initials + name + email), Role label, Status badge, Last Login date, Joined date, Actions
  - Status management: Inline `<Select>` dropdown per non-admin row (Active / Suspended / Deactivated)
  - Excludes `FACILITY_ADMIN` and `SUPER_ADMIN` from status change (locked in table)
- **Invite Team Member flow**:
  - "Invite Member" button (top right) → opens dialog
  - **InviteUserDialog**: Email field + Role select (Coordination Manager / Inventory Manager) + "Send Invitation" button
  - **InviteResultDialog** (shown after success): displays invitation details, generates the full invitation URL (`/invite/complete?token=...`), copy-to-clipboard button, "Send via Email" (opens mailto link), expiration date
  - One-time display warning for invitation link
- **Empty State**: "No team members yet" with "Send first invitation" action button

#### API Calls

- `GET /api/v1/users` — lists facility-scoped users
- `POST /api/v1/users/invite` — send invitation
- `PATCH /api/v1/users/:id/status` — update user status

---

### PAGE: Settings `/settings`

**File**: [`apps/frontend/src/pages/settings.tsx`](file:///D:/medgrid/apps/frontend/src/pages/settings.tsx)  
**Layout**: `DashboardLayout`  
**Access**: All facility roles

#### Features & Functionality (4 Sections)

1. **Account Section** — Read-only display of current user info:
   - Full Name, Email, Role (human-readable label), Facility ID (truncated with ellipsis)
   
2. **Facility Profile & Location Section** — Editable (only shown if user has `facilityId`):
   - Loads current facility data via `useFacility(user.facilityId)`
   - Editable fields: Facility Name, Phone Number, Contact Email, Address Line, Region, District, Latitude, Longitude
   - Save Changes → `PATCH /api/v1/facilities/:id`
   - Invalidates React Query `facilities` cache on success
   - Loading + error states for facility fetch
   - Validation: name/region/district ≥ 2 chars, valid email, phone ≥ 5 chars, valid lat/lng ranges

3. **Appearance Section** — Theme toggle:
   - Light / Dark / System (3 buttons with Sun/Moon/Monitor icons)
   - Persisted in `theme.store` (Zustand)
   - CSS class applied to `<html>` element

4. **Change Password Section**:
   - Current Password, New Password, Confirm New Password
   - Validation: new password ≥ 8 chars, must have uppercase + lowercase + number + special char, must differ from current, confirmation must match
   - On success: clears `mustChangePassword` flag in auth store
   - API Called: `PATCH /api/v1/auth/change-password`

---

### PAGE: Notifications `/notifications`

**File**: [`apps/frontend/src/pages/notifications.tsx`](file:///D:/medgrid/apps/frontend/src/pages/notifications.tsx)  
**Layout**: `DashboardLayout`  
**Access**: Facility roles  
**Status**: Stub — currently a placeholder page (281 bytes, returns minimal content)

---

### PAGE: Reports `/reports`

**File**: [`apps/frontend/src/pages/reports.tsx`](file:///D:/medgrid/apps/frontend/src/pages/reports.tsx)  
**Layout**: `DashboardLayout`  
**Access**: Facility roles  
**Status**: Stub — currently a placeholder page (281 bytes, returns minimal content)

---

### PAGE: Admin Dashboard `/admin/dashboard`

**File**: [`apps/frontend/src/pages/admin/dashboard.tsx`](file:///D:/medgrid/apps/frontend/src/pages/admin/dashboard.tsx)  
**Layout**: `DashboardLayout`  
**Access**: `SUPER_ADMIN` only

#### Features & Functionality

- **4 Platform-Wide Stat Cards**:
  1. **Total Facilities** — count of approved onboarding requests (= active facilities); blue icon
  2. **Pending Approvals** — count of PENDING onboarding requests (awaiting review); orange icon
  3. **Total Users** — total user count with active user sub-count; green icon
  4. **All Requests** — total onboarding submissions ever made; purple icon
- **Pending Approvals Table** (2/3 width) — shows PENDING requests with approve/reject actions (`ApprovalsTable` component, same as full approvals page)
- **Recent Users Panel** (1/3 width) — latest 8 users with avatar initials, name, join time, status badge; sorted by `createdAt` descending
- **Loading States**: Skeleton loaders for both panels

#### API Calls

- `GET /api/v1/onboarding-requests` — all onboarding requests
- `GET /api/v1/users` — all users (global scope for super admin)

---

### PAGE: Facility Approvals `/admin/approvals`

**File**: [`apps/frontend/src/pages/admin/approvals.tsx`](file:///D:/medgrid/apps/frontend/src/pages/admin/approvals.tsx)  
**Layout**: `DashboardLayout`  
**Access**: `SUPER_ADMIN` only

#### Features & Functionality

- **Status Filter Tabs**: All (with pending badge count) | Pending | Approved | Rejected
- **Approvals Table** (`ApprovalsTable` component from `features/admin/components/approvals-table.tsx`):
  - Facility details: name, type, email, phone, location (region, district)
  - Administrator details: name, email
  - Submission date
  - Status badge (Pending / Approved / Rejected)
  - **Action Buttons** (PENDING only):
    - **"Approve"** button → `PATCH /api/v1/onboarding-requests/:id/approve` (triggers facility creation + admin user creation)
    - **"Reject"** button → opens rejection dialog with reason text field → `PATCH /api/v1/onboarding-requests/:id/reject`
  - Approved/Rejected rows show reason if rejected
- **Loading State**: Skeleton rows
- **Empty State**: "No requests found"

#### API Calls

- `GET /api/v1/onboarding-requests[?status=X]`
- `PATCH /api/v1/onboarding-requests/:id/approve`
- `PATCH /api/v1/onboarding-requests/:id/reject`

---

### PAGE: Admin Users `/admin/users`

**File**: [`apps/frontend/src/pages/admin/users.tsx`](file:///D:/medgrid/apps/frontend/src/pages/admin/users.tsx)  
**Layout**: `DashboardLayout`  
**Access**: `SUPER_ADMIN` only

#### Features & Functionality

> Note: This page uses the same `users.tsx` file structure as the facility users page but with admin-scoped data (global user list).

- **Global User Table** — all users across the entire platform
- All the same features as the Facility Users page (`/users`) but broader scope:
  - Same table columns: Member, Role, Status, Last Login, Joined, Actions
  - Status management via dropdown for non-admin users
  - Invite Member functionality available

#### API Calls

- `GET /api/v1/users` (returns global list for SUPER_ADMIN)
- `POST /api/v1/users/invite`
- `PATCH /api/v1/users/:id/status`

---

### PAGE: Audit Logs `/admin/audit`

**File**: [`apps/frontend/src/pages/admin/audit-logs.tsx`](file:///D:/medgrid/apps/frontend/src/pages/admin/audit-logs.tsx)  
**Layout**: `DashboardLayout`  
**Access**: `SUPER_ADMIN` only

#### Features & Functionality

- **Advanced Filters Panel** (6-column grid):
  - **Search** — free-text search (actor ID, entity, IP address)
  - **Category** filter — All / AUTH / ONBOARDING / FACILITY / USER / INVENTORY / REQUEST
  - **Actor Role** filter — All Roles / Super Admin / Facility Admin / Coordination Manager / Inventory Manager
  - **Date From** — date picker
  - **Date To** — date picker
  - **Facility ID** — UUID filter
  - **Apply Filters** button (submit)
  - **Clear Filters** button (when any filter is active)
- **Export CSV** button — exports up to 500 logs with all columns (ID, Timestamp, Action, Category, Actor ID, Actor Role, Entity Type, Entity ID, Facility ID, IP Address, User Agent, Previous Value, New Value); downloads as `medgrid_audit_logs_YYYY-MM-DD.csv`
- **Stats Bar** — shows total log count matching filters
- **Log Table** (5 columns: Action, Actor, Target Entity, Context, Timestamp):
  - **Category Badge** — color-coded by category (Indigo=Auth, Emerald=Onboarding, Purple=Facility, Amber=User, Cyan=Inventory, Rose=Request)
  - **Action name** formatted (human-readable)
  - **High Severity Flag**: rows for `LOGIN_FAILED`, `ACCOUNT_LOCKED`, `USER_SUSPENDED`, `REQUEST_FAILED` are highlighted in red with a "Flagged" indicator
  - **Actor** — actor UUID (truncated, tooltip for full), role badge
  - System actions show "System / Automated"
  - **Target Entity** — entity type + UUID (tooltip for full ID)
  - **Context** — facility ID (truncated), session info (IP address + user agent on tooltip hover)
  - **Timestamp** — date + time (formatted)
  - **Expandable Rows**: clicking any row expands it to show a **JSON diff viewer** (Before/After panels showing `previousValue` and `newValue` in pretty-printed JSON)
- **Pagination**: Previous / Next buttons, page X / totalPages counter, 25 logs per page

#### API Calls

- `GET /api/v1/audit-logs?page=X&limit=25&search=X&category=X&actorRole=X&facilityId=X&dateFrom=X&dateTo=X`

---

## 7. Shared Components & UI System

### Layout Components

| Component | Path | Purpose |
|---|---|---|
| `AuthLayout` | `layouts/auth-layout.tsx` | Centered card layout for auth pages |
| `DashboardLayout` | `layouts/dashboard-layout.tsx` | Sidebar + main content area; includes mobile sidebar via Sheet; includes SOSPanicButton for non-admins |

### Shared Components (`components/shared/`)

| Component | Purpose |
|---|---|
| `EmptyState` | Generic empty state with icon, title, description, optional action |
| `LoadingScreen` | Full-screen loading spinner (used during lazy-loaded route transitions) |
| `PageHeader` | Consistent page title + description + optional action button slot |
| `SOSPanicButton` | Floating emergency button — appears on all non-admin pages; triggers emergency broadcast request flow |
| `StatusBadge` | `FacilityStatusBadge` + `UserStatusBadge` + `RequestStatusBadge` — consistent color-coded status pills |

### UI Components (`components/ui/`) — shadcn/ui-based

Alert, Avatar, Badge, Button, Card, Dialog, DropdownMenu, Form, Input, Label, Progress, Select, Separator, Sheet, Sidebar, Skeleton, Table, Tabs, Tooltip

---

## 8. Global State Management

### Zustand Stores (`stores/`)

#### `auth.store.ts`

```typescript
interface AuthState {
  user: AuthenticatedUser | null;
  accessToken: string | null;
  setAuth: (user, token) => void;
  updateUser: (user) => void;
  clearAuth: () => void;
}
```

- Persisted to `localStorage` via Zustand persist middleware
- `setAuth` also calls `setAccessToken()` on the API client singleton
- Used by `useAuth()` and `useAuthInit()` hooks

#### `theme.store.ts`

```typescript
interface ThemeState {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme) => void;
}
```

- Applies class to `<html>` element; persisted to `localStorage`

---

## 9. Frontend API Client (`api/`)

### `client.ts`

- Singleton fetch wrapper with:
  - Base URL: `VITE_API_URL` env var (defaults to `http://localhost:4000/api/v1`)
  - Auto-injects `Authorization: Bearer <token>` if access token is set
  - `credentials: 'include'` for cookie-based refresh token
  - Custom `ApiError` class with `statusCode` property
  - `api.get`, `api.post`, `api.patch`, `api.delete` methods

### API Modules

| File | Endpoints Covered |
|---|---|
| `auth.api.ts` | `login`, `logout`, `me`, `refresh`, `changePassword` |
| `users.api.ts` | `listUsers`, `getUserById`, `inviteUser`, `updateStatus` |
| `facilities.api.ts` | `getFacilities`, `getFacility`, `updateFacility`, `submitOnboardingRequest` |
| `inventory.api.ts` | All inventory CRUD + movements + alerts + network resources/facilities |
| `requests.api.ts` | All request CRUD + lifecycle actions + broadcast endpoints |
| `audit.api.ts` | `list` (paginated audit logs with filters) |

---

## 10. Navigation Structure

### Sidebar (Facility Roles — Non-Admin)

| Nav Item | Route | Icon |
|---|---|---|
| Dashboard | `/dashboard` | LayoutDashboard |
| SOS Broadcasts | `/sos-dashboard` | Radio |
| Requests | `/requests` | ArrowLeftRight |
| Inventory | `/inventory` | Package |
| Facilities | `/facilities` | Building2 |
| Team *(FACILITY_ADMIN only)* | `/users` | Users |
| Network Map | `/network` | Map |
| Network Directory | `/network-directory` | Globe |
| Notifications | `/notifications` | Bell |
| Reports | `/reports` | BarChart3 |
| Settings | `/settings` | Settings |

### Sidebar (SUPER_ADMIN)

| Nav Item | Route | Icon |
|---|---|---|
| Admin Dashboard | `/admin/dashboard` | LayoutDashboard |
| Facility Approvals | `/admin/approvals` | ClipboardCheck |
| Users | `/admin/users` | Users |
| System Monitoring | `/admin/monitoring` | Monitor |
| Reports | `/admin/reports` | BarChart3 |
| Audit Logs | `/admin/audit` | FileText |
| Settings | `/settings` | Settings |

> **Note**: "Network Map" (`/network`), "System Monitoring" (`/admin/monitoring`), and "Reports" pages are referenced in the sidebar nav but do not have implemented route components — they are planned future pages.

---

## 11. SOS Panic Button (Global Feature)

**File**: [`components/shared/sos-panic-button.tsx`](file:///D:/medgrid/apps/frontend/src/components/shared/sos-panic-button.tsx)

- Floating button visible on all non-admin pages
- Triggers an emergency broadcast request creation flow
- Allows quick emergency resource request without navigating to the full requests form

---

## 12. Authentication Flow

```
User visits app
    ↓
useAuthInit() checks localStorage for stored user/token
    ↓
If found → restores session (setAccessToken on API client)
    ↓
ProtectedRoute checks role → allows/redirects to /unauthorized
    ↓
On token expiry → refresh cookie auto-sends to /auth/refresh
    ↓
Login → POST /api/v1/auth/login
    → setAuth(user, token) in Zustand
    → If mustChangePassword → /change-password
    → Role-based redirect
```

---

## 13. Key Business Flows

### Facility Onboarding Flow
```
Public: /register (4-step form)
    ↓ POST /api/v1/onboarding-requests
    ↓ Status: PENDING
Super Admin: /admin/approvals — reviews request
    ↓ POST approve → creates Facility + FACILITY_ADMIN user
    ↓ Admin receives credentials + mustChangePassword = true
Facility Admin: /login → /change-password → /dashboard
```

### Resource Request Lifecycle
```
COORDINATION_MANAGER creates: POST /requests
    Status: PENDING
Supplier (FACILITY_ADMIN or COORDINATION_MANAGER) accepts: POST /requests/:id/accept
    Status: ACCEPTED
Inventory manager dispatches: POST /requests/:id/dispatch
    Status: IN_TRANSIT
Requesting facility confirms receipt: POST /requests/:id/confirm
    Status: COMPLETED

Alternatives:
    Reject → REJECTED (with reason)
    Cancel → CANCELLED (with reason)
    Fail → FAILED
```

### SOS Broadcast Flow
```
COORDINATION_MANAGER creates request with isBroadcast: true + maxRadiusKm
    → Broadcasts appear on /sos-dashboard for facilities within radius
Other facilities see SOS on SOS Dashboard
    → "Accept SOS & Dispatch" → POST /requests/:id/accept-broadcast → ACCEPTED
    → "Dismiss Signal" → POST /requests/:id/decline-broadcast (adds to declinedBy, hides from view)
```

### Inventory Low Stock Alert Flow
```
Inventory item quantity falls below lowStockThreshold
    → LowStockAlert created automatically
    → Appears in Dashboard "Inventory Health" and alert banner on /inventory
    → Alert resolves when quantity rises above threshold
```

### Team Invitation Flow
```
FACILITY_ADMIN: /users → "Invite Member"
    → POST /api/v1/users/invite (email + role)
    → Invitation token returned
    → Invitation link: /invite/complete?token=...
    → Admin shares link (copy or send via email mailto)
Invitee: /invite/complete?token=...
    → POST /api/v1/users/invite/complete (set password)
    → Account activated → login
```

---

## 14. Issues & Observations

### Incomplete Pages (Stubs)
| Page | Route | Status |
|---|---|---|
| Notifications | `/notifications` | 281-byte stub — no implementation |
| Reports | `/reports` | 281-byte stub — no implementation |
| Admin Reports | `/admin/reports` | Sidebar link only — no route |
| Admin Monitoring | `/admin/monitoring` | Sidebar link only — no route |
| Network Map | `/network` | Sidebar link only — no route |

### Role Gaps
- The `FACILITY_ADMIN` Sidebar includes "Team" (`/users`) but the route is protected correctly to `FACILITY_ADMIN` only.
- Admin sidebar references `/admin/monitoring` and `/admin/reports` which are not in the router config — these will 404.

### Frontend Architecture Notes
- All API calls go through a single `api` client singleton with memory-based token storage
- TanStack Query provides automatic refetching, cache invalidation, and loading states
- Form validation is consistently done with Zod + React Hook Form
- `date-fns` used for all date formatting
- All admin-scoped pages are correctly protected with `requireRole` at the gateway level

### Backend Architecture Notes
- Auth uses **dual-token strategy**: short-lived JWT access tokens (memory) + long-lived refresh tokens (httpOnly cookie)
- All services share a single PostgreSQL database via Prisma
- Audit logging is built into the auth-service as a cross-cutting concern
- The gateway enforces RBAC before forwarding; downstream services trust gateway-injected headers

---

*Report generated from full source analysis of `D:\medgrid` (excluding `new/` folder).*
