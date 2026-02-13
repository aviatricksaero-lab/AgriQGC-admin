
# QGC Admin Panel

This is a React-based admin panel for visualizing QGroundControl user data.

## Setup

1.  Make sure you have Node.js installed.
2.  Navigate to this folder: `cd admin-panel`
3.  Install dependencies: `npm install`

## Running the App

To start the development server:

```bash
npm run dev
```

The app will run on **http://localhost:5173** (or similar).

## Features

*   **Dashboard**: Overview of total users, sessions, and feedback.
*   **Users**: Table of all registered users.
*   **Sessions**: Flight logs with duration charts.
*   **Feedback**: User submitted feedback.

## Backend Connection

This app connects to the QGC backend running on `http://localhost:5000`. Ensure the backend server is running before starting the admin panel.
