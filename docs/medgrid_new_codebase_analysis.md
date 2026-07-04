# MedGrid — `new/` Folder Codebase Analysis Report

> **Scope**: `D:\medgrid\new` — the monolithic version of MedGrid.  
> **Date**: 2026-07-03  
> **Analyst**: Antigravity AI

---

## 1. System Architecture Overview

The `new/` folder contains a **monolithic** version of MedGrid, architecturally very different from the microservices version in the root. It has two applications:

```
D:\medgrid\new
├── backend/                    # Single Express.js monolith
│   ├── prisma/                 # Database schema + migrations
│   └── src/
│       ├── index.ts            # Server entry point (Express + Socket.IO + Workers)
│       ├── config/             # env, jwt, prisma, socket, supabase, mailer configs
│       ├── middleware/         # auth, rateLimiter, role, resource access, validate
│       ├── modules/            # Feature modules (auth, admin, coordination, etc.)
│       ├── services/           # Cross-cutting services (notifications, expiry worker)
│       └── utils/              # Email templates, password generation, Paystack
└── frontend/                   # React + Vite SPA
    └── src/
        ├── router.tsx          # React Router v6 routes
        ├── pages/              # Page-level components
        ├── components/         # Layout + auth guard components
        ├── services/           # Axios-based API service layer
        ├── hooks/              # useSocket, useUnreadCount
        └── types/              # Shared TypeScript types
```

### Key Architectural Differences vs. Microservices Version

| Aspect | Microservices (`D:\medgrid`) | Monolith (`D:\medgrid\new`) |
|---|---|---|
| Backend | 3 services + gateway | Single Express server |
| Auth | JWT access + refresh cookie | Single JWT (stored in localStorage) |
| Database | Shared Prisma (multi-service) | Single Prisma instance |
| Real-time | Not implemented | Socket.IO (facility rooms + super admin room) |
| Notifications | Not implemented | Full notification system (DB + WebSocket + Email) |
| Payments | Not implemented | Paystack payment integration |
| Email | Not implemented | Nodemailer (SMTP) with HTML templates |
| Audit | Dedicated audit log system | `InventoryAudit` model only |
| Resource Types | Enum-based (4 types) | Enum-based (7 types, more granular) |
| Facility Registration | Self-service onboarding form | Admin-only creation |

---

## 2. Database Schema (`backend/prisma/schema.prisma`)

Uses **Supabase PostgreSQL** (`DATABASE_URL` + `DIRECT_URL`).

### Enums

| Enum | Values |
|---|---|
| `Role` | `SUPER_ADMIN`, `FACILITY_ADMIN`, `INVENTORY_MANAGER`, `COORDINATION_MANAGER` |
| `FacilityType` | `HOSPITAL`, `BLOOD_BANK`, `PHARMACY`, `SUPPLIER` |
| `ResourceType` | `BLOOD`, `DRUG`, `ICU_BED`, `VENTILATOR`, `OXYGEN_CYLINDER`, `OPERATING_THEATRE`, `OTHER_SUPPLY` |
| `BloodGroup` | `A_POS`, `A_NEG`, `B_POS`, `B_NEG`, `AB_POS`, `AB_NEG`, `O_POS`, `O_NEG` |
| `NotificationType` | `REQUEST_CREATED`, `REQUEST_ACKNOWLEDGED`, `REQUEST_FULFILLED`, `REQUEST_CANCELED`, `REQUEST_EXPIRED`, `BALANCE_LOW`, `BALANCE_TOPUP` |
| `NotificationChannel` | `WEBSOCKET`, `PUSH`, `EMAIL` |

### Core Models

#### `User`
- `id`, `email` (unique), `passwordHash`, `role` (Role enum), `facilityId?`
- `isFirstLogin` — forces password reset on first login
- `isActive` — soft-delete for deactivated users
- `createdBy` — tracks who created the user
- Relations: `Facility`, `CoordinationRequest[]`, `Notification[]`, `UserNotificationPreference[]`

#### `Facility`
- `id`, `name` (unique), `location`, `type` (FacilityType), `phone`
- `balance` — Decimal(10,2) financial balance (default 0.00)
- `latitude`, `longitude` — GPS coordinates for emergency radius queries
- Relations: `User[]`, `InventoryItem[]`, `CoordinationRequest[]` (as requester, fulfiller, acknowledger), `BalanceTransaction[]`, `Notification[]`

#### `InventoryItem`
- `id`, `facilityId`, `resourceType` (ResourceType enum)
- `name?`, `bloodGroup?` (BloodGroup enum, only for BLOOD type)
- `quantity?`, `total?`, `available?` — three separate count fields
- `price?` (Decimal), `expiryDate?`
- `category?`, `unitMeasure?`
- `isMovable` — boolean distinguishing transferable resources (drugs/blood) from fixed infrastructure (ICU beds/theatres)
- Relations: `InventoryAudit[]`

#### `InventoryAudit`
- `id`, `inventoryItemId`, `changedBy` (userId), `previousValue` (JSON), `newValue` (JSON), `createdAt`
- Tracks every change to inventory items

#### `ResourceTypeInfo`
- `id`, `name` (unique), `type` (ResourceType), `defaultPrice` (Decimal)
- Auto-synced from network inventory via the `/coordination/resource-types` endpoint
- Acts as a catalog for creating coordination requests

#### `CoordinationRequest`
- `id`, `facilityId` (requesting), `resourceTypeId`, `quantity`
- `classification` — `"normal"` or `"emergency"` (string, not enum)
- `urgencyLevel` — `"critical"`, `"high"`, `"medium"`, `"low"` (string)
- `timeframeHours?`, `additionalNotes?`
- `status` — `"open"`, `"acknowledged"`, `"in_progress"`, `"fulfilled"`, `"canceled"`, `"expired"` (string)
- Emergency fields: `broadcastRadiusKm?`, `acknowledgedBy?` (facilityId), `acknowledgedAt?`
- Financial fields: `fulfilledBy?` (facilityId), `fulfilledAt?`, `pricePerUnit?`, `totalAmount?`, `paymentStatus` (default `"paid"`), `transactionId?`
- `createdBy` (userId), `createdAt`, `updatedAt`, `expiresAt?`, `deletedAt?`

#### `BalanceTransaction`
- `id`, `facilityId`, `amount`, `type`, `reference?`, `paymentMethod`, `status`, `description?`, `createdAt`
- Records all credits (top-ups) and debits (request payments)

