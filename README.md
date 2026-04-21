# ⚙️ Traynor — Backend API

REST API for the Traynor fitness platform. Handles trainer 
registration, admin authentication, and client-facing 
search endpoints.

## 🔗 Frontend Repo
[TraynorFront](https://github.com/safucileGH/TraynorFront)

## 🛠️ Tech Stack

- **Node.js** + **Express.js** — REST API
- **MySQL** — Relational database
- **JWT (JSON Web Tokens)** — Admin authentication & session management
- **bcrypt** — Password hashing

## 📡 API Endpoints

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/admin/login` | Admin login | Public |
| GET | `/trainers` | Get all approved trainers | Public |
| GET | `/trainers/search?q=` | Search trainers by keyword | Public |
| POST | `/trainers` | Submit new trainer | Public |
| PUT | `/trainers/:id/approve` | Approve trainer | Admin JWT |
| DELETE | `/trainers/:id` | Remove trainer | Admin JWT |

## 🔐 Authentication Flow

1. Admin logs in via `/admin/login`
2. Server returns a signed JWT token
3. Token is sent in headers for protected routes
4. Invalid or expired tokens are rejected automatically

## ⚙️ Getting Started

### Prerequisites
- Node.js v18+
- MySQL running locally or on a cloud provider
- `.env` file configured (see below)

### Installation

```bash
git clone https://github.com/safucileGH/TraynorSiEs.git
cd TraynorSiEs/OneDrive/Desktop/traynor-backend
npm install
npm start
```

### Environment Variables

Create a `.env` file in the root:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=traynor
JWT_SECRET=your_secret_key
PORT=3001
```

## 🗄️ Database

See the full schema in the 
[base-de-datos-traynor](https://github.com/safucileGH/base-de-datos-traynor) 
repo.

## 👨‍💻 Author

**Santiago** — Full Stack Developer  
[GitHub](https://github.com/safucileGH) • 
[LinkedIn](https://www.linkedin.com/in/santiago-fucile-139a77324/)

---
*Node.js + Express + MySQL + JWT*
