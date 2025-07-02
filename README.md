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

tigerstorage/
├── backend/
│ ├── app.py
│ ├── requirements.txt
│ └── database.sql
├── frontend/
│ ├── src/
│ ├── index.html
│ └── vite.config.js
├── README.md
└── .env.example

---

## 🚀 Local Development

### 🔙 Backend Setup (Flask)

1. Navigate to the backend directory:
   ```bash
   cd backend
Create and activate a virtual environment:

bash
Copy
Edit
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
Install dependencies:

bash
Copy
Edit
pip install -r requirements.txt
Create a .env file:

ini
Copy
Edit
APP_SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://username:password@host:port/database_name
Run the Flask app:

bash
Copy
Edit
python app.py
App runs at: http://localhost:5000

⚛️ Frontend Setup (React + Vite)
Navigate to the frontend directory:

bash
Copy
Edit
cd frontend
Install dependencies:

bash
Copy
Edit
npm install
Create a .env file:

ini
Copy
Edit
VITE_API_URL=http://localhost:5000
Start the development server:

bash
Copy
Edit
npm run dev
App runs at: http://localhost:5173

☁️ Deployment (Render)
🛢️ PostgreSQL Setup
Create a PostgreSQL instance on Render.

Copy the connection string.

Initialize the database:

bash
Copy
Edit
psql "your-connection-string" -f backend/database.sql
🐍 Backend Deployment
Create a new Web Service on Render.

Connect your GitHub repository.

Configure the service:

Name: tigerstorage-backend

Environment: Python 3

Root Directory: backend

Build Command:

bash
Copy
Edit
pip install -r requirements.txt
Start Command:

bash
Copy
Edit
gunicorn app:app --log-file -
Add environment variables:

ini
Copy
Edit
APP_SECRET_KEY=your-secret-key
DATABASE_URL=your-render-database-url
⚛️ Frontend Deployment
Create a new Static Site on Render.

Connect your GitHub repository.

Configure the service:

Name: tigerstorage-frontend

Root Directory: frontend

Build Command:

bash
Copy
Edit
npm install && npm run build
Publish Directory: dist

Add environment variable:

ini
Copy
Edit
VITE_API_URL=https://tigerstorage-backend.onrender.com
🔐 Authentication
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

bash
Copy
Edit
psql "your-connection-string" -f backend/database.sql
👩‍💻 Contributors
Diya Hundiwala
Shirley Yu
Cindy Tong