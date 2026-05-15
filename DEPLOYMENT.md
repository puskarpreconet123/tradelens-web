# Deployment Instructions for Render

This guide provides step-by-step instructions for deploying the TradeLens application on Render.

## Prerequisites

1.  A [Render](https://render.com/) account.
2.  An external MySQL database (e.g., from [Aiven](https://aiven.io/) or [PlanetScale](https://planetscale.com/)).
3.  The project code pushed to a GitHub repository.

---

## 1. Database Setup (MongoDB)

Render does not provide a native MongoDB service. You should use **MongoDB Atlas** (which has a great free tier).

1.  Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2.  In the "Network Access" tab, allow access from anywhere (`0.0.0.0/0`) or find Render's IP range.
3.  Get your **Connection String** (URI). It should look like:
    `mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`
4.  Note down:
    -   `MONGO_URI`: Your connection string.
    -   `DB_NAME`: The name of your database (e.g., `tradelens`).

*Note: No manual schema execution is required as the application seeds itself on the first request.*

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
    -   `MONGO_URI`: Your MongoDB connection string.
    -   `DB_NAME`: Your database name.
    -   `JWT_SECRET`: A long random string.
    -   `ADMIN_EMAIL`: Email for the admin account.
    -   `ADMIN_PASSWORD`: Password for the admin account.
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
