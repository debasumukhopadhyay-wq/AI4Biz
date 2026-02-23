# AI4Biz – Student Registration Portal

A full-stack web application for registering students for the AI4Biz Free Demo Class.
Built using **Spec-Driven Development** with Node.js, Express, MongoDB, and a professional dark-theme frontend.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI

# 3. Run in development
npm run dev

# 4. Open in browser
# http://localhost:3000        → Student registration page
# http://localhost:3000/admin  → Admin dashboard
```

---

## Project Structure

```
AI4Biz/
├── server.js               # Express app entry point
├── models/Student.js       # Mongoose schema
├── routes/
│   ├── register.js         # POST /api/register
│   └── admin.js            # Admin CRUD routes
├── middleware/validate.js   # express-validator rules
└── public/
    ├── index.html           # Registration + Advertisement page
    ├── admin.html           # Admin dashboard
    ├── css/
    │   ├── styles.css       # Main stylesheet
    │   └── admin.css        # Admin stylesheet
    └── js/
        ├── main.js          # Frontend registration logic
        └── admin.js         # Admin dashboard logic
```

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/register` | Register a student |
| `GET` | `/api/register/check` | Check email/phone uniqueness |
| `GET` | `/api/admin/students` | List all students (with filters) |
| `GET` | `/api/admin/stats` | Dashboard statistics |
| `PATCH` | `/api/admin/students/:id` | Update student status |
| `DELETE` | `/api/admin/students/:id` | Delete a student |
| `GET` | `/api/health` | Health check |

---

## Tech Stack

- **Backend**: Node.js, Express 4, Mongoose, express-validator, Helmet
- **Database**: MongoDB
- **Frontend**: Vanilla JS, CSS custom properties, Font Awesome 6, Google Fonts
- **Dev**: Nodemon, ESLint, Jest

---

*Course: AI4Biz – Build Real AI Applications | Batch: March/April 2026*
