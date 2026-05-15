# Deployment Instructions for Render

This guide provides step-by-step instructions for deploying the TradeLens application on Render.

## Prerequisites

1.  A [Render](https://render.com/) account.
2.  An external MySQL database (e.g., from [Aiven](https://aiven.io/) or [PlanetScale](https://planetscale.com/)).
3.  The project code pushed to a GitHub repository.

---

## 1. Database Setup (MySQL)

Render does not provide a native MySQL service on the free tier. You should use an external provider.

1.  Create a MySQL database on your preferred provider.
2.  Note down the following credentials:
    -   `DB_HOST`
    -   `DB_PORT` (usually 3306)
    -   `DB_NAME`
    -   `DB_USER`
    -   `DB_PASS`
3.  Execute the schema provided in `backend/sql/schema.sql` against your database to set up the tables.

---

## 2. Backend Deployment (Web Service)

The backend is built with PHP and will be deployed as a Docker container.

1.  Log in to Render and click **New > Web Service**.
2.  Connect your GitHub repository.
3.  Configure the service:
    -   **Name**: `tradelens-api` (or similar)
    -   **Environment**: `Docker`
    -   **Root Directory**: `backend` (Important!)
4.  Add the following **Environment Variables**:
    -   `DB_HOST`: Your external DB host.
    -   `DB_PORT`: Your external DB port.
    -   `DB_NAME`: Your external DB name.
    -   `DB_USER`: Your external DB user.
    -   `DB_PASS`: Your external DB password.
5.  Click **Create Web Service**.
6.  Once deployed, note the service URL (e.g., `https://tradelens-api.onrender.com`).

---

## 3. Frontend Deployment (Static Site)

The frontend is a static vanilla JS application.

1.  Before deploying, you must update the backend API URL in the frontend code.
    -   Open `frontend/public/js/lib/api.js`.
    -   Change `const API_BASE = '/api';` to your backend URL:
        ```javascript
        const API_BASE = 'https://tradelens-api.onrender.com'; // Replace with your backend URL
        ```
    -   Commit and push this change to your repository.

2.  On Render, click **New > Static Site**.
3.  Connect your GitHub repository.
4.  Configure the site:
    -   **Name**: `tradelens-web`
    -   **Root Directory**: `frontend`
    -   **Build Command**: (Leave empty)
    -   **Publish Directory**: `public`
5.  Click **Create Static Site**.

---

## 4. Handling CORS

Since the frontend and backend are on different domains, the backend MUST allow CORS requests from the frontend domain.

Ensure your backend is configured to accept requests from your static site domain.

---

## Verification

Once both services are "Live":
1.  Open your frontend URL.
2.  Try registering a new account.
3.  Verify that requests are hitting the backend and data is being saved to the database.
