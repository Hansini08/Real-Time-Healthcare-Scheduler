# Real-Time Healthcare Scheduler

A full-stack healthcare appointment scheduling application with separate React/Vite frontend and Express/Sequelize backend.

## Features

- Patient and provider registration and JWT authentication
- Provider directory and appointment booking
- Appointment search, rescheduling, cancellation, and completion
- Provider notes for completed appointments
- In-app notifications
- Healthcare resource tracking and admin user/resource management
- SQLite database with Sequelize migrations and seed data

## Project Structure

```text
backend/     Express API, Sequelize models, migrations, and seeders
frontend/    React/Vite client application
```

## Requirements

- Node.js 18 or newer
- npm

## Setup

### Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5003
JWT_SECRET=replace-with-a-long-random-secret
CORS_ORIGIN=http://localhost:5173
```

Create and seed the local database:

```bash
npm run migrate
npx sequelize-cli db:seed:all
```

Start the API:

```bash
npm run dev
```

The API runs at `http://localhost:5003`.

### Frontend

In a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5003/api
```

Start the development server:

```bash
npm run dev
```

The Vite development server normally runs at `http://localhost:5173`.

## Useful Commands

Backend:

```bash
npm start                 # Start the API
npm run dev               # Start the API with nodemon
npm run migrate           # Run database migrations
npm run migrate:undo     # Undo the latest migration
```

Frontend:

```bash
npm run dev              # Start Vite
npm run build            # Create a production build
npm run lint             # Run ESLint
npm run preview          # Preview the production build
```

## API Overview

The backend exposes REST endpoints under `/api`, including:

- `/api/auth` for registration, login, and the current user
- `/api/providers` for provider listings
- `/api/appointments` for appointment workflows
- `/api/resources` for healthcare resources
- `/api/notifications` for user notifications
- `/api/users` for admin user management

Most endpoints require a JWT bearer token returned by registration or login.

## Security Notes

- Never commit `.env` files or production secrets.
- Use a strong, unique `JWT_SECRET` outside local development.
- Configure `CORS_ORIGIN` to the deployed frontend URL in production.