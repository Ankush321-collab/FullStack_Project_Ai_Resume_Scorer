# mer2 — Resume Analyser (Restructured)

A clean `frontend` / `backend` layout cloned from `fullstack_project_resume_scorere`.

## Project Structure

```
mer2/
├── frontend/                         # React + Vite + TypeScript
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── index.css
│       ├── components/               # (empty — ready for shared components)
│       ├── routes/                   # (empty — routes live in App.tsx)
│       ├── pages/
│       │   ├── LandingPage.tsx
│       │   ├── LoginPage.tsx
│       │   ├── DashboardPage.tsx
│       │   ├── UploadPage.tsx
│       │   └── AnalysisPage.tsx
│       └── services/
│           └── api.ts                # Axios instance with auth interceptor
│
└── backend/                          # Node + Express + TypeScript
    ├── server.ts                     # Entry point (app bootstrap)
    ├── package.json
    ├── tsconfig.json
    ├── controllers/
    │   ├── auth.controller.ts
    │   ├── resume.controller.ts
    │   ├── job.controller.ts
    │   └── analytics.controller.ts
    ├── models/
    │   └── index.ts                  # Mongoose schemas (User, Resume, Job, Skill, MatchResult)
    ├── routes/
    │   ├── auth.routes.ts
    │   ├── resume.routes.ts
    │   ├── job.routes.ts
    │   └── analytics.routes.ts
    ├── middleware/
    │   ├── auth.ts                   # Supabase token verification
    │   └── protect.ts                # Route guard middleware
    └── config/
        ├── db.ts                     # MongoDB connection (connectDB)
        ├── redis.ts                  # Redis client + cache helpers
        └── kafka/
            ├── index.ts
            ├── topics.ts
            ├── producer.ts
            └── consumer.ts
```

## Getting Started

### Backend
```bash
cd backend
npm install
# Create a .env file with DATABASE_URL, REDIS_URL, SUPABASE keys, etc.
npm run dev       # ts-node-dev on port 4000
```

### Frontend
```bash
cd frontend
npm install
npm run dev       # Vite on port 5173 (proxies /api → localhost:4000)
```

## Environment Variables (backend/.env)

| Variable | Description |
|---|---|
| `DATABASE_URL` | MongoDB connection string |
| `REDIS_URL` | Redis connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `API_PORT` | Backend port (default: 4000) |
| `KAFKA_BROKERS` | Kafka broker list |
| `KAFKA_CA_PATH` | Kafka TLS CA certificate path |
| `KAFKA_KEY_PATH` | Kafka TLS key path |
| `KAFKA_CERT_PATH` | Kafka TLS cert path |
