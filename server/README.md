# ERP Backend API

A Node.js/Express backend API with PostgreSQL, Prisma, and JWT authentication for the ERP Order Management System.

## Features

- 🔐 JWT Authentication (Login/Register/Logout)
- 👤 User Management with Roles (ADMIN, MANAGER, USER)
- 📦 Order Management (CRUD operations)
- 🛡️ Security middleware (Helmet, Rate Limiting, CORS)
- 🗄️ PostgreSQL database with Prisma ORM
- 📊 Order filtering and pagination

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Environment Configuration

Create a `.env` file in the server directory:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/erp_db?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV="development"

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:5173"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push database schema (for development)
npm run db:push

# Or run migrations (for production)
npm run db:migrate
```

### 4. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/logout` - Logout user (protected)

### Orders

- `GET /api/orders` - Get all orders (protected)
- `GET /api/orders/:id` - Get single order (protected)
- `POST /api/orders` - Create new order (protected)
- `PUT /api/orders/:id` - Update order (protected)
- `DELETE /api/orders/:id` - Delete order (protected)

### Health Check

- `GET /health` - Server health check

## Database Schema

### Users Table
- `id` - Unique identifier
- `email` - User email (unique)
- `password` - Hashed password
- `name` - User full name
- `role` - User role (ADMIN, MANAGER, USER)
- `isActive` - Account status
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

### Orders Table
- `id` - Unique identifier
- `orderNumber` - Order number (unique)
- `factoryName` - Factory name
- `yarnComposition` - Yarn composition details
- `price` - Order price
- `quantity` - Order quantity
- `orderDate` - Order date
- `deliveryDate` - Delivery date (optional)
- `status` - Order status (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
- `notes` - Additional notes (optional)
- `userId` - User who created the order
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

## Security Features

- Password hashing with bcryptjs
- JWT token authentication
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Helmet security headers
- Input validation
- SQL injection protection via Prisma

## Development Tools

```bash
# View database in browser
npm run db:studio

# Reset database (development only)
npx prisma db push --force-reset
```

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

## Success Responses

All successful responses follow this format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```