#### `Notification`
- `id`, `userId`, `facilityId`, `type` (NotificationType), `channel` (NotificationChannel)
- `title`, `body`, `data?` (JSON)
- `readAt?`, `deliveredAt?`, `createdAt`

#### `UserNotificationPreference`
- `id`, `userId`, `channel` (NotificationChannel), `enabled`, `emergencyOnly`
- Unique per `[userId, channel]`

---

## 3. Backend Architecture

**Single Entry Point**: `src/index.ts`  
**Port**: Configurable via `PORT` env var (default 3000)  
**Security**: `helmet()` middleware on all routes  
**CORS**: Configurable via `ALLOWED_ORIGINS` env var (comma-separated), defaults to `http://localhost:5173`

### Route Prefixes

| Prefix | Module | Description |
|---|---|---|
| `/auth` | `auth` module | Login, password reset/change, admin facility/manager management |
| `/inventory` | `inventory` module | Facility and network inventory management |
| `/coordination` | `coordination` module | Resource request coordination + resource type catalog |
| `/facility` | `facility` module | Facility profile and financial balance |
| `/webhooks` | `webhooks` module | Paystack payment webhook receiver |
| `/notifications` | `notifications` module | User notification inbox |
| `/user` | `user` module | User notification preferences |

### Supporting Infrastructure

- **Socket.IO**: Initialized on the same HTTP server; JWT-authenticated connections; users join `facility:{facilityId}` rooms; SUPER_ADMIN joins `super_admin` room
- **Expiry Worker**: Background `setInterval` running every 60 seconds; auto-expires emergency requests past their `expiresAt` time; fires notifications on expiry
- **Notification Service**: Central service for delivering multi-channel notifications (WebSocket, Email via Nodemailer, Push placeholder); respects per-user channel preferences

---

## 4. Backend Routes (Complete Reference)

### 4.1 Auth Module — `/auth`

| Method | Path | Controller | Access | Description |
|---|---|---|---|---|
| `POST` | `/auth/login` | `AuthController.login` | Public (rate limited) | Authenticate with email + password; returns `{ token, user }` |
| `POST` | `/auth/reset-password` | `AuthController.resetPassword` | Authenticated (first login only) | Set new password on first login; fails if `isFirstLogin = false` |
| `POST` | `/auth/change-password` | `AuthController.changePassword` | Authenticated | Change password from current to new; validates current password |
| `POST` | `/auth/admin/facilities` | `AdminController.createFacility` | `SUPER_ADMIN` | Create a new facility + generate FACILITY_ADMIN user with auto-generated password |
| `POST` | `/auth/facility/managers` | `AdminController.createManager` | `FACILITY_ADMIN` | Create an INVENTORY_MANAGER or COORDINATION_MANAGER under the admin's facility |
| `GET` | `/auth/facility/managers` | `AdminController.getManagers` | Authenticated | List managers of the current facility (optional `?role=` filter) |
| `DELETE` | `/auth/facility/managers/:id` | `AdminController.deleteManager` | `FACILITY_ADMIN` | Soft-deactivate a manager (`isActive = false`); cannot delete FACILITY_ADMIN |
| `GET` | `/auth/admin/reports` | `AdminController.getReports` | `SUPER_ADMIN` | Global stats: totalFacilities, totalMovableItems, totalBedCapacity; recent inventory audit activity (last 10 changes) |

**Login Response structure:**
```json
{
  "token": "<jwt>",
  "user": {
    "user_id": "...",
    "email": "...",
    "role": "FACILITY_ADMIN",
    "facility_id": "...",
    "facility_type": "HOSPITAL",
    "is_first_login": true
  }
}
```

---

### 4.2 Inventory Module — `/inventory`

All routes require authentication (`authMiddleware`).

| Method | Path | Roles | Description |
|---|---|---|---|
| `GET` | `/inventory/facility/inventory` | `FACILITY_ADMIN`, `INVENTORY_MANAGER`, `SUPER_ADMIN` | Get all inventory items for the current user's facility |
| `PUT` | `/inventory/facility/inventory/blood` | `FACILITY_ADMIN`, `INVENTORY_MANAGER` | Upsert blood stock for a specific blood group; validates via `bloodSchema`; restricted to facilities that can manage blood (`requireResourceAccess("BLOOD")`) |
| `PUT` | `/inventory/facility/inventory/drugs` | `FACILITY_ADMIN`, `INVENTORY_MANAGER` | Upsert drug inventory; validates via `drugSchema` |
| `PUT` | `/inventory/facility/inventory/icu-beds` | `FACILITY_ADMIN`, `INVENTORY_MANAGER` | Update ICU bed availability (total, available); validates via `icuSchema` |
| `PUT` | `/inventory/facility/inventory/ventilators` | `FACILITY_ADMIN`, `INVENTORY_MANAGER` | Update ventilator stock; validates via `ventilatorSchema` |
| `PUT` | `/inventory/facility/inventory/oxygen-cylinders` | `FACILITY_ADMIN`, `INVENTORY_MANAGER` | Update oxygen cylinder stock; validates via `oxygenSchema` |
| `PUT` | `/inventory/facility/inventory/theatres` | `FACILITY_ADMIN`, `INVENTORY_MANAGER` | Update operating theatre availability; validates via `theatreSchema` |
| `PUT` | `/inventory/facility/inventory/supplies` | `FACILITY_ADMIN`, `INVENTORY_MANAGER` | Update general supply stock; validates via `supplySchema` |
| `GET` | `/inventory/network/inventory/resources` | All roles | Get all distinct resource types available across the network (with quantities) |
| `GET` | `/inventory/network/inventory/facilities` | All roles | Get all facilities carrying a specific resource (query: `resourceType`, `bloodGroup`, `name`) |

**Resource Access Control (`requireResourceAccess`)**: Validates that the facility's type permits managing the resource type (e.g., PHARMACY cannot update blood).

---

### 4.3 Coordination Module — `/coordination`

All routes require authentication.

