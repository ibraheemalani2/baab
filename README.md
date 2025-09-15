# BAAB API Backend

**BAAB Investment Platform API** - NestJS backend for the Iraqi investment marketplace connecting business owners with investors.

## Description

Production-ready RESTful API built with NestJS, TypeScript, Prisma ORM, and PostgreSQL. Provides authentication, business management, investment workflows, and notification services.

## Features

- 🔐 **Authentication & Authorization** - JWT-based auth with role management
- 🏢 **Business Management** - CRUD operations for business listings
- 💰 **Investment Workflows** - Request/approval system for investments
- 🔔 **Notification System** - Real-time activity tracking
- 🌐 **Multi-language Support** - Arabic/English API responses
- 🛡️ **Security** - CORS, validation, rate limiting
- 📊 **Database** - PostgreSQL with Prisma ORM
- 🚀 **Performance** - Optimized queries with proper indexing

## Project Setup

```bash
$ pnpm install
```

## Database Setup

```bash
# Generate Prisma client
$ pnpm db:generate

# Run migrations
$ pnpm db:migrate

# Seed database with sample data
$ pnpm db:seed

# Open Prisma Studio (optional)
$ pnpm db:studio
```

## Development

```bash
# development mode
$ pnpm start:dev

# production mode
$ pnpm start:prod

# debug mode
$ pnpm start:debug
```

## Testing

```bash
# unit tests
$ pnpm test

# e2e tests
$ pnpm test:e2e

# test coverage
$ pnpm test:cov
```

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/user/:id` - Get user by ID

### Business Management

- `GET /api/businesses` - List businesses with filters
- `POST /api/businesses` - Create new business listing
- `GET /api/businesses/:id` - Get business details
- `PUT /api/businesses/:id` - Update business
- `DELETE /api/businesses/:id` - Delete business
- `GET /api/businesses/search?q=query` - Search businesses
- `GET /api/businesses/stats` - Get platform statistics

## Environment Variables

Create a `.env` file in the API root:

```bash
# Database
DATABASE_URL="postgresql://baab_ADMIN:ksdfjk32FEFfdsffewf3@localhost:5432/baab_main?schema=public"

# Redis (for future caching)
REDIS_URL="redis://localhost:6379"

# Server Configuration
PORT=3005
NODE_ENV=development

# API Keys (when needed)
# JWT_SECRET=your_jwt_secret
# PERPLEXITY_API_KEY=your_perplexity_key
```

## Docker Deployment

```bash
# Build and run with Docker Compose
$ docker-compose up -d

# API will be available at http://localhost:3005/api
```

## Architecture

```
src/
├── auth/                   # Authentication module
│   ├── auth.controller.ts  # Auth endpoints
│   ├── auth.service.ts     # Auth business logic
│   └── auth.module.ts      # Auth module definition
├── businesses/             # Business management module
│   ├── businesses.controller.ts
│   ├── businesses.service.ts
│   └── businesses.module.ts
├── prisma.service.ts       # Prisma client service
├── app.module.ts           # Main application module
└── main.ts                 # Application bootstrap

prisma/
├── schema.prisma           # Database schema
├── migrations/             # Database migrations
└── seed.ts                 # Sample data seeding
```

## Database Schema

- **Users** - Authentication and profiles
- **Businesses** - Investment listings
- **Investment Requests** - Request/approval workflow
- **Notifications** - Activity tracking
- **Verification Tokens** - Email/phone verification

See `docs/database-schema.md` for detailed documentation.

## Contributing

1. Follow the existing code style and patterns
2. Write tests for new features
3. Update documentation when needed
4. Use conventional commit messages

## Production Deployment

1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Build and deploy the application
5. Set up monitoring and logging

## License

This project is licensed under the MIT License.
