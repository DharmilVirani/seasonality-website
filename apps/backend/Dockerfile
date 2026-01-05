# FROM node:18

# WORKDIR /app

# COPY package*.json ./
# RUN npm install

# COPY . .

# EXPOSE 3001

# CMD ["npm", "run", "dev"]


FROM node:18

WORKDIR /app

# Copy package files and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy rest of the application
COPY . .

EXPOSE 3001

# Create inline entrypoint script
RUN echo '#!/bin/sh\n\
set -e\n\
echo "=========================================="\n\
echo "Waiting for PostgreSQL to be ready..."\n\
echo "=========================================="\n\
\n\
# Wait for postgres\n\
until nc -z -v -w30 ${POSTGRES_HOST:-yt-postgres} 5432 2>/dev/null || sleep 2; do\n\
  echo "Waiting for database connection..."\n\
done\n\
\n\
echo "=========================================="\n\
echo "PostgreSQL is ready!"\n\
echo "Running Prisma DB Push..."\n\
echo "=========================================="\n\
\n\
npx prisma db push --skip-generate --accept-data-loss || echo "⚠️  DB Push failed"\n\
\n\
echo "=========================================="\n\
echo "Database schema synchronized!"\n\
echo "Starting application..."\n\
echo "=========================================="\n\
\n\
exec "$@"' > /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]