# TigerStorage

A Princeton University storage rental platform with CAS authentication.

## Project Structure

- **Frontend**: React + Vite
- **Backend**: Flask
- **Database**: PostgreSQL
- **Authentication**: Princeton CAS

## Local Development

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create and activate a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Create a `.env` file with the following variables:
   ```
   APP_SECRET_KEY=your-secret-key-here
   DATABASE_URL=postgresql://username:password@host:port/database_name
   ```

5. Run the Flask application:
   ```
   python app.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the development server:
   ```
   npm run dev
   ```

## Deployment on Render

### Database Setup

1. Create a PostgreSQL database on Render
2. Note the connection string for use in your backend service
3. Initialize the database with the schema:
   ```
   psql "your-connection-string" -f backend/database.sql
   ```

### Backend Deployment

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure the service:
   - Name: `tigerstorage-backend`
   - Environment: `Python`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app --log-file -`
   - Root Directory: `backend` (if your repository contains both frontend and backend)
4. Add the following environment variables:
   - `APP_SECRET_KEY`: A secure random string for your Flask app
   - `DATABASE_URL`: Your PostgreSQL connection string

### Frontend Deployment

1. Create a new Static Site on Render
2. Connect your GitHub repository
3. Configure the service:
   - Name: `tigerstorage-frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Root Directory: `frontend`
4. Add the following environment variables:
   - `VITE_API_URL`: The URL of your backend service (e.g., `https://tigerstorage-backend.onrender.com`)

## Features

- CAS authentication for Princeton users
- Separate dashboards for renters and lenders
- Storage listing management
- User type persistence using sessionStorage
- Protected routes with authentication checks