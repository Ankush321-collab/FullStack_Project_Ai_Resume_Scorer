# Prerequisite Features Used

This file tracks which required/recommended features are currently implemented in this project.

## Minimum Requirements Status

| Requirement | Status | Notes |
|---|---|---|
| Frontend styling (Tailwind or UI library) | Implemented | Tailwind is configured and used in frontend pages. |
| API communication (Axios/Fetch) | Implemented | Axios instance with auth interceptor is used for API calls. |
| Routing (React Router DOM) | Implemented | Multi-page routing and protected redirects are configured. |
| Backend (Node.js + Express) | Implemented | Express server and API routes are active. |
| MVC architecture (Models/Controllers/Routes) | Implemented | Backend is structured into models, controllers, and routes folders. |
| MongoDB integration | Implemented | Database connection and models use MongoDB via Mongoose. |
| Mongoose schemas/operations | Implemented | Schemas and model operations are implemented. |
| JWT auth (register/login/token verify) | Implemented | Signup/signin, token generation, and token verification middleware exist. |
| bcrypt password hashing | Implemented | Passwords are hashed and compared using bcryptjs. |
| Protected private routes | Implemented | Middleware protects private backend endpoints. |
| Full CRUD | Implemented | Create, Read, Update, Delete are implemented for core resources (resumes/jobs). |
| Error handling (backend responses + frontend handling) | Implemented | API status/error responses and frontend error states are present. |
| Environment configuration (.env variables) | Implemented in code | Environment variables are read in backend code (DATABASE_URL, JWT_SECRET, API_PORT, CORS_ORIGINS, etc.). |

## Extra Feature Added

- Resume history deletion (single item and clear-all) is implemented in backend and dashboard frontend.

## Recommended Frontend Packages Status

| Package | Status |
|---|---|
| axios | Installed and used |
| react-router-dom | Installed and used |
| tailwindcss | Installed and used |
| react-icons | Installed |
| react-toastify | Installed and used |

## Key File References

- Frontend routing: frontend/src/App.tsx
- Frontend API client: frontend/src/services/api.ts
- Tailwind usage: frontend/src/index.css
- Frontend auth page (login/signup improvements + toast): frontend/src/pages/LoginPage.tsx
- Frontend dashboard history delete actions: frontend/src/pages/DashboardPage.tsx
- Backend entry: backend/server.ts
- DB config: backend/config/db.ts
- Models: backend/models/index.ts
- Auth controller: backend/controllers/auth.controller.ts
- Auth middleware: backend/middleware/auth.ts
- Route protection middleware: backend/middleware/protect.ts
- Resume routes: backend/routes/resume.routes.ts
- Resume controller (CRUD + history delete): backend/controllers/resume.controller.ts
- Job routes: backend/routes/job.routes.ts
- Job controller (CRUD): backend/controllers/job.controller.ts
