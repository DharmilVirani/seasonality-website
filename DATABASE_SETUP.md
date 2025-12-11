# PostgreSQL Database Setup Guide

## 1. PostgreSQL Installation

### On Ubuntu (for your server):

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql

# Enable auto-start on boot
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

### On Windows (for local development):

1. Download PostgreSQL installer from https://www.postgresql.org/download/windows/
2. Run installer and follow default settings
3. Remember the password you set during installation

## 2. Database User and Database Creation

### Connect to PostgreSQL:

```bash
sudo -u postgres psql
```

### Create database user:

```sql
CREATE USER seasonality_user WITH PASSWORD 'your_strong_password';
```

### Create database:

```sql
CREATE DATABASE seasonality OWNER seasonality_user;
```

### Grant privileges:

```sql
GRANT ALL PRIVILEGES ON DATABASE seasonality TO seasonality_user;
```

### Exit PostgreSQL:

```sql
\\q
```

## 3. Configure PostgreSQL for Remote Access (if needed)

### Edit PostgreSQL configuration:

```bash
sudo nano /etc/postgresql/*/main/postgresql.conf
```

### Uncomment and modify:

```
listen_addresses = '*'
```

### Edit pg_hba.conf:

```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

### Add this line at the end:

```
host    all             all             0.0.0.0/0               md5
```

### Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

## 4. Environment Configuration

### Create .env file:

```bash
cd seasonality-saas
cp .env.example .env
```

### Edit .env file:

```
# Database configuration
DATABASE_URL="postgresql://seasonality_user:your_strong_password@localhost:5432/seasonality?schema=public"

# For remote server (if applicable)
# DATABASE_URL="postgresql://seasonality_user:your_strong_password@your_server_ip:5432/seasonality?schema=public"
```

## 5. Prisma Setup and Migration

### Install dependencies:

```bash
cd seasonality-saas
pnpm install
```

### Generate Prisma client:

```bash
pnpm prisma:generate
```

### Run database migration:

```bash
pnpm prisma:migrate
```

### This will:

1. Create the database tables (Ticker and SeasonalityData)
2. Set up proper relationships and constraints
3. Generate the Prisma client for TypeScript/JavaScript

## 6. Test Database Connection

### Start the backend:

```bash
pnpm --filter backend dev
```

### Test health endpoint:

```bash
curl http://localhost:3001/api/health
```

### Expected response:

```json
{
    "status": "healthy",
    "timestamp": "2023-11-15T10:00:00.000Z",
    "services": {
        "database": "connected",
        "api": "operational"
    }
}
```

## 7. Verify Database Tables

### Connect to database:

```bash
psql -U seasonality_user -d seasonality
```

### Check tables:

```sql
\\dt
```

### Check table structure:

```sql
\\d+ "Ticker"
\\d+ "SeasonalityData"
```

### Exit:

```sql
\\q
```

## 8. Troubleshooting

### Common issues and solutions:

**Connection refused**:

-   Check if PostgreSQL service is running: `sudo systemctl status postgresql`
-   Verify PostgreSQL is listening on correct port: `ss -tulnp | grep postgres`

**Authentication failed**:

-   Double-check username and password in .env file
-   Verify user has correct privileges

**Migration errors**:

-   Check if database exists: `psql -l`
-   Verify user has CREATE privileges

**Remote connection issues**:

-   Check firewall settings: `sudo ufw status`
-   Allow PostgreSQL port: `sudo ufw allow 5432/tcp`

## 9. Backup and Restore

### Backup database:

```bash
pg_dump -U seasonality_user -d seasonality -f seasonality_backup.sql
```

### Restore database:

```bash
psql -U seasonality_user -d seasonality -f seasonality_backup.sql
```

## 10. Production Considerations

### For production deployment:

1. Use strong, randomly generated passwords
2. Configure SSL for database connections
3. Set up regular backups
4. Implement connection pooling
5. Monitor database performance

### Connection pooling setup:

Add to your .env:

```
DATABASE_URL="postgresql://seasonality_user:password@localhost:5432/seasonality?schema=public&connection_limit=10"
```

This completes the PostgreSQL database setup for your Seasonality SaaS application!