| Method | Path | Description |
|---|---|---|
| `GET` | `/coordination/resource-types` | Auto-sync resource catalog from network inventory; returns all `ResourceTypeInfo` entries; also upserts new items based on current network stock |
| `POST` | `/coordination/requests` | Create a new coordination request (normal or emergency); emergency requests get `expiresAt` set, trigger network-wide broadcast socket event |
| `GET` | `/coordination/requests` | List requests with filters: `status`, `classification`, `urgency_level`, `page`, `limit`; SUPER_ADMIN sees all, others see facility-scoped |
| `GET` | `/coordination/requests/nearby` | Get open/acknowledged **emergency** requests within `radius` km of the current user's facility (uses Haversine formula); requires facility GPS coordinates |
| `GET` | `/coordination/requests/:id` | Get a single request with full details |
| `PUT` | `/coordination/requests/:id/acknowledge` | Responding facility acknowledges an emergency request (sets `acknowledgedBy`, `acknowledgedAt`, status → `"acknowledged"`) |
| `PUT` | `/coordination/requests/:id/fulfill` | Fulfilling facility submits price + quantity; deducts `totalAmount` from requesting facility's balance; status → `"fulfilled"` |
| `PUT` | `/coordination/requests/:id/cancel` | Cancel a request (requesting facility only); status → `"canceled"` |

**Socket Events Emitted by Coordination**:
- `request:created` — emitted to all facilities on new request creation
- `request:acknowledged` — emitted to requesting facility on acknowledgment
- `request:fulfilled` — emitted to requesting facility on fulfillment
- `request:canceled` — emitted to all on cancellation
- `request:expired` — emitted by the expiry worker

---

### 4.4 Facility Module — `/facility`

All routes require authentication.

| Method | Path | Roles | Description |
|---|---|---|---|
| `GET` | `/facility/profile` | All authenticated | Get current user's facility profile (name, location, type, phone, balance, lat/lng, createdAt) |
| `PATCH` | `/facility/profile` | `FACILITY_ADMIN` only | Update facility profile (location, phone, latitude, longitude); name and type are immutable |
| `GET` | `/facility/balance` | All authenticated | Get current balance and recent transaction summary |
| `POST` | `/facility/balance/top-up` | `SUPER_ADMIN`, `FACILITY_ADMIN`, `COORDINATION_MANAGER` | Initialize a Paystack payment to top up facility balance; returns `{ payment_url, reference }` |
| `GET` | `/facility/balance/history` | `SUPER_ADMIN`, `FACILITY_ADMIN`, `COORDINATION_MANAGER` | Paginated transaction history with optional `type`, `start_date`, `end_date` filters |

**Socket Events Emitted by Facility (via notification service)**:
- `balance:topup` — emitted to facility on successful Paystack payment
- `balance:low` — emitted to facility when balance falls below threshold after payment

---

### 4.5 Notifications Module — `/notifications`

All routes require authentication.

| Method | Path | Description |
|---|---|---|
| `GET` | `/notifications/unread-count` | Returns `{ count: number }` of unread notifications for the current user |
| `PUT` | `/notifications/mark-all-read` | Mark all of the current user's notifications as read |
| `GET` | `/notifications/` | Paginated list of user's notifications; query: `read` (boolean), `type`, `page`, `limit` |
| `PUT` | `/notifications/:id/read` | Mark a single notification as read (sets `readAt = now()`) |

---

### 4.6 User Module — `/user`

| Method | Path | Description |
|---|---|---|
| `GET` | `/user/notification-preferences` | Get current user's notification channel preferences (WEBSOCKET, PUSH, EMAIL) |
| `PUT` | `/user/notification-preferences` | Update push and email preferences (`enabled`, `emergency_only` per channel) |

---

### 4.7 Webhooks Module — `/webhooks`

| Method | Path | Description |
|---|---|---|
| `POST` | `/webhooks/paystack` | Receives Paystack webhook events; verifies HMAC signature; handles `charge.success` → credits facility balance + sends notification; handles `charge.failed` → marks transaction failed |

---

## 5. Frontend Application (`new/frontend`)

**Framework**: React 18 + Vite + TypeScript  
**Routing**: React Router v6 (static imports, no lazy loading)  
**State**: `localStorage` (no Zustand — token and user stored directly in `localStorage`)  
**Real-time**: Socket.IO client via `useSocket` hook  
**API Client**: Plain `fetch` with JWT from `localStorage` attached as `Authorization: Bearer`  
**Notifications**: `useUnreadCount` hook polls `/notifications/unread-count`; badge in header

### Auth Strategy

```
localStorage["medgrid_token"]  → JWT Bearer token
localStorage["medgrid_user"]   → Serialized user object
    { user_id, email, role, facility_id, facility_type, is_first_login }
```

Three route guard components in `ProtectedRoute.tsx`:
- `GuestRoute` — redirects authenticated users away from `/login`
- `FirstLoginRoute` — only accessible when `is_first_login = true`; redirects otherwise
- `ProtectedRoute` — verifies authentication + optional `allowedRoles[]` check

---

## 6. Route Map

| Route | Component | Access | Description |
|---|---|---|---|
| `/` | Redirect → `/dashboard` | — | Root redirect |
| `/login` | `LoginPage` | Guest only | Authentication page |
| `/reset-password` | `ResetPasswordPage` | First login only | Forced initial password reset |
| `/dashboard` | `DashboardPage` | All authenticated | Role-aware dashboard |
| `/inventory` | `InventoryPage` | All authenticated | Resource registry |
| `/inventory/:resourceType` | `ResourceTypePage` | All authenticated | Per-resource-type inventory management |
| `/coordination/requests` | `RequestsPage` | `SUPER_ADMIN`, `FACILITY_ADMIN`, `COORDINATION_MANAGER` | Coordination requests list |
| `/coordination/requests/new` | `CreateRequestPage` | `SUPER_ADMIN`, `FACILITY_ADMIN`, `COORDINATION_MANAGER` | Create coordination request |
| `/coordination/requests/:id` | `RequestDetailPage` | `SUPER_ADMIN`, `FACILITY_ADMIN`, `COORDINATION_MANAGER` | Request details + actions |
| `/coordination/emergency` | `EmergencyBoardPage` | `SUPER_ADMIN`, `FACILITY_ADMIN`, `COORDINATION_MANAGER` | Emergency requests board |
| `/facility/balance` | `BalancePage` | All authenticated | Facility financial balance |
| `/facility/profile` | `FacilityProfilePage` | All authenticated | Facility profile view + edit |
| `/notifications` | `NotificationsPage` | All authenticated | Notification inbox |
| `/admin/facilities/new` | `CreateFacilityPage` | `SUPER_ADMIN` only | Register new facility node |
| `/facility/managers` | `ManagersPage` | `FACILITY_ADMIN` only | Staff management |
| `/settings/password` | `ChangePasswordPage` | All authenticated | Change password |
| `/settings/notifications` | `NotificationPreferencesPage` | All authenticated | Notification channel preferences |
| `/unauthorized` | `UnauthorizedPage` | Public | 403 access denied page |
| `*` | Redirect → `/dashboard` | — | 404 catch-all |

