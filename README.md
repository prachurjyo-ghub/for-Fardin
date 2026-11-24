# Part 2 handoff for Fardin

The [Capstone Project](https://github.com/prachurjyo-ghub/Capstone-Project) is the university submission. The [Part 2 source branch](https://github.com/prachurjyo-ghub/for-Fardin/tree/feature/supplier-admin-portals) contains the prepared supplier portal (`S_db`) and admin workspace (`A_db`).

## Assignment

Integrate the supplier and admin portals with the Capstone customer app and shared API. Review and verify supplier onboarding, entitlements, listings and moderation, requests, quotations, fulfillment, finance, and operations. The portal source reuses Parts Ark revision `b6b9154` with the Next.js 16.4.6 patch applied for the Capstone build. Describe the integration, fixes, and verification you actually perform in your PR.

## Branch workflow

After Part 1 is merged, use these commands from a working directory of your choice:

```sh
git clone https://github.com/prachurjyo-ghub/Capstone-Project.git
cd Capstone-Project
git switch main
git pull --ff-only origin main
git switch -c feature/part-2-operations
git remote add fardin-source https://github.com/prachurjyo-ghub/for-Fardin.git
git fetch fardin-source feature/supplier-admin-portals:refs/remotes/fardin-source/feature/supplier-admin-portals
git restore --source=fardin-source/feature/supplier-admin-portals --worktree -- S_db A_db
git add S_db A_db
git commit -m "Integrate supplier and admin portals"
```

You can stage and commit each portal separately if you prefer. Keep your integration and fixes on the Capstone feature branch. After verification, push it with `git push -u origin feature/part-2-operations` and open a pull request targeting Capstone's `main`. Include results and remaining gaps, then merge through the PR after review.

## Local integration

1. Follow the [Capstone setup guide](https://github.com/prachurjyo-ghub/Capstone-Project/blob/main/README.md) to migrate a fresh local database, start PostgreSQL and Redis, run the API and worker, and provision your admin. Use the existing migration chain and create demonstration records later through the portals.
2. In each new portal directory run `npm ci` and copy `.env.example` to `.env.local`. Use the same API at `http://localhost:4000/api/v1`. Run the supplier with `npm run dev -- -H localhost -p 3001` and the admin with `npm run dev -- -H localhost`. Keep the customer portal on `3000` and the admin on `3002` so the default CORS and invitation settings match.
3. Sign in as the admin and onboard a test supplier. For invitation onboarding, read the link from the ignored backend recovery outbox and open it in the supplier portal. Activate the business, assign eligible categories, and set up entitlement. Create a test catalogue product and use a bundled `/assets/...` image path from the customer public directory. Submit a supplier listing image through the portal and approve it in admin before checking customer visibility.
4. Keep uploaded photos and the mail and notification outboxes in the backend's ignored `.local` tree. Use test identities and any necessary demonstration payment references. The app records external financial activity locally.

## Verification for the pull request

- Run `npm run build` and `npm run typecheck` in both portals. Run `npm test` in `A_db` and the relevant backend integration suites against the separate local test database.
- Verify login, session restoration after reload, portal permissions, and supplier invitation activation. Check that a supplier can see only its own commercial records.
- Create a customer sourcing request with a photo, assign it in admin, submit a supplier quotation, publish a customer option, accept it, and complete order and fulfillment through invoice. Verify that photo access is restricted to authorized sessions.
- Verify a fixed-price purchase request with an eligible listing and a used-part RFQ. Confirm customer catalogue visibility after listing moderation, and check the worker heartbeat and a local notification.
- Record actual results, commands, and any remaining gaps in your PR. Keep live demonstration records in the local database.
