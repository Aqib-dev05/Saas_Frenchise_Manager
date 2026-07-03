# 🏢 Franchise Manager — SaaS POS & Distribution Platform

A complete multi-tenant SaaS platform for franchise distributors. Manage products, salesman routes, order booking, delivery tracking, invoices, credit, and subscription billing — all in one place.

---

## ✨ Features

| Module | Description |
|---|---|
| **SaaS Multi-tenancy** | Each company/org has fully isolated data. Paddle subscription billing. |
| **Admin Dashboard** | Revenue charts, low stock alerts, credit reports, top shops |
| **Products** | CRUD with stock tracking, low-stock warnings, max 2 Cloudinary images |
| **Shops** | Location-based shop management, credit limits, balance tracking, portal access |
| **Routes** | Assign shops to salesman routes by day of week, drag-drop reorder |
| **Orders** | Full lifecycle: Pending → Confirmed → Dispatched → Delivered. Per-shop negotiated pricing. |
| **Salesman Dashboard** | Interactive map + shop cards + order booking + skip visit recording |
| **Delivery Dashboard** | Loading manifest (grouped by product) + map + mark-delivered |
| **Payments** | Record payments, FIFO invoice reconciliation, update shop balance |
| **Invoices** | Auto-created on confirmation, PDF generation with previous balance shown, Cloudinary cache |
| **Bills** | Shopkeeper-facing receipt/challan, works on any order status, signature lines |
| **Skipped Visits** | Salesman marks why a shop was unvisitable; admin sees follow-up banner |
| **Shop Owner Portal** | Separate auth — full ledger, orders, payments, bill download |
| **Audit Log** | Append-only global activity trail, admin-only, sanitized |
| **Excel/CSV Export** | 9 report types (products, users, shops, credit, payments, orders, sales) |
| **Billing** | Paddle-powered subscriptions: Starter / Professional / Enterprise |

---

## 🛠 Tech Stack

**Backend:** Node.js · Express · PostgreSQL · Prisma ORM v5
**Frontend:** Next.js 14 (App Router) · Tailwind CSS · Redux Toolkit · TanStack Query · Leaflet Maps · Recharts
**Storage:** Cloudinary v2 (images + raw PDFs)
**Billing:** Paddle Billing (webhook-based subscription management)
**PDF:** pdfkit (server-side generation)
**Excel/CSV:** exceljs

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

```sql
CREATE DATABASE franchise_manager;
```

### 3. Configure environment variables

**Backend** — copy `.env.example` to `.env` and fill in:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — any random 32+ char string
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `PADDLE_*` — Paddle Billing credentials (optional for demo)
- `SMTP_*` or `GMAIL_*` — email for OTP password reset

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
> Shop Portal: Admin → Shops → any shop → Generate Access → share credentials with shop owner.

---

