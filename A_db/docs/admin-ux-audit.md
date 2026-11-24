# Admin operations UI/UX audit

This audit maps the current admin implementation to the simplified operating model. The backend contracts remain authoritative; this phase changes how existing capabilities are presented.

## Information architecture

| Area          | Current state                                                                                                           | Target state                                                                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Suppliers     | List plus a four-tab detail page (`profile`, `members`, `subscription`, `history`) with permanent forms                 | Keep the list; replace tabs with one business workspace containing summary, business information, owner/access, subscription, and activity sections            |
| Subscriptions | One long page mixing plan creation, invoice issue/payment, complimentary grants, lifecycle actions, and raw identifiers | Two views only: **Plans** and **Enrollments**. Creation and exceptional actions open in contextual dialogs                                                     |
| Catalogue     | Four tabs including a standalone category-request page; all create/edit/child forms are always visible                  | Three views only: **Products**, **Categories**, **Brands**. Category requests become a review queue inside Categories; product children move to product detail |

## Workflow findings

### Suppliers

- The supplier list already supports search, status filtering, pagination, and detail navigation. It needs clearer row hierarchy and an action affordance.
- Supplier detail loads business, invitations, subscriptions, invoices, and audit logs independently. This is useful data but the tab structure hides the end-to-end state.
- Business information editing, category assignment, owner creation/invitation, password reset, and account suspension are exposed as competing permanent forms.
- Supported categories currently require comma-separated slugs even though the catalogue API provides readable category records.
- Subscription state is separated from the supplier summary, making it difficult to understand whether the business can actually operate.
- Activity is shown as raw audit rows and metadata rather than readable events.

### Subscriptions

- The page exposes internal business, plan, subscription, invoice, and payment UUIDs to operators.
- Idempotency keys and ISO timestamps are entered manually despite being implementation details.
- Plan creation and lifecycle actions compete with routine enrollment work.
- The backend already returns readable supplier, plan, invoice, payment, balance, and history data; the UI does not use that context.
- Complimentary grants are restricted to super admins by the backend and should remain visually secondary.

### Catalogue

- Product list responses already include category, brand, part numbers, and compatibility, and product detail includes child record IDs. No backend expansion is needed for contextual editing.
- Category and brand APIs already support readable list/edit flows. Slugs can be generated from names in the UI.
- Pending category requests already include supplier and proposed-parent names. They can be reviewed without a separate top-level tab.
- Permanent child-resource forms currently require operators to copy product and child UUIDs. Those actions belong on the selected product.

## Backend capability map

| Operator journey               | Existing capability                                     | UI decision                                                    |
| ------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------- |
| Create and review supplier     | Supplier create, status transition endpoints            | Create dialog then unified supplier workspace                  |
| Assign categories              | Category list plus supplier category replacement        | Multi-select using names; submit existing category slugs       |
| Create/invite owner            | Owner account and invitation endpoints                  | One recommended onboarding block with alternative action       |
| Reset/suspend access           | Member-scoped access endpoints                          | Actions attached to the relevant owner/member                  |
| Assign paid plan               | Plan list plus invoice issue endpoint                   | Supplier/plan picker; generate idempotency key; use date input |
| Record full or partial payment | Invoice list and payment endpoint                       | Invoice-scoped dialog with outstanding balance context         |
| Complimentary access           | Complimentary grant endpoint                            | Super-admin-only secondary assignment mode                     |
| Plan lifecycle                 | Plan create/update endpoints                            | Create dialog and row-level edit/archive actions               |
| Product lifecycle              | Product list/create/update and child-resource endpoints | Searchable list, create dialog, product detail workspace       |
| Review category request        | Request list and decision endpoint                      | Pending queue inside Categories with guided decision dialog    |

## Constraints and retained safeguards

- No schema, API, authentication, permission, or billing-rule rewrite is required for this simplification.
- Business status, user status, and subscription entitlement remain independent controls.
- Invoices, payment records, reversals, and audit history remain immutable accounting evidence; destructive-looking actions keep confirmation and reason fields.
- Backend-generated catalogue codes, invoice numbers, and record identifiers remain internal. The UI generates idempotency keys only at submission time.
- Historical information stays available but is visually secondary and expandable.

## Implementation phases

1. Shared dialog, section, tabs, readable-empty-state, and action-menu primitives.
2. Supplier list and unified supplier workspace.
3. Subscription Plans and Enrollments workspaces.
4. Catalogue Products, Categories/request queue, Brands, and product detail.
5. Responsive review, type/lint/build verification, and operator journey checks.
