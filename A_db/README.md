# PartsArc admin operations

Next.js admin workspace for existing `ADMIN` and `SUPER_ADMIN` APIs. It uses the graphite,
charcoal, stone and marble-white design system and contains no fallback mock records.

The component layer follows shadcn/ui conventions through `components.json` and generated-style
primitives under `components/ui` (Button, Input, Skeleton and Radix-backed dialogs). React Icons
are used for password visibility controls, while Lucide remains the established operations icon
set. Authenticated shells, tables and record-detail pages render skeleton states during loading.

## Local start

1. Start PostgreSQL/Redis where available and the backend on port 4000.
2. Copy `.env.example` to `.env.local`. Keep `NEXT_PUBLIC_API_BASE_URL` at
   `http://localhost:4000/api/v1` for the default setup.
3. Ensure backend `CLIENT_ORIGINS` includes `http://localhost:3002`.
4. Run `npm ci && npm run dev`, then open <http://localhost:3002>.
5. Provision an admin with the backend's protected `npm run admin:provision` command. There is
   no default password and credentials must never be committed or pasted into chat.

The client sends `x-auth-client: admin`, keeps access tokens only in memory, uses the namespaced
HttpOnly refresh cookie and CSRF cookie/header contract, rotates through a cross-tab refresh lock,
and retries an authenticated request at most once. Backend authorization remains authoritative.

## Connected routes

- `/dashboard` — real date-bounded summary, attention queues and audit activity.
- `/requests` and `/requests/[id]` — submitted request details and private photos, explainable
  suggestions, supplier assignment/withdrawal, supplier clarification replies, quotation revision
  comparison, clarification/rejection, server-priced option preparation/publication, and accepted
  option conversion.
- `/quotations` — review queue linked into request comparison.
- `/orders` and `/orders/[id]` — immutable pricing/reservations, lifecycle transitions, urgent
  assessment, cancellation/return/failure decisions, invoice/payment/payable actions.
- `/customers/[id]` — approved profile changes, suspension/session revocation and reactivation.
- `/suppliers/[id]` — business data/status, locations/categories, initial-owner invitations,
  direct temporary-password onboarding, individual account status, subscription, invoices,
  history, resend/revoke and activation controls.
- `/subscriptions` — 1/4/12-month plans, immutable periods, subscription invoices, external
  receipts/reversals, lifecycle controls and reasoned complimentary grants.
- `/catalogue` — categories/hierarchy, brands, standardized products, child part numbers and
  compatibility records, plus supplier category-request decisions.
- `/finance` — invoice, transaction, refund, settlement and supplier-liability records with
  authorized invoice PDF download. All money movement is explicitly external.
- `/messages/[id]` — isolated customer/supplier operations conversations, replies and private
  JPEG/PNG attachment upload.
- `/cases` and `/cases/[id]` — exception/dispute list, creation, shareable detail and history.
- `/system` — readiness, validated invoice identity, bounded audit/outbox views, retry, batch
  processing, lifecycle reconciliation and reminder enqueue.

Filters live in URL parameters and record detail screens have stable URLs. Times are explicitly
rendered in Asia/Dhaka while API timestamps remain unchanged. Prices display in BDT.

## Remaining boundaries

- No admin-created staff or ownership-transfer workflow is introduced. Initial-owner creation and
  the existing secure invitation are the supported onboarding paths.
- Supplier location creation/deactivation is connected; detailed location editing remains API-only.
- Supplier subscription receipts are external accounting records, not gateway transactions.
- `SUPER_ADMIN` alone can grant complimentary entitlement. Other screens follow their backend
  ADMIN/SUPER_ADMIN contracts; the UI does not invent finer permissions.
- Supplier descriptions and image pixels require human publication review; automatic anonymity is
  not guaranteed.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
npm audit --omit=dev --audit-level=high
```

Browser acceptance requires an installed browser runtime plus isolated API test data. Verify login,
reload, expiry, multiple tabs, deep links, critical mutations, mobile navigation and all three theme
settings before staging sign-off.
