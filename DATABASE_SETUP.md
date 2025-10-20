# Database Setup Guide

This project supports dual database configuration:
- **SQLite** for local development (file: `prisma/dev.db`)
- **PostgreSQL** for production (AWS App Runner with Supabase)

## Local Development (SQLite)

### Setup
1. Ensure `.env.local` exists with:
   ```env
   DATABASE_URL="file:./dev.db"
   ```

2. Generate Prisma client for SQLite:
   ```bash
   npm run db:generate:local
   ```

3. Apply migrations or push schema:
   ```bash
   npm run db:push:local
   # or
   npm run db:migrate:local
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

### Available Commands for Local Development
- `npm run db:generate:local` - Generate Prisma client using SQLite schema
- `npm run db:migrate:local` - Run migrations for SQLite
- `npm run db:push:local` - Push schema changes to SQLite (no migration files)
- `npm run db:studio:local` - Open Prisma Studio for SQLite database

## Production (PostgreSQL)

### Setup
1. Ensure `.env` or environment variables contain:
   ```env
   DATABASE_URL="postgresql://user:password@host:6543/database"
   ```

2. Generate Prisma client for PostgreSQL:
   ```bash
   npm run db:generate
   ```

3. Apply migrations:
   ```bash
   npm run db:migrate
   # or
   npm run db:push
   ```

### Available Commands for Production
- `npm run db:generate` - Generate Prisma client using PostgreSQL schema
- `npm run db:migrate` - Run migrations for PostgreSQL
- `npm run db:push` - Push schema changes to PostgreSQL
- `npm run db:studio` - Open Prisma Studio for PostgreSQL database

## Schema Files

- `prisma/schema.prisma` - PostgreSQL schema (for production)
- `prisma/schema.sqlite.prisma` - SQLite schema (for local development)

Both schemas are kept in sync manually. When making schema changes:
1. Update both schema files
2. Run the appropriate generate/migrate command for your environment

## Environment Files

- `.env.local` - Local development settings (SQLite, gitignored)
- `.env` - Production settings (PostgreSQL, gitignored)
- `.env.example` - Template for both configurations

## Notes

- Next.js automatically prioritizes `.env.local` over `.env` in development
- The SQLite database file (`dev.db`) is stored in `prisma/dev.db`
- In production (AWS App Runner), environment variables override any `.env` files
