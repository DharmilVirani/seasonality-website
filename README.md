# Seasonality Analysis Platform

A full-stack web application for financial seasonality analysis, capable of handling 100+ concurrent users. This platform converts the existing Dash application into a production-ready system with modern architecture.

## 🚀 Features

- **Real-time Financial Analysis**: Daily, weekly, monthly, and yearly market data analysis
- **Advanced Filtering**: Complex filtering by years, months, weeks, days, election periods
- **Interactive Charts**: Multiple chart types with filtering and overlay capabilities
- **Admin Panel**: CSV upload management and system administration
- **User Authentication**: JWT-based authentication with role management
- **Scalable Architecture**: Designed for 100+ concurrent users
- **Automated Maintenance**: Scheduled data processing and system maintenance

## 🏗️ Architecture

### Backend (Node.js/Express/TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens
- **Caching**: Redis for session and data caching
- **File Processing**: CSV upload and processing pipeline
- **API**: RESTful endpoints with rate limiting

### Frontend (React/TypeScript)
- **UI Framework**: Material-UI components
- **State Management**: Redux Toolkit
- **Data Fetching**: React Query (TanStack Query)
- **Charts**: Chart.js with react-chartjs-2
- **Routing**: React Router v6

### Deployment
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx
- **Database**: PostgreSQL with connection pooling
- **Cache**: Redis cluster
- **Monitoring**: Health checks and logging

## 📋 Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (if running locally)
- Redis (if running locally)

## 🛠️ Installation & Setup

### 1. Clone and Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### 2. Environment Configuration

```bash
# Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Frontend environment (if needed)
cp frontend/.env.example frontend/.env
```

### 3. Database Setup

```bash
# Using Docker Compose (recommended)
docker-compose up -d postgres redis

# Or using local PostgreSQL/Redis
# Make sure they are running on correct ports
```

### 4. Database Migration

```bash
cd backend
npx prisma generate
npx prisma db push
npm run db:seed  # Optional: seed with sample data
```

### 5. Start Development Servers

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Visit `http://localhost:3000` for the frontend and `http://localhost:3001` for the API.

## 🚢 Production Deployment

### Using Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Deployment

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serve dist/ folder with nginx or similar
```

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Data Endpoints
- `GET /api/data/daily` - Get filtered daily data
- `GET /api/data/weekly` - Get filtered weekly data
- `GET /api/data/monthly` - Get filtered monthly data
- `GET /api/data/yearly` - Get filtered yearly data

### Analysis Endpoints
- `POST /api/analysis/filter` - Apply complex filters
- `GET /api/analysis/statistics` - Get statistical summaries
- `GET /api/analysis/charts/:type` - Get chart data
- `GET /api/analysis/special-days` - Special day analysis

### Admin Endpoints
- `POST /api/admin/upload` - Upload CSV file
- `GET /api/admin/uploads` - List upload history
- `GET /api/admin/jobs` - Job status and logs

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/seasonality_db"
JWT_SECRET="your-jwt-secret"
REDIS_URL="redis://localhost:6379"
PORT=3001
NODE_ENV="development"
```

#### Frontend (.env)
```env
VITE_API_URL="http://localhost:3001/api"
```

## 📁 Project Structure

```
seasonality-software-main/
├── backend/                          # Node.js API
│   ├── prisma/                       # Database schema
│   ├── src/
│   │   ├── middleware/               # Express middleware
│   │   ├── routes/                   # API routes
│   │   ├── services/                 # Business logic
│   │   └── utils/                    # Utilities
│   └── package.json
├── frontend/                         # React UI
│   ├── src/
│   │   ├── components/               # Reusable components
│   │   ├── pages/                    # Page components
│   │   ├── store/                    # Redux store
│   │   └── utils/                    # Frontend utilities
│   └── package.json
├── docker-compose.yml               # Container orchestration
└── README.md
```

## 🔄 Migration from Dash

### Data Migration
1. Export existing CSV data
2. Transform to database format
3. Use admin panel to upload processed data
4. Validate data integrity

### Feature Migration
1. Convert Python filtering logic to TypeScript
2. Implement chart components with Chart.js
3. Build responsive UI with Material-UI
4. Add authentication and user management

## 📈 Performance & Scaling

- **Database**: Connection pooling, query optimization
- **Caching**: Redis for frequently accessed data
- **Rate Limiting**: API rate limiting per user
- **Load Balancing**: Nginx reverse proxy
- **Monitoring**: Health checks and logging

## 🛡️ Security

- JWT authentication with refresh tokens
- Rate limiting and request throttling
- Input validation and sanitization
- CORS configuration
- Helmet security headers
- SQL injection prevention with Prisma

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and add tests
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API documentation

---

**Note**: This is a complete rewrite of the Dash application with modern full-stack architecture. All original functionality is preserved and enhanced with production-ready features.