## 💳 Paddle Subscription Plans

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
│   │   ├── schema.prisma          # Full DB schema (16 models)
│   │   └── seed.js                # Demo data seeder
│   └── src/
│       ├── controllers/           # auth, user, product, shop, route, order,
│       │                          # payment, invoice, bill, delivery, dashboard,
│       │                          # export, audit, shopPortal, skippedVisit,
│       │                          # organization, subscription, upload, paddle
│       ├── middleware/
│       │   ├── auth.middleware.js          # authenticate + authorize (staff only)
│       │   ├── shopPortal.middleware.js    # authenticateShopPortal (separate track)
│       │   ├── audit.middleware.js         # global POST/PUT/PATCH/DELETE capture
│       │   ├── subscription.middleware.js  # requireActiveSubscription + checkLimit
│       │   └── upload.middleware.js        # multer (5MB, images only)
│       ├── routes/                # 19 route files + index.js
│       ├── lib/
│       │   ├── prisma.js          # Prisma client singleton
│       │   ├── cloudinary.js      # image + raw PDF helpers
│       │   ├── mailer.js          # SMTP / Gmail OAuth2
│       │   ├── audit.js           # logAudit() + sanitize()
│       │   └── shopPortal.js      # generatePortalCode() / generatePortalPassword()
│       └── index.js
│
└── frontend/
    └── src/
        ├── app/
        │   ├── landing/           # Marketing + pricing page
        │   ├── login/             # Staff login
        │   ├── register/          # Org registration + 14-day trial
        │   ├── forgot-password/   # OTP request
        │   ├── reset-password/    # OTP verify + new password
        │   ├── admin/             # Dashboard, products, shops, routes,
        │   │                      # orders, payments, invoices, exports,
        │   │                      # audit log, billing
        │   ├── salesman/          # Route map + shop cards + order booking + skips
        │   ├── delivery/          # Manifest + map + deliver + collect payment
        │   └── shop-portal/
        │       ├── login/         # Portal login (code + password)
        │       ├── layout.jsx     # Auth guard (reads fm_shop_token)
        │       └── page.jsx       # Ledger + Orders + Payments tabs
        ├── components/
        │   ├── ui/                # Modal, Table, Badge, StatCard, Avatar, ImageUpload
        │   ├── admin/             # LocationPicker (Leaflet)
        │   ├── salesman/          # RouteMap, ShopCard, OrderModal, SkipShopModal
        │   └── delivery/          # DeliveryMap, CollectPaymentModal
        ├── store/slices/
        │   └── authSlice.js       # Staff auth (shop portal does NOT use Redux)
        ├── lib/
        │   ├── api.js             # Staff axios instance + all API modules
        │   ├── shopPortalApi.js   # Portal axios instance (separate token/interceptors)
        │   └── utils.js           # formatCurrency, formatDate, downloadBlob
        └── providers/             # React Query + Redux
