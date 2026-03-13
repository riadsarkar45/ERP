# ERP Authentication Setup Guide

This guide will help you set up the complete authentication system with backend API, PostgreSQL database, and frontend integration.

## 🏗️ Architecture Overview

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express + JWT
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: JWT tokens with secure storage

## 📋 Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** database server
3. **Git** for version control

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
# Install frontend and backend dependencies
npm run setup

# Or manually:
npm install
cd server && npm install
```

### 2. Database Setup

#### Option A: Local PostgreSQL
1. Install PostgreSQL on your system
2. Create a new database:
```sql
CREATE DATABASE erp_db;
CREATE USER erp_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE erp_db TO erp_user;
```

#### Option B: Cloud Database (Recommended)
- Use services like **Supabase**, **Railway**, or **Neon**
- Get your PostgreSQL connection string

### 3. Environment Configuration

Create `server/.env` file:

```env
# Database - Replace with your actual database URL
DATABASE_URL="postgresql://erp_user:your_password@localhost:5432/erp_db?schema=public"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters-long"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=5000
NODE_ENV="development"

# Frontend URL for CORS
FRONTEND_URL="http://localhost:5173"
```

### 4. Database Migration

```bash
# Generate Prisma client
npm run server:db:generate

# Push database schema
npm run server:db:push

# Verify database connection
npm run server:db:studio
```

### 5. Start Development Servers

```bash
# Start both frontend and backend
npm run dev:full

# Or start separately:
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
npm run server:dev
```

## 🔐 Authentication Features

### User Registration
- Full name, email, password validation
- Role-based access (USER, MANAGER, ADMIN)
- Secure password hashing with bcryptjs
- Automatic login after registration

### User Login
- Email and password authentication
- JWT token generation
- Persistent login with localStorage
- Automatic redirect to dashboard

### Protected Routes
- All dashboard routes require authentication
- Automatic redirect to login if not authenticated
- Token validation on each request

### User Management
- User profile display in sidebar
- Role-based permissions
- Secure logout with token cleanup

## 🛡️ Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Tokens**: Secure token generation and validation
- **Rate Limiting**: 100 requests per 15 minutes
- **CORS Protection**: Configured for frontend domain
- **Helmet Security**: Security headers
- **Input Validation**: Server-side validation
- **SQL Injection Protection**: Prisma ORM

## 📊 Database Schema

### Users Table
```sql
- id: String (Primary Key)
- email: String (Unique)
- password: String (Hashed)
- name: String
- role: Enum (ADMIN, MANAGER, USER)
- isActive: Boolean
- createdAt: DateTime
- updatedAt: DateTime
```

### Orders Table
```sql
- id: String (Primary Key)
- orderNumber: String (Unique)
- factoryName: String
- yarnComposition: String
- price: Float
- quantity: Integer
- orderDate: DateTime
- deliveryDate: DateTime (Optional)
- status: Enum (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
- notes: String (Optional)
- userId: String (Foreign Key)
- createdAt: DateTime
- updatedAt: DateTime
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Orders (Protected)
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get single order
- `POST /api/orders` - Create order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

## 🧪 Testing the Setup

### 1. Test Backend API
```bash
# Health check
curl http://localhost:5000/health

# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123","role":"USER"}'
```

### 2. Test Frontend
1. Open http://localhost:5173
2. Should redirect to login page
3. Register a new account
4. Login and access dashboard

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Test connection
psql -h localhost -U erp_user -d erp_db

# Reset database schema
npm run server:db:push --force-reset
```

### CORS Issues
- Ensure `FRONTEND_URL` in `.env` matches your frontend URL
- Check browser console for CORS errors

### JWT Token Issues
- Ensure `JWT_SECRET` is at least 32 characters
- Clear localStorage if tokens are corrupted
- Check token expiration settings

### Port Conflicts
- Frontend: Change port in `vite.config.js`
- Backend: Change `PORT` in `.env`

## 📝 Development Workflow

1. **Frontend Development**: http://localhost:5173
2. **Backend API**: http://localhost:5000
3. **Database Studio**: http://localhost:5555 (run `npm run server:db:studio`)
4. **API Documentation**: Check `server/README.md`

## 🚀 Production Deployment

### Backend Deployment
1. Set production environment variables
2. Run database migrations: `npm run server:db:migrate`
3. Start with: `npm run server:start`

### Frontend Deployment
1. Build: `npm run build`
2. Deploy `dist` folder to your hosting service
3. Update API base URL for production

## 📚 Next Steps

- [ ] Implement password reset functionality
- [ ] Add email verification
- [ ] Implement refresh tokens
- [ ] Add user profile management
- [ ] Implement role-based permissions
- [ ] Add audit logging
- [ ] Implement API rate limiting per user

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section
2. Verify all environment variables
3. Check server and database logs
4. Ensure all dependencies are installed

The authentication system is now fully integrated and ready for development!