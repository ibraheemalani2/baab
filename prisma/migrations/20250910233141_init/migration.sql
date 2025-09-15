-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."VerificationTokenType" AS ENUM ('EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "public"."BusinessStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SOLD', 'FUNDED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."Currency" AS ENUM ('USD', 'IQD');

-- CreateEnum
CREATE TYPE "public"."RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."InvestorType" AS ENUM ('INDIVIDUAL', 'COMPANY', 'FUND');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('INVESTMENT_REQUEST', 'BUSINESS_APPROVED', 'BUSINESS_REJECTED', 'DEAL_COMPLETED', 'PROFILE_VERIFICATION', 'SYSTEM_MAINTENANCE', 'NEW_MESSAGE', 'PAYMENT_RECEIVED', 'DOCUMENT_SIGNED');

-- CreateEnum
CREATE TYPE "public"."NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "phoneVerificationCode" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "image" TEXT,
    "city" TEXT,
    "businessType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "public"."VerificationTokenType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."businesses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" "public"."Currency" NOT NULL DEFAULT 'USD',
    "city" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "images" TEXT[],
    "location" TEXT NOT NULL,
    "established" INTEGER,
    "employees" INTEGER,
    "monthlyRevenue" INTEGER,
    "tags" TEXT[],
    "status" "public"."BusinessStatus" NOT NULL DEFAULT 'PENDING',
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."investment_requests" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "businessOwnerId" TEXT NOT NULL,
    "requestedAmount" INTEGER NOT NULL,
    "offeredAmount" INTEGER NOT NULL,
    "currency" "public"."Currency" NOT NULL DEFAULT 'USD',
    "message" TEXT,
    "investorType" "public"."InvestorType" NOT NULL DEFAULT 'INDIVIDUAL',
    "previousInvestments" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."RequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvalDate" TIMESTAMP(3),
    "rejectionDate" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "priority" "public"."NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "actionUrl" TEXT,
    "metadata" JSONB,
    "businessId" TEXT,
    "investmentRequestId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "public"."users"("phone");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "public"."users"("phone");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "public"."users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "public"."verification_tokens"("token");

-- CreateIndex
CREATE INDEX "verification_tokens_token_idx" ON "public"."verification_tokens"("token");

-- CreateIndex
CREATE INDEX "verification_tokens_userId_idx" ON "public"."verification_tokens"("userId");

-- CreateIndex
CREATE INDEX "verification_tokens_expiresAt_idx" ON "public"."verification_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "businesses_ownerId_idx" ON "public"."businesses"("ownerId");

-- CreateIndex
CREATE INDEX "businesses_status_idx" ON "public"."businesses"("status");

-- CreateIndex
CREATE INDEX "businesses_city_idx" ON "public"."businesses"("city");

-- CreateIndex
CREATE INDEX "businesses_category_idx" ON "public"."businesses"("category");

-- CreateIndex
CREATE INDEX "businesses_createdAt_idx" ON "public"."businesses"("createdAt");

-- CreateIndex
CREATE INDEX "investment_requests_businessId_idx" ON "public"."investment_requests"("businessId");

-- CreateIndex
CREATE INDEX "investment_requests_investorId_idx" ON "public"."investment_requests"("investorId");

-- CreateIndex
CREATE INDEX "investment_requests_businessOwnerId_idx" ON "public"."investment_requests"("businessOwnerId");

-- CreateIndex
CREATE INDEX "investment_requests_status_idx" ON "public"."investment_requests"("status");

-- CreateIndex
CREATE INDEX "investment_requests_requestDate_idx" ON "public"."investment_requests"("requestDate");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "public"."notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "public"."notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "public"."notifications"("read");

-- CreateIndex
CREATE INDEX "notifications_priority_idx" ON "public"."notifications"("priority");

-- CreateIndex
CREATE INDEX "notifications_timestamp_idx" ON "public"."notifications"("timestamp");

-- AddForeignKey
ALTER TABLE "public"."verification_tokens" ADD CONSTRAINT "verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."businesses" ADD CONSTRAINT "businesses_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."investment_requests" ADD CONSTRAINT "investment_requests_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."investment_requests" ADD CONSTRAINT "investment_requests_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."investment_requests" ADD CONSTRAINT "investment_requests_businessOwnerId_fkey" FOREIGN KEY ("businessOwnerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
