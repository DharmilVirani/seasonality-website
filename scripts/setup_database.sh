#!/bin/bash

# Seasonality SaaS Database Setup Script
# This script automates PostgreSQL setup and Prisma migrations

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if script is run as root
if [ "$(id -u)" -ne 0 ]; then
    echo -e "${RED}Please run this script as root or with sudo${NC}"
    exit 1
fi

# Function to display step
step() {
    echo -e "${YELLOW}=== $1 ===${NC}"
}

# Function to display success
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to display error
error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to check command existence
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

step "Updating package list"
apt update
if [ $? -eq 0 ]; then
    success "Package list updated"
else
    error "Failed to update package list"
    exit 1
fi

step "Installing PostgreSQL"
apt install -y postgresql postgresql-contrib
if [ $? -eq 0 ]; then
    success "PostgreSQL installed"
else
    error "Failed to install PostgreSQL"
    exit 1
fi

step "Starting PostgreSQL service"
systemctl start postgresql
systemctl enable postgresql
if [ $? -eq 0 ]; then
    success "PostgreSQL service started and enabled"
else
    error "Failed to start PostgreSQL service"
    exit 1
fi

step "Creating database user"
sudo -u postgres psql -c "CREATE USER seasonality_user WITH PASSWORD 'seasonality_password';"
if [ $? -eq 0 ]; then
    success "Database user created"
else
    error "Failed to create database user"
    exit 1
fi

step "Creating database"
sudo -u postgres psql -c "CREATE DATABASE seasonality OWNER seasonality_user;"
if [ $? -eq 0 ]; then
    success "Database created"
else
    error "Failed to create database"
    exit 1
fi

step "Granting privileges"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE seasonality TO seasonality_user;"
if [ $? -eq 0 ]; then
    success "Privileges granted"
else
    error "Failed to grant privileges"
    exit 1
fi

step "Configuring PostgreSQL for remote access"
# Backup original config files
cp /etc/postgresql/*/main/postgresql.conf /etc/postgresql/*/main/postgresql.conf.bak
cp /etc/postgresql/*/main/pg_hba.conf /etc/postgresql/*/main/pg_hba.conf.bak

# Configure listen addresses
sed -i "s/^#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/*/main/postgresql.conf

# Add host authentication
echo "host    all             all             0.0.0.0/0               md5" >> /etc/postgresql/*/main/pg_hba.conf

step "Restarting PostgreSQL"
systemctl restart postgresql
if [ $? -eq 0 ]; then
    success "PostgreSQL restarted"
else
    error "Failed to restart PostgreSQL"
    exit 1
fi

step "Setting up environment variables"
cd /path/to/seasonality-saas || { error "Failed to change directory"; exit 1; }

if [ ! -f ".env" ]; then
    cp .env.example .env
    success "Created .env file from template"
else
    success ".env file already exists"
fi

# Update database URL in .env
sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"postgresql://seasonality_user:seasonality_password@localhost:5432/seasonality?schema=public\"|" .env
success "Updated database URL in .env"

step "Installing project dependencies"
if command_exists pnpm; then
    pnpm install
elif command_exists npm; then
    npm install
else
    error "Neither pnpm nor npm found. Please install Node.js first."
    exit 1
fi

if [ $? -eq 0 ]; then
    success "Dependencies installed"
else
    error "Failed to install dependencies"
    exit 1
fi

step "Generating Prisma client"
pnpm prisma:generate
if [ $? -eq 0 ]; then
    success "Prisma client generated"
else
    error "Failed to generate Prisma client"
    exit 1
fi

step "Running database migrations"
pnpm prisma:migrate
if [ $? -eq 0 ]; then
    success "Database migrations completed"
else
    error "Failed to run database migrations"
    exit 1
fi

step "Testing database connection"
pnpm --filter backend dev &
sleep 5 # Wait for server to start

# Test health endpoint
HEALTH_STATUS=$(curl -s http://localhost:3001/api/health | grep -o '"database": "[^"]*"' | cut -d'"' -f4)

if [ "$HEALTH_STATUS" = "connected" ]; then
    success "Database connection successful"
    pkill -f "pnpm --filter backend dev" # Stop the test server
else
    error "Database connection failed"
    pkill -f "pnpm --filter backend dev" # Stop the test server
    exit 1
fi

echo -e "${GREEN}"
echo "============================================"
echo "Seasonality SaaS Database Setup Complete!"
echo "============================================"
echo -e "${NC}"
echo "Database: seasonality"
echo "User: seasonality_user"
echo "Password: seasonality_password"
echo "Port: 5432"
echo ""
echo "Next steps:"
echo "1. Update .env file with your production credentials"
echo "2. Start the application: pnpm dev"
echo "3. Test file uploads via the API"