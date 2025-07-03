# TigerStorage

TigerStorage is a full-stack storage rental platform for Princeton University students. With secure CAS authentication, students can easily rent or offer storage space during transitional periods such as summer break or study abroad. It provides tailored dashboards for both **renters** and **lenders**, with intuitive listing management and seamless user experience.

---

## Tech Stack

| Layer       | Technology      |
|-------------|-----------------|
| Frontend    | React + Vite     |
| Backend     | Flask (Python)   |
| Database    | PostgreSQL       |
| Auth        | Princeton CAS    |
| Deployment  | Render           |

<img src="docs/images/tech-stack.png" alt="Tech Stack Diagram" width="500"/>

---

## Database Schema

<img src="docs/images/db-schema.png" alt="Database Schema Diagram" width="800"/> 

---

## Live Demo

- **Link**: [https://tigerstorage-frontend.onrender.com](https://tigerstorage-frontend.onrender.com)
- ***Note: The live demo link is currently down.***

---

## User Interface Previews
Landing page
<img src="docs/images/frontpage.png" alt="Frontpage" width="800"/> 
Renter dashboard 
- Map view
<img src="docs/images/map.png" alt="Map view" width="800"/> 
<img src="docs/images/listing.png" alt="Map view listing" width="800"/> 
<img src="docs/images/listing-request.png" alt="Map view listing request" width="800"/> 
- Grid view
<img src="docs/images/grid-view.png" alt="Grid view" width="800"/> 
<img src="docs/images/renter-dashboard.png" alt="Approved request" width="800"/> 

Lender dashboard
<img src="docs/images/lender-dashboard.png" alt="Lender dashboard" width="800"/> 
- Create a listing 
<img src="docs/images/add-listing.png" alt="Create listing" width="800"/> 
<img src="docs/images/lender-dashboard-2.png" alt="Reflected dashboard" width="800"/> 
- View details of a listing
<img src="docs/images/view-details.png" alt="View details listing" width="800"/> 
- Approving a renter request
<img src="docs/images/partial-reservation.png" alt="Approving request" width="800"/> 
Admin platform
<img src="docs/images/admin-dashboard.png" alt="Admin dashboard" width="800"/> 
Additional features

- Ratings for lenders
<img src="docs/images/ratings.png" alt="Admin dashboard" width="800"/> 
- Flagging listings
<img src="docs/images/report-listing.png" alt="Admin dashboard" width="800"/> 

### Testing
There is no formal test suite at this time. To manually test:
- Use Postman or curl to check API routes
- Use React Developer Tools to verify frontend state
- Simulate login or mock session data locally

### Roadmap / Future Enhancements
- Testing with Pytest + React Testing Library
- Image uploads for storage listings
- Payment integration (Stripe, PayPal)
- User profiles and preferences
- Admin dashboard
- Responsive mobile design
- Chatbot integration for support
<img src="docs/images/chatbot.png" alt="Chatbot" width="100"/> 

### FAQ
Q: Can anyone use this platform?
A: No — authentication is restricted to Princeton University users via CAS.

Q: Why can't the frontend access the backend?
A: Make sure your .env file includes a valid VITE_API_URL, and CORS is configured in Flask.

Q: How do I reset the database?

```bash
psql "your-connection-string" -f backend/database.sql
```

### Contributors
- Diya Hundiwala (Computer Science Princeton '27)
- Shirley Yu (Computer Science Princeton '27)
- Cindy Tong (Computer Science Princeton '27)