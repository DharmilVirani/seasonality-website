# Seasonality SaaS - Full Stack Application

## Tech Stack

-   **Frontend**: NextJS 14+ with React Server Components
-   **Backend**: Node.js with Express
-   **Database**: PostgreSQL with Prisma ORM
-   **Storage**: MinIO for file uploads
-   **Caching**: Redis
-   **Deployment**: Cloudflare Tunnel for secure access

## Architecture Overview

### System Flow:

1. **User Uploads CSV** → Frontend → API Gateway → File Processing Service
2. **File Validation** → CSV Parser → Column Normalization → Data Validation
3. **Database Operations** → Prisma → PostgreSQL (Ticker Index + Master Data)
4. **Data Processing** → Null Handling → Data Transformation
5. **Storage** → Processed files stored in MinIO
6. **Response** → Success/Failure with appropriate messages

### Service Architecture:

```
┌───────────────────────────────────────────────────────────────┐
│                        User Interface                          │
│                        (NextJS Frontend)                      │
└───────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│                        API Gateway                             │
│                        (Express Server)                       │
└───────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│                        Services Layer                          │
│  ┌─────────────┐    ┌─────────────┐    ┌───────────────────┐  │
│  │ File Upload │    │ Data        │    │ Query            │  │
│  │ Service     │    │ Processing  │    │ Service          │  │
│  └─────────────┘    └─────────────┘    └───────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│                        Data Layer                              │
│  ┌─────────────┐    ┌─────────────┐    ┌───────────────────┐  │
│  │ PostgreSQL  │    │ MinIO       │    │ Redis             │  │
│  │ (Prisma ORM)│    │ (File      │    │ (Caching)         │  │
│  └─────────────┘    │ Storage)    │    └───────────────────┘  │
│                     └─────────────┘                          │
└───────────────────────────────────────────────────────────────┘
```

## Folder Structure

```
seasonality-saas/
├── .env                    # Environment variables
├── .gitignore              # Git ignore rules
├── README.md               # Project documentation
├── package.json            # Project dependencies
├── pnpm-workspace.yaml     # PNPM workspace config
│
├── apps/
│   ├── frontend/           # NextJS application
│   │   ├── public/         # Static assets
│   │   ├── src/
│   │   │   ├── app/        # NextJS app router
│   │   │   ├── components/ # React components
│   │   │   ├── lib/        # Utility functions
│   │   │   ├── styles/     # CSS/SCSS files
│   │   │   └── types/      # TypeScript types
│   │   ├── next.config.js  # NextJS config
│   │   └── package.json    # Frontend dependencies
│   │
│   └── backend/            # Node.js backend
│       ├── src/
│       │   ├── controllers/ # Route controllers
│       │   ├── services/    # Business logic
│       │   ├── routes/      # API routes
│       │   ├── middleware/  # Express middleware
│       │   ├── utils/       # Utility functions
│       │   ├── config/      # Configuration files
│       │   └── app.js       # Express app setup
│       ├── package.json     # Backend dependencies
│       └── ecosystem.config.js # PM2 config
│
├── packages/
│   └── prisma/             # Shared Prisma schema
│       ├── schema.prisma   # Database schema
│       └── package.json    # Prisma dependencies
│
└── scripts/                # Deployment and utility scripts
    ├── deploy.sh           # Deployment script
    ├── setup.sh            # Setup script
    └── cleanup.sh          # Cleanup script
```

## Database Schema Design

### Tables:

1. **tickers** - Stores unique ticker symbols with auto-incrementing IDs
2. **seasonality_data** - Main data table with foreign key to tickers

### Data Flow:

1. User uploads CSV → System normalizes column names
2. Validates required columns (Date, Ticker, Close)
3. Creates/updates ticker index
4. Processes data with null handling rules
5. Stores in seasonality_data table

## CSV Processing Rules:

-   Column name normalization: lowercase, remove spaces
-   Mandatory columns: date, ticker, close
-   Null handling:
    -   Volume/OpenInterest → 0
    -   Open → adjacent Close value
    -   Date/Ticker/Close → reject file
