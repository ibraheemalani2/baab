# BAAB Database Schema Documentation

## Overview

The BAAB investment platform uses PostgreSQL with Prisma ORM for type-safe database operations. The schema is designed for scalability, performance, and data integrity in a production investment marketplace environment.

## Database Configuration

- **Database**: PostgreSQL 15+
- **ORM**: Prisma v6+
- **Connection Pooling**: Built-in with Prisma
- **Environment**: Development/Production ready

## Core Models

### User Model (`users` table)

Primary user management and authentication.

**Key Fields:**

- `id`: Unique identifier (CUID)
- `email/phone`: Authentication methods (unique, optional)
- `role`: USER | ADMIN (enum)
- `emailVerified/phoneVerified`: Verification status
- Profile: `name`, `city`, `businessType`, `image`

**Relations:**

- One-to-many: `businesses`, `notifications`, `verificationTokens`
- Many-to-many: `investmentRequests` (as both investor and business owner)

### Business Model (`businesses` table)

Business listings and investment opportunities.

**Key Fields:**

- `title`, `description`: Business information
- `price`: Investment amount (stored in cents for precision)
- `currency`: USD | IQD (enum)
- `status`: PENDING | APPROVED | REJECTED | SOLD | FUNDED | SUSPENDED
- `city`, `category`: Location and business type
- `location`: Specific address
- `established`, `employees`, `monthlyRevenue`: Business metrics
- `tags[]`: Searchable tags array
- `images[]`: Image URLs array

**Relations:**

- Many-to-one: `owner` (User)
- One-to-many: `investmentRequests`, `notifications`

### Investment Request Model (`investment_requests` table)

Investment proposals and transaction management.

**Key Fields:**

- `requestedAmount/offeredAmount`: Financial terms (cents)
- `currency`: Transaction currency
- `status`: PENDING | APPROVED | REJECTED | WITHDRAWN | COMPLETED
- `investorType`: INDIVIDUAL | COMPANY | FUND
- `message`: Investor's proposal message
- `previousInvestments`: Investor track record

**Relations:**

- Many-to-one: `business`, `investor` (User), `businessOwner` (User)

### Notification Model (`notifications` table)

Real-time user notifications and activity tracking.

**Key Fields:**

- `type`: Enum of notification types (INVESTMENT_REQUEST, etc.)
- `priority`: LOW | MEDIUM | HIGH | URGENT
- `read`: Boolean status with `readAt` timestamp
- `actionUrl`: Deep link for notification action
- `metadata`: JSON field for flexible notification data

**Relations:**

- Many-to-one: `user`, `business` (optional)

### Verification Token Model (`verification_tokens` table)

Email, phone, and password reset token management.

**Key Fields:**

- `token`: Unique verification token
- `type`: EMAIL_VERIFICATION | PHONE_VERIFICATION | PASSWORD_RESET
- `expiresAt`: Token expiration (24-hour default)

**Relations:**

- Many-to-one: `user`

## Performance Optimizations

### Primary Indexes

All tables include standard indexes on:

- Primary keys (automatic)
- Foreign keys (automatic)
- Unique constraints (`email`, `phone`, `token`)

### Composite Indexes

Optimized for common query patterns:

**Business Queries:**

- `(status, city)`: Location-filtered listings
- `(category, status)`: Category browsing
- `(status, createdAt DESC)`: Latest approved businesses
- `(city, category, status)`: Complex search filtering

**Investment Request Queries:**

- `(businessOwnerId, status)`: Owner dashboard
- `(investorId, status)`: Investor portfolio
- `(status, requestDate DESC)`: Recent requests by status
- `(businessOwnerId, status, requestDate DESC)`: Owner request management

**Notification Queries:**

- `(userId, read)`: Unread notifications
- `(userId, timestamp DESC)`: Latest notifications
- `(userId, read, timestamp DESC)`: Notification dashboard
- `(userId, type, read)`: Filtered notifications

### Query Performance Guidelines

**Recommended Patterns:**

```typescript
// ✅ Uses composite index (status, city)
const businesses = await prisma.business.findMany({
  where: {
    status: "APPROVED",
    city: "بغداد",
  },
});

// ✅ Uses composite index (userId, read)
const unreadNotifications = await prisma.notification.findMany({
  where: {
    userId: user.id,
    read: false,
  },
});

// ✅ Uses composite index (businessOwnerId, status, requestDate DESC)
const ownerRequests = await prisma.investmentRequest.findMany({
  where: {
    businessOwnerId: owner.id,
    status: "PENDING",
  },
  orderBy: { requestDate: "desc" },
});
```

**Anti-patterns to Avoid:**

```typescript
// ❌ Full table scan - no index on description
const businesses = await prisma.business.findMany({
  where: { description: { contains: "text" } },
});

// ❌ Inefficient - should use composite index
const results = await prisma.notification.findMany({
  where: { userId: user.id },
  orderBy: { timestamp: "desc" },
});
```

## Data Types & Precision

### Currency Handling

- All monetary values stored as integers (cents/fils)
- Example: $25,000 stored as `2500000`
- Provides precision and avoids floating-point errors
- Convert for display: `amount / 100`

### Arrays

- `images[]`: Array of image URL strings
- `tags[]`: Array of searchable tag strings
- PostgreSQL native array support for efficient queries

### JSON Fields

- `metadata`: JSONB field in notifications for flexible data
- Indexed automatically by PostgreSQL for key-based queries
- Use for notification-specific contextual data

## Security Considerations

### Data Protection

- Password hashing with bcrypt (12 rounds)
- Verification tokens with expiration
- Cascade deletes for data consistency
- Foreign key constraints enforced

### Access Control

- Role-based permissions (USER/ADMIN)
- Owner-based business access
- Secure token generation (CUID)

## Migration Strategy

### Development

1. Schema changes in `schema.prisma`
2. Generate migration: `npx prisma migrate dev`
3. Update Prisma Client: `npx prisma generate`

### Production

1. Review migration SQL files
2. Backup database before migration
3. Apply with downtime planning: `npx prisma migrate deploy`
4. Verify data integrity post-migration

## Backup & Recovery

### Recommended Practices

- Daily automated backups
- Point-in-time recovery capability
- Test restore procedures regularly
- Monitor disk space and performance

### Development Data

- Seed script: `npx tsx prisma/seed.ts`
- Sample data for testing and development
- Reset command available for clean state

## Monitoring & Maintenance

### Performance Monitoring

- Query execution time tracking
- Index usage analysis
- Connection pool monitoring
- Slow query identification

### Recommended Tools

- pgAdmin for database management
- pg_stat_statements for query analysis
- Connection pooling (built into Prisma)
- Automated vacuum and analyze (PostgreSQL default)

## Future Scalability

### Horizontal Scaling Preparation

- Indexed foreign keys for efficient joins
- Normalized design for data consistency
- JSON metadata for schema flexibility
- Connection pooling for concurrent access

### Additional Indexes (When Needed)

- Full-text search on business titles/descriptions
- Geospatial indexes for location-based queries
- Partial indexes for specific use cases
- Expression indexes for calculated values

This schema design supports the current BAAB platform requirements while providing a foundation for future growth and feature expansion.
