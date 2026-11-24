# PartsArc Supplier Portal

Next.js App Router frontend for the PartsArc supplier workspace. Recreated from `legacy_design_Supplier_Portal` with TypeScript, Tailwind CSS, shadcn/ui, React Icons, and theme-aware responsive layouts.

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- shadcn/ui (dialogs, sheets/drawers, dropdowns, tables, forms, tooltips, sonner)
- React Icons
- next-themes (persisted light/dark)

## Routes

| Path                         | Purpose                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `/login`                     | Provisioned supplier owner/staff login                                        |
| `/accept-invitation?token=…` | Initial owner invitation acceptance; does not log in or activate the business |
| `/dashboard`                 | Supplier overview, urgent requests, fulfillment summary                       |
| `/requests`                  | Request inbox, details drawer, prepare-quote workflow                         |
| `/quotations`                | Submitted quotation tracking                                                  |
| `/fulfillment`               | Confirmed order preparation and status updates                                |
| `/inventory`                 | Stock quantities, prices, bulk/individual updates                             |
| `/products`                  | Catalogue listing, add/edit product, CSV import action                        |
| `/transactions`              | Payments, pending settlements, invoice download actions                       |
| `/messages`                  | Request/order messaging workspace                                             |
| `/business-profile`          | Supplier details, locations, hours, categories                                |

`/` redirects to `/dashboard`.

## Run locally

```bash
cd S_db
npm install
npm run dev
```

The checkpoint uses the distinct local port in `.env.example`; start with `npm run dev -- -p
3001` and open [http://localhost:3001](http://localhost:3001).

```bash
npm run typecheck
npm run build
npm start
```

## Project structure

- `app/` — routes and loading skeletons
- `components/layout/` — sidebar, topbar, shell
- `components/shared/` — metrics, badges, panels, filters, skeletons
- `components/features/` — page UIs and interactions
- `components/ui/` — shadcn primitives
- `lib/services/auth.ts` — typed authentication, invitation and supplier-access client
- `lib/types.ts` — shared TypeScript interfaces

## Notes

- Login, rotating refresh-cookie restoration, logout, invitation acceptance, role checks, and
  supplier business-status restrictions use the Express API.
- Access tokens remain in memory. Refreshes send credentials and the supplier CSRF-cookie
  value, and are coordinated across tabs.
- Draft, pending-review, suspended, closed, inactive-membership and unassigned-account states
  block the protected portal with explicit feedback.
- Inventory, requests, quotations, fulfillment, messages, transactions and the business profile
  are loaded from the Express API. Empty API results render honest empty states; the portal does
  not fall back to bundled operational records.
- Theme preference is stored as `supplier-theme` in `localStorage`.
- Do not treat toasts or local stock/product edits as permanently saved.

Environment variables:

| Variable                       | Default                        | Purpose                                   |
| ------------------------------ | ------------------------------ | ----------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`     | `http://localhost:4000/api/v1` | Express API prefix                        |
| `NEXT_PUBLIC_CSRF_COOKIE_NAME` | `partsarc_csrf`                | Base cookie name; `_supplier` is appended |

Development invitation links are read manually from the backend's ignored invitation outbox.
The outbox is not exposed through a frontend or public API.
