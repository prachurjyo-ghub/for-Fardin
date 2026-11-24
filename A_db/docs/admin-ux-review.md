# Admin UX practical review

Use this checklist from the feature branch without deploying it.

## Start the review build

```bash
cd A_db
npm install
npm run dev
```

Open `http://localhost:3002/login` and sign in with the controlled admin account from the ignored `CREDENTIALS.md` file. Keep the API configured through `A_db/.env.local`.

Review at desktop width first, then repeat the list/detail screens at approximately 390 px width. Dialogs should remain within the viewport and tables should scroll horizontally without moving the entire page.

## Core operator journeys

| #   | Journey                               | Review path                                                                                      | Expected result                                                                                                                                   |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Create supplier                       | **Suppliers → Create supplier**                                                                  | A short dialog creates a draft and opens its unified workspace; no internal ID is requested                                                       |
| 2   | Update business information           | Supplier workspace → **Business information → Edit**                                             | Existing values are prefilled and the summary refreshes after saving                                                                              |
| 3   | Assign supported categories           | Supplier workspace → **Manage categories**                                                       | Active categories appear by name in a multi-select; no slug entry is required                                                                     |
| 4   | Create or invite owner                | Supplier workspace → **Owner & access**                                                          | Direct owner setup is primary and secure email invitation is an alternative; existing people get row-level access actions                         |
| 5   | Reset or suspend owner access         | Owner row → **Reset password** or **Manage access**                                              | The selected person is clear, reasons are audited, and password confirmation is enforced                                                          |
| 6   | Assign subscription                   | Supplier workspace → **Assign a plan**, or **Subscriptions → Enrollments → Assign subscription** | Supplier and plan are readable choices; due date uses a date picker; internal request keys are generated automatically                            |
| 7   | Record full or partial payment        | **Subscriptions → Enrollments → Invoices & payments**                                            | The selected invoice, supplier, outstanding balance, and editable payment amount are visible; full payment uses the outstanding amount by default |
| 8   | Create product                        | **Catalogue → Products → Add product**                                                           | Category, brand, and primary part number are entered in one dialog; the product then opens from its readable row                                  |
| 9   | Manage part numbers and compatibility | Product row → product detail                                                                     | Add/edit/remove actions are attached to the selected product and child record; no UUID is entered manually                                        |
| 10  | Review category request               | **Catalogue → Categories → Pending supplier requests → Review**                                  | Supplier and request context are visible; approval can create an auto-slugged category or choose an existing category by name                     |

## Verification recorded for this branch

- Admin unit suite: 11 tests passed.
- TypeScript: passed with no errors.
- ESLint: passed with no warnings after formatting.
- Next.js production build: passed; static and dynamic routes include `/catalogue/products/[id]`.
- Backend integration suites were invoked for supplier provisioning, subscriptions/categories, and catalogue inventory. They could not start because the local PostgreSQL test service was not running on `localhost:5432`; no application assertion failed before that infrastructure error.

The checklist intentionally avoids executing destructive or accounting mutations against the hosted environment. Run the ten journeys against a disposable local/test database when PostgreSQL is available.
