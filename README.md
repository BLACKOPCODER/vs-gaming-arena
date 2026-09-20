# VS GAMING ARENA — V7

V7 upgrades the existing V6 project with an advanced admin command center while preserving the existing booking, PostgreSQL, payment, lookup, rescheduling and CSV features.

## V7 additions
- Live admin station status
- Playing-now metric
- Upcoming sessions panel
- Revenue/outstanding/advance-pending metrics
- Peak-hours booking chart
- Station performance chart
- Customer count
- New `/api/admin/summary` endpoint
- Preserved existing booking and payment APIs
- Fixed TypeScript `@/*` path alias in `tsconfig.json`

## Setup
```powershell
npm install
npm run db:generate
npm run db:push
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```

Open `http://localhost:3000` for the customer website and `http://localhost:3000/admin/login` for the admin panel.

Use the same PostgreSQL `.env` configuration from V6. Do not create a new database when upgrading an existing installation.
