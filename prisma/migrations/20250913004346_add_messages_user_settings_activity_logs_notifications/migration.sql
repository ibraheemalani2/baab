-- CreateEnum
CREATE TYPE "public"."AdminRole" AS ENUM ('SUPER_ADMIN', 'CONTENT_MODERATOR', 'INVESTMENT_MODERATOR', 'USER_MANAGER', 'READ_ONLY_ADMIN');

-- CreateEnum
CREATE TYPE "public"."Permission" AS ENUM ('MANAGE_BUSINESSES', 'VERIFY_BUSINESSES', 'VIEW_BUSINESSES', 'MANAGE_INVESTMENT_REQUESTS', 'REVIEW_INVESTMENT_REQUESTS', 'VIEW_INVESTMENT_REQUESTS', 'MANAGE_USERS', 'VIEW_USERS', 'ASSIGN_ROLES', 'MANAGE_SETTINGS', 'VIEW_ANALYTICS', 'MANAGE_CONTENT', 'MANAGE_ADMINS', 'ASSIGN_ADMIN_ROLES');

-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('INQUIRY', 'NOTIFICATION', 'SYSTEM', 'SUPPORT', 'ADMIN_MESSAGE');

-- CreateEnum
CREATE TYPE "public"."MessageStatus" AS ENUM ('UNREAD', 'READ', 'REPLIED', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."MessagePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."ProfileVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'INVESTORS_ONLY');

-- AlterTable
ALTER TABLE "public"."businesses" ADD COLUMN     "verificationDate" TIMESTAMP(3),
ADD COLUMN     "verificationNotes" TEXT,
ADD COLUMN     "verifiedBy" TEXT;

-- AlterTable
ALTER TABLE "public"."investment_requests" ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "reviewDate" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "adminRole" "public"."AdminRole",
ADD COLUMN     "permissions" "public"."Permission"[];

-- CreateTable
CREATE TABLE "public"."messages" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "businessId" TEXT,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "public"."MessageType" NOT NULL DEFAULT 'INQUIRY',
    "status" "public"."MessageStatus" NOT NULL DEFAULT 'UNREAD',
    "priority" "public"."MessagePriority" NOT NULL DEFAULT 'MEDIUM',
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "marketingNotifications" BOOLEAN NOT NULL DEFAULT false,
    "investmentUpdates" BOOLEAN NOT NULL DEFAULT true,
    "businessUpdates" BOOLEAN NOT NULL DEFAULT true,
    "messageAlerts" BOOLEAN NOT NULL DEFAULT true,
    "weeklyDigest" BOOLEAN NOT NULL DEFAULT true,
    "profileVisibility" "public"."ProfileVisibility" NOT NULL DEFAULT 'INVESTORS_ONLY',
    "showContactInfo" BOOLEAN NOT NULL DEFAULT false,
    "showBusinessCount" BOOLEAN NOT NULL DEFAULT true,
    "showInvestmentHistory" BOOLEAN NOT NULL DEFAULT false,
    "allowDirectMessages" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'ar',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "currency" "public"."Currency" NOT NULL DEFAULT 'USD',
    "dateFormat" TEXT NOT NULL DEFAULT 'dd/mm/yyyy',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Baghdad',
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "loginAlerts" BOOLEAN NOT NULL DEFAULT true,
    "sessionTimeout" INTEGER NOT NULL DEFAULT 30,
    "allowMultipleSessions" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "public"."messages"("senderId");

-- CreateIndex
CREATE INDEX "messages_receiverId_idx" ON "public"."messages"("receiverId");

-- CreateIndex
CREATE INDEX "messages_businessId_idx" ON "public"."messages"("businessId");

-- CreateIndex
CREATE INDEX "messages_type_idx" ON "public"."messages"("type");

-- CreateIndex
CREATE INDEX "messages_status_idx" ON "public"."messages"("status");

-- CreateIndex
CREATE INDEX "messages_priority_idx" ON "public"."messages"("priority");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "public"."messages"("createdAt");

-- CreateIndex
CREATE INDEX "messages_receiverId_status_idx" ON "public"."messages"("receiverId", "status");

-- CreateIndex
CREATE INDEX "messages_receiverId_createdAt_idx" ON "public"."messages"("receiverId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "messages_senderId_createdAt_idx" ON "public"."messages"("senderId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "public"."user_settings"("userId");

-- CreateIndex
CREATE INDEX "user_settings_userId_idx" ON "public"."user_settings"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "public"."activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_adminId_idx" ON "public"."activity_logs"("adminId");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "public"."activity_logs"("action");

-- CreateIndex
CREATE INDEX "activity_logs_entityType_idx" ON "public"."activity_logs"("entityType");

-- CreateIndex
CREATE INDEX "activity_logs_entityId_idx" ON "public"."activity_logs"("entityId");

-- CreateIndex
CREATE INDEX "activity_logs_timestamp_idx" ON "public"."activity_logs"("timestamp");

-- CreateIndex
CREATE INDEX "businesses_verifiedBy_idx" ON "public"."businesses"("verifiedBy");

-- CreateIndex
CREATE INDEX "businesses_verificationDate_idx" ON "public"."businesses"("verificationDate");

-- CreateIndex
CREATE INDEX "businesses_price_idx" ON "public"."businesses"("price");

-- CreateIndex
CREATE INDEX "businesses_established_idx" ON "public"."businesses"("established");

-- CreateIndex
CREATE INDEX "businesses_employees_idx" ON "public"."businesses"("employees");

-- CreateIndex
CREATE INDEX "businesses_monthlyRevenue_idx" ON "public"."businesses"("monthlyRevenue");

-- CreateIndex
CREATE INDEX "businesses_tags_idx" ON "public"."businesses"("tags");

-- CreateIndex
CREATE INDEX "businesses_status_verificationDate_idx" ON "public"."businesses"("status", "verificationDate" DESC);

-- CreateIndex
CREATE INDEX "businesses_status_price_idx" ON "public"."businesses"("status", "price");

-- CreateIndex
CREATE INDEX "businesses_city_price_idx" ON "public"."businesses"("city", "price");

-- CreateIndex
CREATE INDEX "businesses_category_price_idx" ON "public"."businesses"("category", "price");

-- CreateIndex
CREATE INDEX "businesses_status_city_category_idx" ON "public"."businesses"("status", "city", "category");

-- CreateIndex
CREATE INDEX "businesses_status_city_price_idx" ON "public"."businesses"("status", "city", "price");

-- CreateIndex
CREATE INDEX "businesses_status_category_price_idx" ON "public"."businesses"("status", "category", "price");

-- CreateIndex
CREATE INDEX "businesses_city_category_price_status_idx" ON "public"."businesses"("city", "category", "price", "status");

-- CreateIndex
CREATE INDEX "investment_requests_reviewedBy_idx" ON "public"."investment_requests"("reviewedBy");

-- CreateIndex
CREATE INDEX "investment_requests_reviewDate_idx" ON "public"."investment_requests"("reviewDate");

-- CreateIndex
CREATE INDEX "investment_requests_reviewedBy_reviewDate_idx" ON "public"."investment_requests"("reviewedBy", "reviewDate" DESC);

-- CreateIndex
CREATE INDEX "users_adminRole_idx" ON "public"."users"("adminRole");

-- CreateIndex
CREATE INDEX "users_role_adminRole_idx" ON "public"."users"("role", "adminRole");

-- AddForeignKey
ALTER TABLE "public"."businesses" ADD CONSTRAINT "businesses_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."investment_requests" ADD CONSTRAINT "investment_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_logs" ADD CONSTRAINT "activity_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
