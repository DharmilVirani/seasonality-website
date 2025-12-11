# Seasonality SaaS - Architecture Documentation

## System Architecture Flow

### 1. High-Level Data Flow Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                                USER INTERFACE                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                        NextJS Frontend Application                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────────────────┐  │  │
│  │  │  Upload     │  │  Data       │  │  Visualization                   │  │  │
│  │  │  Component  │  │  Display    │  │  Dashboard                       │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                                API GATEWAY                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                        Express.js Server                                  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────────────────┐  │  │
│  │  │  File       │  │  Data       │  │  Query                           │  │  │
│  │  │  Upload     │  │  Processing │  │  Endpoints                       │  │  │
│  │  │  Endpoint   │  │  Endpoint   │  │  (GET/POST)                     │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                                SERVICE LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────────────────┐  │  │
│  │  │  CSV        │  │  Data       │  │  Database                        │  │  │
│  │  │  Processor  │  │  Validator  │  │  Service                         │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────────────────────────────┘  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────────────────┐  │  │
│  │  │  Ticker     │  │  Storage    │  │  Cache                           │  │  │
│  │  │  Manager    │  │  Service    │  │  Manager                         │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                                DATA LAYER                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────────────────┐  │  │
│  │  │  PostgreSQL │  │  MinIO      │  │  Redis                           │  │  │
│  │  │  (Prisma    │  │  (File      │  │  (Caching)                       │  │  │
│  │  │  ORM)       │  │  Storage)   │  │                                  │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 2. CSV Processing Flow

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                                CSV UPLOAD PROCESS                              │
└───────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: FILE RECEPTION                                                           │
│  - User uploads CSV file via frontend                                            │
│  - File saved temporarily in MinIO                                               │
└───────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: COLUMN NORMALIZATION                                                    │
│  - Convert column headers to lowercase                                           │
│  - Remove all spaces from column names                                           │
│  - Example: "Open Interest" → "openinterest"                                     │
└───────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: COLUMN VALIDATION                                                       │
│  - Check for required columns: date, ticker, close                               │
│  - Reject if any required column missing                                         │
│  - Accept optional columns: open, high, low, volume, openinterest                │
└───────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  STEP 4: DATA VALIDATION                                                         │
│  - Check for null values in mandatory fields (date, ticker, close)               │
│  - Reject file if any mandatory field has null values                           │
└───────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  STEP 5: NULL VALUE HANDLING                                                     │
│  - Volume/OpenInterest null → set to 0                                           │
│  - Open null → set to adjacent Close value                                       │
└───────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  STEP 6: TICKER INDEX MANAGEMENT                                                 │
│  - Extract unique tickers from CSV                                               │
│  - Check if ticker exists in Ticker table                                        │
│  - If not, create new entry with auto-increment ID                               │
│  - If exists, use existing ID                                                    │
└───────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  STEP 7: DATA STORAGE                                                            │
│  - Store processed data in SeasonalityData table                                 │
│  - Use ticker IDs instead of ticker strings                                      │
│  - Create composite unique constraint (date + tickerId)                          │
│  - Store original CSV in MinIO with name "Seasonality"                           │
└───────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  STEP 8: RESPONSE                                                                │
│  - Return success message with processing summary                                │
│  - Or return error message with specific validation failure                      │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 3. Database Schema Relationships

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                                DATABASE RELATIONSHIPS                           │
└───────────────────────────────────────────────────────────────────────────────┘

Ticker Table (1) ────────────┐
                            │
                            ▼
SeasonalityData Table (N) ────┘

Relationship: One-to-Many
- One ticker can have many seasonality data entries
- Each seasonality data entry belongs to one ticker

Index Strategy:
- Ticker.symbol: Unique index for fast lookup
- SeasonalityData.date: Index for date-based queries
- SeasonalityData.tickerId: Index for ticker-based queries
- Composite unique (date + tickerId): Prevents duplicate entries
```

### 4. Error Handling Flow

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                                ERROR HANDLING                                  │
└───────────────────────────────────────────────────────────────────────────────┘

Valid Upload → Process Data → Store in DB → Return Success
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  ERROR: Missing Required Columns                                                  │
│  - Return: "Column name not valid. Required columns: date, ticker, close"       │
└───────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  ERROR: Null Values in Mandatory Fields                                           │
│  - Return: "Mandatory fields (date, ticker, close) cannot be null"              │
└───────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  ERROR: File Processing Failure                                                   │
│  - Return: "Failed to process CSV file: [specific error]"                       │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 5. Deployment Architecture

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                                DEPLOYMENT ARCHITECTURE                         │
└───────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────┐
│                                CLOUDFLARE TUNNEL                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  Secure access to internal services via Cloudflare Tunnel                │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                                UBUNTU SERVER                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────────────────┐  │  │
│  │  │  PostgreSQL │  │  Redis      │  │  MinIO                           │  │  │
│  │  │  (Port 5432)│  │  (Port     │  │  (Port 9000)                    │  │  │
│  │  │             │  │  6379)      │  │                                  │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────────────────────────────┘  │  │
│  │  ┌─────────────┐  ┌───────────────────────────────────────────────────┐  │  │
│  │  │  Frontend   │  │  Backend                                   │  │  │
│  │  │  (NextJS)   │  │  (Node.js/Express)                        │  │  │
│  │  │  (Port 3000)│  │  (Port 3001)                              │  │  │
│  │  └─────────────┘  └───────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Key Architecture Decisions

1. **Monorepo Structure**: Using PNPM workspaces for shared dependencies and easier management
2. **Separation of Concerns**: Clear separation between frontend, backend, and shared packages
3. **Prisma ORM**: Type-safe database access with auto-generated client
4. **MinIO Integration**: Scalable object storage for CSV files
5. **Redis Caching**: Improve performance for frequent queries
6. **Cloudflare Tunnel**: Secure remote access without exposing ports publicly
7. **Error-First Design**: Comprehensive validation before data processing
8. **Idempotent Operations**: Prevent duplicate data entries with unique constraints
