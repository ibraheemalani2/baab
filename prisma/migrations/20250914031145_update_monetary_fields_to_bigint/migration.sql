-- AlterTable
ALTER TABLE "public"."businesses" ALTER COLUMN "price" SET DATA TYPE BIGINT,
ALTER COLUMN "monthlyRevenue" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "public"."investment_requests" ALTER COLUMN "requestedAmount" SET DATA TYPE BIGINT,
ALTER COLUMN "offeredAmount" SET DATA TYPE BIGINT;
