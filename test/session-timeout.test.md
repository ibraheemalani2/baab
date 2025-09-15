# Session Timeout Testing Guide

## Overview
This guide provides test cases for the new session timeout functionality that respects user's sessionTimeout preferences.

## Prerequisites
1. Start the Redis server: `docker-compose up -d redis`
2. Start the API server: `cd apps/api && pnpm start:dev`
3. Start the frontend: `cd apps/web && pnpm dev`

## Test Cases

### 1. Test Short Session Timeout (15 minutes)

1. **Setup User Settings:**
   - Login as a regular user (not ADMIN)
   - Go to Settings > Security
   - Set "Session Timeout" to "15 minutes"
   - Save settings

2. **Test Immediate Activity:**
   - Stay active on the dashboard
   - Navigate between pages every few minutes
   - ✅ Expected: Session should remain active

3. **Test Inactivity Timeout:**
   - Leave the browser idle for 16+ minutes
   - Try to make any API request (e.g., view a business listing)
   - ✅ Expected: Should get 401 error and be redirected to login

### 2. Test Medium Session Timeout (30 minutes - default)

1. **Setup:**
   - Login as a different user
   - Keep default session timeout (30 minutes)

2. **Test:**
   - Wait 31 minutes without activity
   - Try to access any protected endpoint
   - ✅ Expected: Session expires, gets logged out

### 3. Test No Session Timeout (0 = never expires)

1. **Setup:**
   - Login as a user
   - Set session timeout to "Never expires" (0 minutes)

2. **Test:**
   - Wait 1+ hours without activity
   - Try to access protected endpoints
   - ✅ Expected: Session should still be valid

### 4. Test Multiple Sessions (if allowMultipleSessions is false)

1. **Setup:**
   - Login as a user with allowMultipleSessions = false
   - Open another browser/incognito window
   - Try to login with same credentials

2. **Test:**
   - Check if the first session gets invalidated
   - ✅ Expected: Only one active session allowed

### 5. Test Logout Functionality

1. **Test:**
   - Login as any user
   - Click logout button
   - Check Redis cache for session data: `redis-cli keys "session:*"`
   - ✅ Expected: Session should be cleared from cache

## Manual Testing Commands

### Check Session in Redis
```bash
# Connect to Redis
docker exec -it kt-baab-redis-1 redis-cli

# List all session keys
keys "session:*"

# Check specific user session (replace USER_ID)
get "session:USER_ID"

# Check TTL (time to live) of session
ttl "session:USER_ID"
```

### API Testing with curl
```bash
# Login and get token
curl -X POST http://localhost:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"user@example.com","password":"password123"}'

# Test protected endpoint with token
curl -X GET http://localhost:3005/api/user-settings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test logout
curl -X POST http://localhost:3005/api/auth/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Expected Behavior

1. **Active Sessions:** When user is active, `lastActivity` timestamp gets updated on each request
2. **Expired Sessions:** When session timeout is exceeded, user gets 401 error with message "Session has expired due to inactivity"
3. **Session Extension:** Each API request extends the session by updating lastActivity
4. **No Timeout:** When sessionTimeout is 0, sessions never expire due to inactivity (but JWT token still expires after 7 days)
5. **Proper Cleanup:** Logout endpoint clears session from cache

## Troubleshooting

### If sessions aren't timing out:
1. Check Redis is running: `docker-compose ps`
2. Check user settings in database: `sessionTimeout` field should be > 0
3. Check server logs for any errors in JWT auth guard

### If sessions timeout too quickly:
1. Verify user's sessionTimeout setting is correct
2. Check Redis TTL: `ttl "session:USER_ID"`
3. Ensure user activity is being tracked (each request updates lastActivity)

## Notes

- ADMIN users (static ADMIN-001) are not subject to session timeout
- JWT tokens still have 7-day expiry regardless of session timeout setting
- Session timeout only applies to inactivity, not total session duration
- Each API request resets the inactivity timer


