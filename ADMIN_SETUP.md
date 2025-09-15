# Admin Setup and Seeding

This document explains how to set up and seed admin users for the BAAB platform.

## Admin Seeding

The platform includes an admin seeding system that creates initial administrator accounts with proper roles and permissions.

### Running Admin Seeding

```bash
# Navigate to the API directory
cd apps/api

# Run the admin seeding script
npm run seed:admin
```

### Environment Variables

The seeding process uses the following environment variables. Add them to your `.env` file:

```bash
# Super Admin Configuration (Required)
SUPER_ADMIN_EMAIL="superadmin@baab.iq"
SUPER_ADMIN_PASSWORD="SuperAdmin123!"
SUPER_ADMIN_NAME="Super Administrator"

# Default Admin Users (Optional)
CONTENT_ADMIN_EMAIL="content@baab.iq"
CONTENT_ADMIN_PASSWORD="ContentAdmin123!"

INVESTMENT_ADMIN_EMAIL="investment@baab.iq"
INVESTMENT_ADMIN_PASSWORD="InvestmentAdmin123!"

USER_ADMIN_EMAIL="users@baab.iq"
USER_ADMIN_PASSWORD="UserAdmin123!"
```

### Default Admin Accounts Created

1. **Super Administrator** (`superadmin@baab.iq`)
   - Role: `SUPER_ADMIN`
   - Has ALL permissions
   - Can manage all aspects of the system

2. **Content Moderator** (`content@baab.iq`)
   - Role: `CONTENT_MODERATOR`
   - Permissions:
     - MANAGE_CONTENT
     - MANAGE_BUSINESSES
     - VIEW_BUSINESSES
     - VIEW_ANALYTICS

3. **Investment Moderator** (`investment@baab.iq`)
   - Role: `INVESTMENT_MODERATOR`
   - Permissions:
     - MANAGE_INVESTMENT_REQUESTS
     - REVIEW_INVESTMENT_REQUESTS
     - VIEW_INVESTMENT_REQUESTS
     - VIEW_BUSINESSES
     - VIEW_ANALYTICS

4. **User Manager** (`users@baab.iq`)
   - Role: `USER_MANAGER`
   - Permissions:
     - MANAGE_USERS
     - VIEW_USERS
     - ASSIGN_ROLES
     - VIEW_ANALYTICS

## Admin Role System

### Admin Roles

- `SUPER_ADMIN`: Full system access
- `CONTENT_MODERATOR`: Content and business management
- `INVESTMENT_MODERATOR`: Investment request management
- `USER_MANAGER`: User account management
- `READ_ONLY_ADMIN`: View-only access

### Permissions

The system includes granular permissions for fine-grained access control:

- **Business Management**: MANAGE_BUSINESSES, VERIFY_BUSINESSES, VIEW_BUSINESSES
- **Investment Requests**: MANAGE_INVESTMENT_REQUESTS, REVIEW_INVESTMENT_REQUESTS, VIEW_INVESTMENT_REQUESTS
- **User Management**: MANAGE_USERS, VIEW_USERS, ASSIGN_ROLES
- **System Management**: MANAGE_SETTINGS, VIEW_ANALYTICS, MANAGE_CONTENT
- **Administrative**: MANAGE_ADMINS, ASSIGN_ADMIN_ROLES

## Security Notes

- Change default passwords in production
- Use strong, unique passwords for each admin account
- The seeding script is idempotent - it won't create duplicate accounts
- Existing admin accounts will be updated with proper roles and permissions if needed

## Troubleshooting

If seeding fails, check:

1. Database connection is working
2. Environment variables are properly set
3. No conflicting user accounts exist
4. Database schema is up to date (`npx prisma db push`)