---

## 7. Page-by-Page Analysis

---

### PAGE: Login `/login`

**File**: [`pages/auth/LoginPage.tsx`](file:///D:/medgrid/new/frontend/src/pages/auth/LoginPage.tsx)  
**Access**: Guest only (redirects to `/dashboard` if already logged in)

#### Features & Functionality

- **Split-panel layout**: Left panel (desktop only) — dark branded panel with:
  - MedGrid logo, tagline ("A unified network for healthcare resource coordination")
  - "Secure Ledger" + "Real-time Sync" feature badges
  - Stats: "250+ Connected Facilities", "12K+ Resources Managed"
  - SVG grid pattern + emerald glow decoration
- **Right panel** — login form:
  - Email field (accepts shorthand — appends `@medgrid.com` if no `@` present)
  - Password field with show/hide toggle (Eye icon)
  - "Remember my login credentials" checkbox (UI only — no persistent logic)
  - Submit button with `Loader2` spinner while authenticating
  - Inline error display (red card)
- **First-login redirect**: If `data.user.is_first_login === true` → `/reset-password`
- **Normal redirect**: → `/dashboard`
- **Footer note**: "Want to register a new facility? Contact a Super Administrator." (no self-service register)
- **Rate limiting**: Server-side login rate limiter
- **API Called**: `POST /auth/login`
- **Storage**: JWT → `localStorage["medgrid_token"]`; user object → `localStorage["medgrid_user"]`

---

### PAGE: Reset Password `/reset-password`

**File**: [`pages/auth/ResetPasswordPage.tsx`](file:///D:/medgrid/new/frontend/src/pages/auth/ResetPasswordPage.tsx)  
**Access**: `FirstLoginRoute` — only accessible when `is_first_login = true`

#### Features & Functionality

- Forces new users to set a secure password before accessing the platform
- Single `new_password` field (minimum 8 characters enforced server-side)
- On success: updates localStorage user object (`is_first_login = false`), redirects to `/dashboard`
- Cannot be revisited after first login completed (server returns 403)
- **API Called**: `POST /auth/reset-password`

---

### PAGE: Dashboard `/dashboard`

**File**: [`pages/DashboardPage.tsx`](file:///D:/medgrid/new/frontend/src/pages/DashboardPage.tsx)  
**Access**: All authenticated roles  
**Layout**: `DashboardLayout`

#### Features & Functionality — Role-Aware

**For SUPER_ADMIN view:**
- Calls `GET /auth/admin/reports`
- **3 Stat Cards**:
  1. **Registered Facilities** — total facility count
  2. **Global Exchange Stock** — total movable inventory units (drugs, blood, supplies)
  3. **Total Bed Capacity** — sum of available non-movable resources (ICU beds, theatres)
- **Per-Facility Breakdown Table** (with click-to-expand detail):
  - Facility name, type, location, balance
  - Inventory summary per facility
  - Clicking a row opens a side panel with full facility details + inventory breakdown
- **Recent Activity Feed** — last 10 inventory audit entries across all facilities (changedBy user email, resourceType, newValue, timestamp)

**For Facility Roles view:**
- Calls `GET /inventory/facility/inventory` + `GET /inventory/network/inventory/resources` in parallel
- **4 Stat Cards**:
  1. **Total Items** — total quantity across all inventory
  2. **Available Units** — sum of `available` field across all items
  3. **Network Resources** — count of distinct resource types available in the network
  4. (additional computed metrics from inventory data)
- **Local Inventory Summary**: grouped by resource type, shows quantities and expiry status
- **Network Resource Browser**: list of network-wide available resources; clicking a resource opens a facilities panel showing which facilities have that resource and how much

#### API Calls
- `GET /auth/admin/reports` (SUPER_ADMIN only)
- `GET /inventory/facility/inventory` (facility roles)
- `GET /inventory/network/inventory/resources` (facility roles)

---

### PAGE: Inventory (Registry) `/inventory`

**File**: [`pages/inventory/InventoryPage.tsx`](file:///D:/medgrid/new/frontend/src/pages/inventory/InventoryPage.tsx)  
**Access**: All authenticated roles

#### Features & Functionality

- **Dual Tab view**: "Local Registry" | "Network Exchange"

**Local Registry Tab:**
- Search bar (client-side filter by name/type)
- Category filter dropdown (ALL / BLOOD / DRUG / ICU_BED / VENTILATOR / OXYGEN_CYLINDER / OPERATING_THEATRE / OTHER_SUPPLY)
- **Inventory Cards** grouped by resource type:
  - Resource type icon + label
  - Each item: name/blood group, quantity/total/available, price, expiry date (with color-coded expiry warnings), category/unit
  - Clickable → navigates to `/inventory/:resourceType`
- **Update buttons per resource type**: "Add/Update [Type]" button → opens inline modal form:
  - **Blood form**: blood group select (8 options), quantity, expiry date
  - **Drug form**: name, price, quantity, expiry date, category, unit measure
  - **ICU Bed form**: total beds, available beds
  - **Ventilator form**: total, available
  - **Oxygen Cylinder form**: total, available
  - **Theatre form**: total, available
  - **Supply form**: name, quantity, unit, price, category
- Update buttons are hidden for resource types the facility type cannot manage (e.g., Pharmacy cannot update ICU beds — enforced via `resource.access.ts` middleware on backend + `facilityType` check on frontend)

**Network Exchange Tab:**
- Shows all distinct resources available across the entire network
- **Network Resource Cards**: resource type, name/blood group, aggregate availability indicator
- Clicking a network resource → opens a modal showing all facilities carrying that resource (facility name, type, location, quantity/available, price)
- **"Coordinate Request" button** on network resource modal → navigates to `/coordination/requests/new`

#### API Calls
- `GET /inventory/facility/inventory`
- `GET /inventory/network/inventory/resources`
- `GET /inventory/network/inventory/facilities?resourceType=X&bloodGroup=Y&name=Z`
- `PUT /inventory/facility/inventory/blood`
- `PUT /inventory/facility/inventory/drugs`
- `PUT /inventory/facility/inventory/icu-beds`
- `PUT /inventory/facility/inventory/ventilators`
- `PUT /inventory/facility/inventory/oxygen-cylinders`
- `PUT /inventory/facility/inventory/theatres`
- `PUT /inventory/facility/inventory/supplies`

---

### PAGE: Resource Type Detail `/inventory/:resourceType`

**File**: [`pages/inventory/ResourceTypePage.tsx`](file:///D:/medgrid/new/frontend/src/pages/inventory/ResourceTypePage.tsx)  
**Access**: All authenticated roles

#### Features & Functionality

- URL param `resourceType` → one of: `BLOOD`, `DRUG`, `ICU_BED`, `VENTILATOR`, `OXYGEN_CYLINDER`, `OPERATING_THEATRE`, `OTHER_SUPPLY`
- **Back button** → `/inventory`
- **Resource Type Header**: icon + human-readable label + item count
- **Inventory Table** (filtered to just this resource type):
  - Blood: shows blood group, quantity, expiry, movable flag
  - Drug: shows name, price, quantity, expiry, category, unit
  - Equipment (ICU/Ventilator/Oxygen/Theatre): shows total, available
  - Supply: shows name, quantity, unit, category, price
- **Write Permission Guard**: shows the update form only if the facility type is allowed to manage this resource type
- **Update Form** (same forms as InventoryPage modals, rendered inline here):
  - For BLOOD: blood group + quantity + expiry date
  - For DRUG: name + price + quantity + expiry + category + unit
  - For fixed equipment: total + available
  - For SUPPLY: name + quantity + unit + price + category
- **Audit History**: list of recent `InventoryAudit` entries for items in this resource type (previousValue → newValue diffs)
- Form submission success shows a `CheckCircle` success indicator

#### API Calls (same as InventoryPage update calls, filtered by type)

---

### PAGE: Coordination Requests `/coordination/requests`

**File**: [`pages/coordination/RequestsPage.tsx`](file:///D:/medgrid/new/frontend/src/pages/coordination/RequestsPage.tsx)  
**Access**: `SUPER_ADMIN`, `FACILITY_ADMIN`, `COORDINATION_MANAGER`

#### Features & Functionality

- **Header** with "New Request" button → `/coordination/requests/new`
- **Multi-filter bar**:
  - Search (client-side, by resource name)
  - Status filter: open / acknowledged / in_progress / fulfilled / canceled / expired
  - Classification filter: normal / emergency
  - Urgency filter: critical / high / medium / low
- **Requests Table** (paginated, 20 per page):
  - Columns: Request ID (truncated), Resource Name, Quantity, Classification badge, Urgency badge, Status badge, Timeframe, Created date
  - Clicking a row → navigates to `/coordination/requests/:id`
  - Emergency requests highlighted distinctly
  - Pagination: Previous / Next buttons with page counter
- **Real-time Updates**: Listens to Socket.IO events:
  - `request:created` → reload list
  - `request:acknowledged` → reload
  - `request:fulfilled` → reload
  - `request:canceled` → reload

#### API Calls
- `GET /coordination/requests?page=X&limit=20[&status=X&classification=X&urgency_level=X]`

---

### PAGE: Create Request `/coordination/requests/new`

**File**: [`pages/coordination/CreateRequestPage.tsx`](file:///D:/medgrid/new/frontend/src/pages/coordination/CreateRequestPage.tsx)  
**Access**: `SUPER_ADMIN`, `FACILITY_ADMIN`, `COORDINATION_MANAGER`

#### Features & Functionality

- **Back breadcrumb** → `/coordination/requests`
- **Balance display** (for non-SUPER_ADMIN): shows current facility balance; estimated cost updates as resource type + quantity are changed
- **Classification toggle**: "Normal Request" | "Emergency Broadcast"
- **Form fields**:
  - Resource Type (select from `ResourceTypeInfo` catalog — auto-populated from network)
  - Quantity (number)
  - Urgency Level (critical / high / medium / low)
  - Timeframe Hours (optional)
  - Additional Notes (optional)
  - Broadcast Radius in km (shown only for emergency — select: 10km / 25km / 50km / 100km)
- **Cost Estimation Panel**: shows `selectedResource.default_price × quantity`; red warning if `balance < estimatedCost`
- **Emergency validation**: Emergency requests require `urgencyLevel` to be `critical` or `high`
- On submit → navigates to the new request's detail page
- **API Calls**:
  - `GET /coordination/resource-types` (on load — populates resource select)
  - `GET /facility/balance` (on load — shows balance for cost check; skipped for SUPER_ADMIN)
  - `POST /coordination/requests`

---

### PAGE: Request Detail `/coordination/requests/:id`

**File**: [`pages/coordination/RequestDetailPage.tsx`](file:///D:/medgrid/new/frontend/src/pages/coordination/RequestDetailPage.tsx)  
**Access**: `SUPER_ADMIN`, `FACILITY_ADMIN`, `COORDINATION_MANAGER`

#### Features & Functionality

- **Back button** → `/coordination/requests`
- **Status Stepper**: visual progress indicator showing `open → acknowledged → fulfilled` flow
- **Status badge** + urgency badge
- **Request Information card**:
  - Resource type + name, quantity requested
  - Classification (Normal / Emergency badge)
  - Urgency level badge
  - Timeframe hours (if set)
  - Additional notes
  - Requesting facility (name + ID)
  - Created at timestamp
  - **Live Countdown** (for emergency requests with `expiresAt`) — ticks every second
- **Financial Details** (when fulfilled):
  - Price per unit, quantity fulfilled, total amount, payment status, transaction ID
- **Fulfilling Facility info** (when fulfilled/acknowledged)
- **Role-based Action Buttons**:
  - `ACKNOWLEDGE` (emergency, status = open) — opens "Acknowledge" modal → `PUT /coordination/requests/:id/acknowledge`
  - `FULFILL` — opens Fulfill modal with: Price Per Unit, Quantity Fulfilled, Responding Facility ID → `PUT /coordination/requests/:id/fulfill`
  - `CANCEL` (status = open or acknowledged) — opens Cancel confirmation → `PUT /coordination/requests/:id/cancel`
- **Real-time sync**: Listens to `request:acknowledged`, `request:fulfilled`, `request:canceled` socket events → auto-reloads request data

#### API Calls
- `GET /coordination/requests/:id`
- `PUT /coordination/requests/:id/acknowledge`
- `PUT /coordination/requests/:id/fulfill`
- `PUT /coordination/requests/:id/cancel`

---

### PAGE: Emergency Board `/coordination/emergency`

**File**: [`pages/coordination/EmergencyBoardPage.tsx`](file:///D:/medgrid/new/frontend/src/pages/coordination/EmergencyBoardPage.tsx)  
**Access**: `SUPER_ADMIN`, `FACILITY_ADMIN`, `COORDINATION_MANAGER`

#### Features & Functionality

- **Radius Selector**: 4 options (10km / 25km / 50km / 100km); changing radius reloads the list
- **GPS Requirement**: If the user's facility has no GPS coordinates, shows an error message explaining they need a Super Admin to set their coordinates
- **Emergency Request Cards** (open/acknowledged within radius):
  - Urgency badge (color-coded: critical=red, high=orange, medium=amber, low=slate)
  - Resource type + name + quantity
  - Distance in km from user's facility
  - Requesting facility name + location
  - Live countdown timer (`expiresAt`)
  - Classification and urgency badges
- **"Acknowledge" button** on each card:
  - Disabled for own-facility requests
  - Disabled for already-acknowledged requests
  - On click: `PUT /coordination/requests/:id/acknowledge`
  - On success: card status updates inline to "acknowledged"
  - Shows success check icon
- **Refresh button** — manual reload
- **Real-time updates**: Listens to socket events:
  - `request:created` (emergency classification) → reload list
  - `request:acknowledged` → reload list
  - `request:expired` → reload list
- **Empty state**: "No emergency requests nearby" with quiet visual indicator

#### API Calls
- `GET /coordination/requests/nearby?radius=X`
- `PUT /coordination/requests/:id/acknowledge`

---

### PAGE: Facility Balance `/facility/balance`

**File**: [`pages/facility/BalancePage.tsx`](file:///D:/medgrid/new/frontend/src/pages/facility/BalancePage.tsx)  
**Access**: All authenticated (facility users)

#### Features & Functionality

- **Balance Card** (hero section):
  - Current balance (large number formatted as currency)
  - "Top Up Balance" button → opens Top Up modal
- **Top Up Modal** (Paystack payment flow):
  - Amount input field (validated > 0)
  - On submit: `POST /facility/balance/top-up` → receives `{ payment_url, reference }`
  - Opens Paystack checkout in a new tab (`window.open(payment_url, '_blank')`)
  - Paystack redirects back via `callback_url` after payment; webhook handles the credit
- **Transaction History Table**:
  - Columns: Date, Type (credit/debit), Amount, Payment Method, Status badge, Description
  - Type filter dropdown: All / credit / debit
  - Paginated (20 per page), Previous/Next pagination
  - TrendingUp icon for credits, TrendingDown for debits
- **Real-time Socket Updates**:
  - `balance:topup` → updates displayed balance + reloads transaction history
  - `balance:low` → updates displayed balance (shows warning indicator)

#### API Calls
- `GET /facility/balance`
- `POST /facility/balance/top-up`
- `GET /facility/balance/history[?type=X&page=X&limit=20]`

---

### PAGE: Facility Profile `/facility/profile`

**File**: [`pages/facility/FacilityProfilePage.tsx`](file:///D:/medgrid/new/frontend/src/pages/facility/FacilityProfilePage.tsx)  
**Access**: All authenticated (facility users)

#### Features & Functionality

- **Profile Header**: Facility type badge (color-coded: Hospital=blue, Blood Bank=red, Pharmacy=emerald, Supplier=purple), facility name, location, created date
- **Info Cards** (read-only display):
  - Location (with MapPin icon)
  - Phone number
  - GPS Coordinates (latitude, longitude with Navigation icon) — shows Google Maps external link
  - Balance (with Wallet icon, formatted as currency)
- **Edit Mode** (FACILITY_ADMIN only — "Edit Profile" button):
  - In-place form editing for: Location (text), Phone, Latitude (number), Longitude (number)
  - "Save" and "Cancel" buttons
  - Validation: lat/lng must be valid numbers if provided
  - On success: shows `CheckCircle2` success banner, updates local state
  - On error: shows `AlertCircle` error message
- **Non-admin view**: "Edit Profile" button hidden; read-only info display only

#### API Calls
- `GET /facility/profile` (on load)
- `PATCH /facility/profile` (FACILITY_ADMIN only, on save)

---

### PAGE: Managers `/facility/managers`

**File**: [`pages/facility/ManagersPage.tsx`](file:///D:/medgrid/new/frontend/src/pages/facility/ManagersPage.tsx)  
**Access**: `FACILITY_ADMIN` only

#### Features & Functionality

- **Managers Table**:
  - Columns: Email, Role (human-readable label), First Login status (badge), Created at, Actions
  - `Trash2` icon → deactivate manager (soft-delete; confirmation prompt via `window.confirm`)
  - Loading skeleton state
- **Invite Manager Form** (top of page):
  - Email field
  - Role select: "inventory_manager" | "coordination_manager"
  - "Add Manager" submit button with loading spinner
- **Invite Result Modal** (shown after successful creation):
  - Displays generated email + initial password (shown once)
  - Copy-to-clipboard button for the initial password
  - Warning: "Share these credentials securely. This will not be shown again."
- **Empty state**: "No managers found" with prompt to add one

#### API Calls
- `GET /auth/facility/managers`
- `POST /auth/facility/managers`
- `DELETE /auth/facility/managers/:id`

---

### PAGE: Notifications `/notifications`

**File**: [`pages/notifications/NotificationsPage.tsx`](file:///D:/medgrid/new/frontend/src/pages/notifications/NotificationsPage.tsx)  
**Access**: All authenticated

#### Features & Functionality

- **Mark All Read** button (top right) — calls `PUT /notifications/mark-all-read`; resets unread badge counter
- **Filter bar**:
  - Read status: All / Unread / Read
  - Type filter: All / REQUEST_CREATED / REQUEST_ACKNOWLEDGED / REQUEST_FULFILLED / REQUEST_CANCELED / REQUEST_EXPIRED / BALANCE_LOW / BALANCE_TOPUP
- **Notification List** (paginated, 20 per page):
  - Each notification shows:
    - Type badge (color-coded per notification type: blue=created, cyan=acknowledged, emerald=fulfilled, orange=expired, red=balance_low, violet=balance_topup)
    - Title + body text
    - Timestamp (relative)
    - Unread dot indicator
  - **Clicking an unread notification** → marks as read (`PUT /notifications/:id/read`), removes unread dot, decrements global badge count
- **Pagination**: Previous/Next buttons

#### API Calls
- `GET /notifications/?page=X&limit=20[&read=X&type=X]`
- `PUT /notifications/:id/read`
- `PUT /notifications/mark-all-read`

---

### PAGE: Create Facility `/admin/facilities/new`

**File**: [`pages/admin/CreateFacilityPage.tsx`](file:///D:/medgrid/new/frontend/src/pages/admin/CreateFacilityPage.tsx)  
**Access**: `SUPER_ADMIN` only

#### Features & Functionality

- **Form fields**:
  - Facility Name (text)
  - Location (text — address/city)
  - Phone (text)
  - Admin Email (email field)
  - Facility Type (select: Hospital / Blood Bank / Pharmacy / Supplier)
- **On success**: shows a credential card with:
  - Facility name + admin email
  - Initial password (auto-generated on server) with copy-to-clipboard button
  - Warning: share credentials securely
  - "Register Another" button to reset form
- **Error handling**: inline error card with descriptive messages (duplicate name, duplicate email, etc.)

#### API Called
- `POST /auth/admin/facilities`

---

### PAGE: Change Password `/settings/password`

**File**: [`pages/auth/ChangePasswordPage.tsx`](file:///D:/medgrid/new/frontend/src/pages/auth/ChangePasswordPage.tsx)  
**Access**: All authenticated

#### Features & Functionality

- Two fields: Current Password + New Password (both with show/hide toggles)
- Minimum 8 characters validation
- On success: success banner displayed
- **API Called**: `POST /auth/change-password`

---

### PAGE: Notification Preferences `/settings/notifications`

**File**: [`pages/settings/NotificationPreferencesPage.tsx`](file:///D:/medgrid/new/frontend/src/pages/settings/NotificationPreferencesPage.tsx)  
**Access**: All authenticated

#### Features & Functionality

- **3 Channel Rows**: In-App (WebSocket), Push, Email
- **In-App (WebSocket)**: always enabled, not editable; shows Globe icon
- **Push Notifications** (editable):
  - Toggle: Enabled / Disabled
  - Toggle: Emergency Only
- **Email Notifications** (editable):
  - Toggle: Enabled / Disabled
  - Toggle: Emergency Only
- **Save button** — saves only push + email preferences (WebSocket is immutable)
- On success: `CheckCircle2` success indicator (auto-dismisses after 3 seconds)

#### API Calls
- `GET /user/notification-preferences` (on load)
- `PUT /user/notification-preferences`

---

### PAGE: Unauthorized `/unauthorized`

**File**: [`pages/UnauthorizedPage.tsx`](file:///D:/medgrid/new/frontend/src/pages/UnauthorizedPage.tsx)  
**Access**: Public

#### Features & Functionality

- Minimal "403 Access Denied" page
- "Go Back" button

---

## 8. Real-Time System (Socket.IO)

### Connection
- Frontend connects on `DashboardLayout` mount via `useSocket()` hook
- JWT passed as `{ auth: { token } }` in Socket.IO handshake
- Server validates JWT on connection; extracts `facility_id` and `role`
- Users auto-join `facility:{facilityId}` room (or `super_admin` room)

### Socket Events (Server → Client)

| Event | Emitted To | When |
|---|---|---|
| `request:created` | All facilities | New coordination request created |
| `request:acknowledged` | Requesting facility | Request acknowledged by another facility |
| `request:fulfilled` | Requesting facility | Request fulfilled |
| `request:canceled` | All facilities | Request canceled |
| `request:expired` | All facilities | Emergency request auto-expired by worker |
| `balance:topup` | Facility | Paystack payment confirmed |
| `balance:low` | Facility | Balance falls below threshold after payment |

### Client Hooks

- **`useSocket()`**: establishes connection on mount, disconnects on unmount; exposes `useSocketEvent(event, handler)` for declarative event subscriptions
- **`useUnreadCount()`**: polls `GET /notifications/unread-count` on mount; used to render the notification bell badge in the header; exposes `decrement()` and `reset()` methods

---

## 9. Notification System

**Service**: `src/services/notification.service.ts`  
**Channels**: WebSocket (always), Email (if SMTP configured + user preference), Push (preference stored but delivery not fully implemented)

### Email Templates (`src/utils/emailTemplates.ts`)

| Template | Trigger |
|---|---|
| `requestCreatedEmail` | New coordination request created |
| `requestAcknowledgedEmail` | Request acknowledged by facility |
| `requestFulfilledEmail` | Request fulfilled |
| `requestCanceledEmail` | Request canceled |
| `requestExpiredEmail` | Emergency request expired |
| `balanceLowEmail` | Balance falls below configured threshold |
| `balanceTopupEmail` | Balance topped up successfully |

### Delivery Logic
- Fetches users for the target facility
- Checks per-user channel preferences
- If `emergency_only = true` for a channel, only sends emergency-related notification types
- Persists notification to DB for all channels
- Delivers WebSocket event to facility room via `emitToFacility()`
- Sends email via Nodemailer if SMTP is configured and preference allows

---

## 10. Payment System (Paystack)

**Utility**: `src/utils/paystack.ts`  
**Currency**: GH¢ or NGN (amounts passed as decimal, converted to cents for Paystack API)

### Top-Up Flow

```
User: POST /facility/balance/top-up { amount, callback_url }
    ↓
Backend: PaystackService.initializeTransaction(email, amount, callbackUrl)
    → Creates BalanceTransaction { type: "credit", status: "pending", reference }
    → Returns { payment_url, reference }
Frontend: window.open(payment_url, '_blank')  ← Paystack hosted checkout
    ↓
User completes payment on Paystack
    ↓
Paystack: POST /webhooks/paystack { event: "charge.success", data: { reference } }
    → Verifies HMAC signature
    → FacilityService.processPaystackWebhook(reference, "success")
        → Credits facility balance
        → Updates BalanceTransaction status → "success"
        → Fires notification: BALANCE_TOPUP (websocket + email)
        → If balance < BALANCE_LOW_THRESHOLD: fires BALANCE_LOW notification
```

### Mock Mode
When `PAYSTACK_SECRET_KEY` is not set, `PaystackService` returns a mock URL instead of calling the real API (useful for local development).

---

## 11. Background Workers

### Expiry Worker (`src/services/expiry.worker.ts`)
- Runs every **60 seconds**
- Finds all `CoordinationRequest` records where:
  - `classification = "emergency"`
  - `status IN ("open", "acknowledged")`
  - `expiresAt <= now()`
- Bulk-updates their status to `"expired"`
- Fires `notifyRequestExpired(id)` for each expired request (non-blocking)
- Starts immediately on server boot

---

## 12. Navigation Structure

### Sidebar Menu Items (by role)

| Nav Item | Route | Icon | Shown To |
|---|---|---|---|
| Dashboard | `/dashboard` | LayoutDashboard | All |
| Resource Registry | `/inventory` | Package | All |
| Coordination | `/coordination/requests` | ArrowLeftRight | Admin, Facility Admin, Coord Manager |
| Emergency Board | `/coordination/emergency` | Zap | Admin, Facility Admin, Coord Manager |
| Facility Balance | `/facility/balance` | Wallet | Non-SUPER_ADMIN |
| Facility Profile | `/facility/profile` | Building2 | Non-SUPER_ADMIN |
| New Facility | `/admin/facilities/new` | PlusCircle | SUPER_ADMIN only |
| Manage Staff | `/facility/managers` | Users | FACILITY_ADMIN only |
| Change Password | `/settings/password` | Key | All |
| Notifications | `/settings/notifications` | Settings | All |

**Header**: Always shows notification bell with unread count badge; facility reference ID (truncated UUID)

---

## 13. Key Business Flows

### Facility Onboarding (Admin-Controlled)
```
SUPER_ADMIN: /admin/facilities/new
    → POST /auth/admin/facilities
    → Creates Facility + FACILITY_ADMIN user (auto-generated password, isFirstLogin=true)
    → Credentials displayed once (copy-to-clipboard)
    → Admin shares credentials securely
FACILITY_ADMIN: /login → is_first_login=true → /reset-password
    → POST /auth/reset-password
    → /dashboard
```

### Staff Management
```
FACILITY_ADMIN: /facility/managers
    → POST /auth/facility/managers { email, role: "inventory_manager"|"coordination_manager" }
    → Auto-generated password returned and displayed once
    → Manager: /login → /reset-password → /dashboard
    → DELETE /auth/facility/managers/:id → soft deactivation
```

### Normal Coordination Request Flow
```
COORD_MANAGER: /coordination/requests/new
    → POST /coordination/requests { classification: "normal", ... }
    → socket: request:created → all facilities notified
    → Status: "open"
Other facility: POST /coordination/requests/:id/fulfill
    { price_per_unit, quantity_fulfilled, responding_facility_id }
    → Deducts totalAmount from requesting facility balance
    → Status: "fulfilled"
    → socket: request:fulfilled → requesting facility notified
    → Notifications: BALANCE_LOW if balance drops
```

### Emergency Broadcast Flow
```
COORD_MANAGER: /coordination/requests/new (classification: "emergency")
    → POST /coordination/requests { classification: "emergency", broadcast_radius_km: 25, urgency_level: "critical" }
    → expiresAt calculated (timeframe_hours or default)
    → socket: request:created (emergency) → visible on Emergency Board
    → Status: "open"
Nearby facility: /coordination/emergency → GET /coordination/requests/nearby?radius=25
    → Sees emergency card
    → PUT /coordination/requests/:id/acknowledge
    → Status: "acknowledged"
    → socket: request:acknowledged → requesting facility notified
    → Later: PUT /coordination/requests/:id/fulfill
        → Status: "fulfilled"
Expiry Worker (if unfulfilled):
    → Auto-transitions to "expired" after expiresAt
    → Notification: REQUEST_EXPIRED
```

### Balance Top-Up Flow
```
User: /facility/balance → "Top Up" button
    → POST /facility/balance/top-up { amount, callback_url }
    → Paystack checkout in new tab
Paystack webhook: POST /webhooks/paystack
    → balance credited
    → socket: balance:topup → BalancePage updates live
    → If balance < BALANCE_LOW_THRESHOLD: socket: balance:low
```

---

## 14. Key Observations & Differences from Microservices Version

### What's More Complete (New vs. Microservices)
| Feature | Microservices | Monolith (`new/`) |
|---|---|---|
| Notifications | ❌ Not implemented | ✅ Full system (DB + WS + Email) |
| Real-time updates | ❌ Not implemented | ✅ Socket.IO on all key events |
| Payment system | ❌ Not present | ✅ Paystack integration |
| Email notifications | ❌ Not present | ✅ HTML email templates via Nodemailer |
| Emergency expiry | ❌ Not present | ✅ Background worker (60s interval) |
| Resource type granularity | 4 types (BLOOD, PPE, MEDICATION, MEDICAL_EQUIPMENT) | 7 types (+ ICU_BED, VENTILATOR, OXYGEN_CYLINDER, OPERATING_THEATRE) |
| Facility self-registration | ✅ Multi-step onboarding form | ❌ Admin-only creation |
| Audit logs | ✅ Full system-wide audit logs | ✅ Inventory-specific `InventoryAudit` only |

### Authentication Differences
- **Microservices**: Dual-token (JWT access token in memory + httpOnly refresh cookie)
- **Monolith**: Single JWT stored in `localStorage` (less secure — susceptible to XSS)

### Request Lifecycle Differences
- **Microservices**: `PENDING → ACCEPTED → IN_TRANSIT → COMPLETED | CANCELLED | REJECTED | FAILED` (7 states)
- **Monolith**: `open → acknowledged → fulfilled | canceled | expired` (5 states, no "dispatch/in-transit" concept)

### Data State Management
- **Microservices**: TanStack Query (server state cache + refetching)
- **Monolith**: Manual `useState` + `useEffect` + explicit API calls (no caching layer)

### Missing from Monolith vs. Microservices
- No "SOS Panic Button" floating widget
- No admin-level approvals flow (monolith uses direct creation by SUPER_ADMIN)
- No network directory search page (only accessible through InventoryPage network tab)
- No reports page (admin reports only accessible via Dashboard stats)
- No settings page for facility profile (only accessible via `/facility/profile`)

---

*Report generated from full source analysis of `D:\medgrid\new` folder.*