```

---

## 🔑 API Endpoints

### Auth
| Method | Endpoint | Access |
|---|---|---|
| POST | /api/auth/register | Public |
| POST | /api/auth/login | Public |
| GET | /api/auth/me | Staff |
| POST | /api/auth/forgot-password | Public |
| POST | /api/auth/reset-password | Public |

### Users
| Method | Endpoint | Access |
|---|---|---|
| GET | /api/users | Admin |
| POST | /api/users | Admin (plan limit) |
| PUT | /api/users/:id | Admin |
| DELETE | /api/users/:id | Admin |

### Products
| Method | Endpoint | Access |
|---|---|---|
| GET | /api/products | Staff |
| GET | /api/products/low-stock | Staff |
| GET | /api/products/categories | Staff |
| GET | /api/products/:id | Staff |
| POST | /api/products | Admin (plan limit) |
| PUT | /api/products/:id | Admin |
| DELETE | /api/products/:id | Admin |

### Shops
| Method | Endpoint | Access |
|---|---|---|
| GET | /api/shops | Staff |
| GET | /api/shops/:id | Staff |
| GET | /api/shops/:id/transactions | Staff |
| POST | /api/shops | Admin (plan limit) |
| PUT | /api/shops/:id | Admin |
| DELETE | /api/shops/:id | Admin |
| POST | /api/shops/:id/portal/credentials | Admin |
| PUT | /api/shops/:id/portal/toggle | Admin |

### Routes
| Method | Endpoint | Access |
|---|---|---|
| GET | /api/routes | Staff |
| GET | /api/routes/today | Staff |
| GET | /api/routes/:id | Staff |
| POST | /api/routes | Admin (plan limit) |
| PUT | /api/routes/:id | Admin |
| DELETE | /api/routes/:id | Admin |
| POST | /api/routes/:routeId/shops | Admin |
| DELETE | /api/routes/:routeId/shops/:shopId | Admin |
| PUT | /api/routes/:routeId/reorder | Admin |

### Orders
| Method | Endpoint | Access |
|---|---|---|
| GET | /api/orders | Staff |
| GET | /api/orders/today | Staff |
| GET | /api/orders/:id | Staff |
| POST | /api/orders | Admin, Salesman |
| PUT | /api/orders/:id | Admin, Salesman (PENDING only) |
| PUT | /api/orders/:id/status | Staff |

### Payments
| Method | Endpoint | Access |
|---|---|---|
| GET | /api/payments | Staff |
| POST | /api/payments | Admin, Delivery |
| GET | /api/payments/shop/:id | Staff |

### Invoices
| Method | Endpoint | Access |
|---|---|---|
| GET | /api/invoices/:orderId/pdf | Staff |
| DELETE | /api/invoices/history | Admin |

### Bills (Shopkeeper Receipt)
| Method | Endpoint | Access |
|---|---|---|
| GET | /api/bills/:orderId | Staff (Salesman: own orders only) |

### Deliveries
| Method | Endpoint | Access |
|---|---|---|
| GET | /api/deliveries | Staff |
| PUT | /api/deliveries/:id/status | Staff |

### Skipped Visits
| Method | Endpoint | Access |
|---|---|---|
| GET | /api/skipped-visits | Staff |
| POST | /api/skipped-visits | Salesman |
| PUT | /api/skipped-visits/:id/resolve | Admin, Salesman (own only) |

### Dashboard
| Method | Endpoint | Access |
|---|---|---|
| GET | /api/dashboard/stats | Admin |
| GET | /api/dashboard/daily-sales | Admin |
| GET | /api/dashboard/low-stock | Admin |
| GET | /api/dashboard/top-shops | Admin |
| GET | /api/dashboard/credit-report | Admin |

### Export (Excel/CSV)
| Method | Endpoint | Access |
|---|---|---|
| GET | /api/export/products | Admin |
| GET | /api/export/users | Admin |
| GET | /api/export/shops | Admin |
| GET | /api/export/credit-report | Admin |
| GET | /api/export/payments | Admin |
| GET | /api/export/orders | Admin |
| GET | /api/export/daily-sales | Admin |
| GET | /api/export/monthly-sales | Admin |
| GET | /api/export/product-sales-ratio | Admin |

### Audit Log
| Method | Endpoint | Access |
|---|---|---|
| GET | /api/audit-logs | Admin |
| GET | /api/audit-logs/filters | Admin |

### Shop Portal
| Method | Endpoint | Access |
|---|---|---|
| POST | /api/shop-portal/login | Public (code + password) |
| GET | /api/shop-portal/me | Shop Portal |
| GET | /api/shop-portal/orders | Shop Portal |
| GET | /api/shop-portal/orders/:id | Shop Portal |
| GET | /api/shop-portal/payments | Shop Portal |
| GET | /api/shop-portal/ledger | Shop Portal |
| GET | /api/shop-portal/invoices/:orderId/pdf | Shop Portal |
| GET | /api/shop-portal/bills/:orderId | Shop Portal |

### Organization & Subscription
| Method | Endpoint | Access |
|---|---|---|
| GET | /api/organization | Staff |
| PUT | /api/organization | Admin |
| GET | /api/subscription/plans | Public |
| GET | /api/subscription | Staff |
| GET | /api/subscription/paddle-config | Staff |
| POST | /api/subscription/activate | Admin |
| POST | /api/subscription/cancel | Admin |
| POST | /api/paddle/webhook | Paddle (signed) |

### Upload
| Method | Endpoint | Access |
|---|---|---|
| POST | /api/upload/image | Staff |

---

## 🗺 Planned Enhancements (Not Yet Built)

- **2FA for Admin** — TOTP or email OTP on admin login
- **GPS Check-in** — Geolocation verify before order booking (fake-order prevention)
- **WhatsApp/Email/SMS Notifications** — Order confirm, payment receipt, low stock alerts
- **Recurring/Standing Orders** — Auto-suggest same order for regular shops
- **Returns & Credit Notes** — Damaged/returned goods, stock restore, credit note PDF
- **Multi-branch / Godown** — Multiple warehouses, separate stock tracking
- **Offline PWA Mode** — Field order booking on weak connectivity
- **Multi-franchise Admin Access** — One admin identity → multiple Organizations via a `Membership` model. Card-grid franchise picker on login, in-app switcher. Salesman/Delivery stay single-org.

---

## 📄 License

MIT — Free to use and modify.
