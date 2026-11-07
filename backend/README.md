# SmartFinance Backend

This folder contains the Node.js backend for the SmartFinance student money manager.

## Stack

- Node.js
- Express.js
- SQLite database, stored in `backend/data/smartfinance.db`

## Run

```bash
cd backend
npm install
npm start
```

Open the app at http://localhost:5000. The API health check is at:

- http://localhost:5000/api/health

Run the app through this URL (rather than opening `index.html` directly) so it can connect to the backend.

## API endpoints

- GET /api/health
- POST /api/auth/signup
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- GET /api/profile
- PUT /api/profile
- GET/PUT /api/store (authenticated)
- GET/POST /api/transactions (authenticated)
- DELETE /api/transactions/:id (authenticated)
- GET/POST /api/goals (authenticated)
- GET/POST /api/budget-categories (authenticated)
- GET/POST /api/income-sources (authenticated)
- GET /api/dashboard (authenticated)

Create an account from the app's sign-in screen. Passwords are stored as salted scrypt hashes, and the backend uses an HTTP-only session cookie. Profile and finance records are scoped to the signed-in account. Browser caches are also separated by account. The server does not import the old shared demo store into SQLite.

The backend keeps active sessions in memory, so a server restart signs users out. Use HTTPS when deploying outside a local development environment.

SQLite creates its tables automatically the first time the backend starts.
