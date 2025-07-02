# 🐯 TigerStorage

TigerStorage is a full-stack storage rental platform for Princeton University students. With secure CAS authentication, students can easily rent or offer storage space during transitional periods such as summer break or study abroad. It provides tailored dashboards for both **renters** and **lenders**, with intuitive listing management and seamless user experience.

---

## 🧰 Tech Stack

| Layer       | Technology      |
|-------------|-----------------|
| Frontend    | React + Vite     |
| Backend     | Flask (Python)   |
| Database    | PostgreSQL       |
| Auth        | Princeton CAS    |
| Deployment  | Render           |

---

## 🌐 Live Demo

- **Link**: [https://tigerstorage-backend.onrender.com](https://tigerstorage-backend.onrender.com)

---

## 📁 Project Structure

```bash
tigerstorage/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── database.sql
├── frontend/
│   ├── src/
│   ├── index.html
│   └── vite.config.js
├── README.md
└── .env.example
```
---

## 🚀 Local Development

### 🔙 Backend Setup (Flask)

1. Navigate to the backend directory:
   ```bash
   cd backend
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
4. Create a .env file:
   ```ini
   APP_SECRET_KEY=your-secret-key
   DATABASE_URL=postgresql://username:password@host:port/database_name
5. Run the Flask app:
   ```bash
   python app.py
   App runs at: http://localhost:5000

### ⚛️ Frontend Setup (React + Vite)
1. Navigate to the frontend directory:
   ```bash
   cd frontend
2. Install dependencies:
   ```bash
   npm install
3. Create a .env file:
   ```ini
   VITE_API_URL=http://localhost:5000
4. Start the development server:
   ```bash
   npm run dev
   App runs at: http://localhost:5173

### ☁️ Deployment (Render)

#### 🛢️ PostgreSQL Setup
1. Create a PostgreSQL instance on Render.
2. Copy the connection string.
3. Initialize the database:
   ```bash
   psql "your-connection-string" -f backend/database.sql

#### 🐍 Deployment
1. Create a new Web Service on Render.
2. Connect your GitHub repository.
3. Configure the service:

**Environment**: Python 3  
**Root Directory**: `backend`

**Build Command:**
```bash
pip install -r requirements.txt
```

**Start Command:**
```bash
gunicorn app:app --log-file -
```

Add environment variables:
   ```ini
APP_SECRET_KEY=your-secret-key
DATABASE_URL=your-render-database-url
```

### 🔐 Authentication
TigerStorage uses Princeton CAS (Central Authentication Service) to verify users. After logging in, the session is managed via Flask and persisted on the frontend using sessionStorage to maintain user roles and access control.

#### ⚛️ Frontend Deployment
1. Create a new Static Site on Render.
2. Connect your GitHub repository.
3. Configure the service:

Name: tigerstorage-frontend

Root Directory: frontend

Build Command:
   ```bash
   npm install && npm run build
```
Publish Directory: dist

Add environment variable:
   ```ini
VITE_API_URL=https://tigerstorage-backend.onrender.com
```
### 🔐 Authentication
TigerStorage uses Princeton CAS (Central Authentication Service) to verify users. After logging in, the session is managed via Flask and persisted on the frontend using sessionStorage to maintain user roles and access control.

💡 Features
🔐 Princeton CAS authentication

👥 Role-based dashboards for renters and lenders

📦 Listing creation, editing, and deletion

💾 Session-based user persistence

🔒 Protected routes based on authentication

🧭 Dynamic UI rendering based on user role

🧪 Testing
There is no formal test suite at this time. To manually test:

Use Postman or curl to check API routes

Use React Developer Tools to verify frontend state

Simulate login or mock session data locally for dev

📌 Roadmap / Future Enhancements
✅ Testing with Pytest + React Testing Library

✅ Image uploads for storage listings

✅ Payment integration (Stripe, PayPal)

✅ User profiles and preferences

✅ Admin dashboard

✅ Responsive mobile design

❓ FAQ
Q: Can anyone use this platform?
A: No — authentication is restricted to Princeton University users via CAS.

Q: Why can’t the frontend access the backend?
A: Make sure your .env file includes a valid VITE_API_URL, and CORS is configured in Flask.

Q: How do I reset the database?
A:
   ```bash
   psql "your-connection-string" -f backend/database.sql
   ```

### 👩‍💻 Contributors
Diya Hundiwala
Shirley Yu
Cindy Tong