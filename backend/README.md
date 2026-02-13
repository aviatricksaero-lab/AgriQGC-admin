# QGC Backend Service

This Node.js service handles user authentication and data storage for QGroundControl.

## Setup

1.  Make sure you have Node.js installed.
2.  Navigate to this folder: `cd backend`
3.  Install dependencies: `npm install`

## Running the Server

To start the server:

```bash
node server.js
```

The server runs on **port 5000**.

## API Endpoints

*   **POST /api/register**: Register a new user.
*   **POST /api/login**: Login an existing user.
*   **POST /api/sessions**: Save a drone session.
*   **POST /api/feedback**: Submit feedback.

## Database

It connects to MongoDB Atlas using the connection string in `server.js`.
