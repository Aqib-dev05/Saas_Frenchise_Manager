# 🏢 Franchise Manager — SaaS POS & Distribution Platform

A complete multi-tenant SaaS platform for franchise distributors. Manage products, salesman routes, order booking, delivery tracking, invoices, credit, and subscription billing — all in one place.

---

## ✨ Features

| Module | Description |
|---|---|
| **SaaS Multi-tenancy** | Each company/org has isolated data. Paddle subscription billing. |
| **Admin Dashboard** | Revenue charts, low stock alerts, credit reports, top shops |
| **Products** | CRUD with stock tracking & low-stock warnings |
| **Shops** | Location-based shop management, credit limits, balance tracking |
| **Routes** | Assign shops to salesman routes by day of week |
| **Orders** | Full order lifecycle: Pending → Confirmed → Dispatched → Delivered |
| **Salesman Dashboard** | Interactive map + sequential shop list + live order booking |
| **Delivery Dashboard** | Loading manifest + map + mark-delivered per order |
| **Payments** | Record payments, auto-reconcile invoices, update shop balance |
| **Invoices** | Auto-created on order confirmation, tracking paid/unpaid |
| **Billing** | Paddle-powered subscription with Starter / Pro / Enterprise plans |

---

## 🛠 Tech Stack

**Backend:** Node.js · Express · PostgreSQL · Prisma ORM  
**Frontend:** Next.js 14 (App Router) · Tailwind CSS · Redux Toolkit · TanStack Query · Leaflet Maps · Recharts  
**Payments:** Paddle Billing (webhook-based subscription management)

---

## 🚀 Getting Started

### 1. Clone and install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Setup PostgreSQL database

Create a PostgreSQL database named `franchise_manager`:
```sql
CREATE DATABASE franchise_manager;
```

### 3. Configure environment variables

**Backend** — copy `.env.example` to `.env`:
```bash
cp backend/.env.example backend/.env
```
Fill in:
- `DATABASE_URL` — your PostgreSQL connection string
- `JWT_SECRET` — any random 32+ character string
- `PADDLE_*` — your Paddle Billing credentials (optional for demo)

**Frontend** — create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_PADDLE_TOKEN=your-paddle-client-token
NEXT_PUBLIC_PADDLE_ENV=sandbox
```

### 4. Run database migrations & seed

```bash
cd backend
npx prisma migrate dev --name init
npm run db:seed
```

### 5. Start development servers

```bash
# Terminal 1 — Backend (port 5000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend && npm run dev
```

Open http://localhost:3000

---

## 👤 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | admin@demo-franchise.com | admin123 |
| **Salesman** | salesman1@demo-franchise.com | salesman123 |
| **Salesman** | salesman2@demo-franchise.com | salesman123 |
| **Delivery** | delivery@demo-franchise.com | delivery123 |

> Demo org is on a **14-day Professional trial** — all features unlocked.

---

## 💳 Paddle Subscription Setup

1. Create account at [paddle.com](https://paddle.com)
2. Create 3 products (Starter, Professional, Enterprise) with monthly/yearly prices
3. Copy the **Price IDs** into `backend/.env`
4. Copy your **Client Token** into `frontend/.env.local`
5. Set up webhook endpoint: `POST https://your-domain.com/api/paddle/webhook`
6. Copy **Webhook Secret** into `backend/.env`

### Subscription Plans

| Plan | Monthly | Yearly | Users | Routes | Shops | Products |
|---|---|---|---|---|---|---|
| Starter | $19 | $190 | 3 | 2 | 100 | 50 |
| Professional | $49 | $490 | 10 | 10 | 500 | 500 |
| Enterprise | $99 | $990 | ∞ | ∞ | ∞ | ∞ |

---

## 📁 Project Structure

```
franchise-manager/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Full database schema
│   │   └── seed.js            # Demo data seeder
│   └── src/
│       ├── controllers/       # Business logic (per resource)
│       ├── middleware/        # Auth + subscription limit checks
│       ├── routes/            # Express route definitions
│       └── index.js           # Server entry point
│
└── frontend/
    └── src/
        ├── app/
        │   ├── landing/       # Marketing + pricing page
        │   ├── login/         # Login page
        │   ├── register/      # Registration + org creation
        │   ├── admin/         # Admin dashboard & all admin pages
        │   ├── salesman/      # Salesman route + map + order booking
        │   └── delivery/      # Delivery manifest + map
        ├── components/
        │   ├── ui/            # Reusable UI primitives
        │   ├── salesman/      # RouteMap, ShopCard, OrderModal
        │   └── delivery/      # DeliveryMap
        ├── store/             # Redux (auth state)
        ├── lib/               # Axios API layer + utilities
        └── providers/         # React Query + Redux providers
```

---

## 🔑 API Endpoints

| Method | Endpoint | Access |
|---|---|---|
| POST | /api/auth/register | Public |
| POST | /api/auth/login | Public |
| GET | /api/auth/me | All |
| GET/POST | /api/products | Auth |
| GET/POST | /api/shops | Auth |
| GET/POST | /api/routes | Auth |
| GET /api/routes/today | Salesman | Salesman |
| GET/POST | /api/orders | Auth |
| GET /api/orders/today | Auth | Auth |
| PUT /api/orders/:id/status | Auth | Auth |
| GET/POST | /api/payments | Auth |
| GET/PUT | /api/deliveries | Auth |
| GET | /api/invoices/:orderId/pdf | Auth |
| DELETE | /api/invoices/history | Admin |
| GET | /api/export/products | Admin |
| GET | /api/export/users | Admin |
| GET | /api/export/shops | Admin |
| GET | /api/export/credit-report | Admin |
| GET | /api/export/payments | Admin |
| GET | /api/export/orders | Admin |
| GET | /api/export/daily-sales | Admin |
| GET | /api/export/monthly-sales | Admin |
| GET | /api/export/product-sales-ratio | Admin |
| GET | /api/audit-logs | Admin |
| GET | /api/audit-logs/filters | Admin |
| POST | /api/shops/:id/portal/credentials | Admin |
| PUT | /api/shops/:id/portal/toggle | Admin |
| POST | /api/shop-portal/login | Public (portal code + password) |
| GET | /api/shop-portal/me | Shop Portal |
| GET | /api/shop-portal/orders | Shop Portal |
| GET | /api/shop-portal/orders/:id | Shop Portal |
| GET | /api/shop-portal/payments | Shop Portal |
| GET | /api/shop-portal/ledger | Shop Portal |
| GET | /api/shop-portal/invoices/:orderId/pdf | Shop Portal |
| GET | /api/dashboard/stats | Admin |
| GET | /api/subscription/plans | Public |
| GET/POST | /api/subscription | Auth |
| POST | /api/paddle/webhook | Paddle |

---

## 🗺 Planned Enhancements (Not Yet Built)

- **Multi-franchise admin access** — currently every account (including Admin) belongs to exactly one Organization, and `email` is globally unique, so one person cannot administer two franchises (e.g. a Coca-Cola distributorship and a Nimko distributorship) under a single login today; running both means two fully separate registrations/logins.
  Future design: decouple login identity from organization membership via a `Membership` model (one admin identity → many Organizations, each with its own role). On login, if an admin belongs to more than one Organization, show a card-grid "select franchise" screen before the dashboard; provide an in-app switcher to change the active franchise without logging out. Salesman/Delivery accounts remain scoped to exactly one Organization each, unchanged.

---

## 📄 License

MIT — Free to use and modify.
