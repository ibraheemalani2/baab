-- CreateIndex
CREATE INDEX "businesses_status_city_idx" ON "public"."businesses"("status", "city");

-- CreateIndex
CREATE INDEX "businesses_category_status_idx" ON "public"."businesses"("category", "status");

-- CreateIndex
CREATE INDEX "businesses_status_createdAt_idx" ON "public"."businesses"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "businesses_city_category_status_idx" ON "public"."businesses"("city", "category", "status");

-- CreateIndex
CREATE INDEX "investment_requests_businessOwnerId_status_idx" ON "public"."investment_requests"("businessOwnerId", "status");

-- CreateIndex
CREATE INDEX "investment_requests_investorId_status_idx" ON "public"."investment_requests"("investorId", "status");

-- CreateIndex
CREATE INDEX "investment_requests_status_requestDate_idx" ON "public"."investment_requests"("status", "requestDate" DESC);

-- CreateIndex
CREATE INDEX "investment_requests_businessOwnerId_status_requestDate_idx" ON "public"."investment_requests"("businessOwnerId", "status", "requestDate" DESC);

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "public"."notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "notifications_userId_timestamp_idx" ON "public"."notifications"("userId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "notifications_userId_read_timestamp_idx" ON "public"."notifications"("userId", "read", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "notifications_userId_type_read_idx" ON "public"."notifications"("userId", "type", "read");
