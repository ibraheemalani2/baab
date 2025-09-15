#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AdminSeedService } from '../auth/seed/admin-seed.service';

async function seedAdmins() {
  const logger = new Logger('AdminSeeder');

  try {
    logger.log('Starting admin seeding process...');

    // Create a minimal application context for dependency injection
    const prismaService = new PrismaService();
    await prismaService.$connect();

    const adminSeedService = new AdminSeedService(prismaService);

    // Run the seeding
    await adminSeedService.seedAll();

    logger.log('✅ Admin seeding completed successfully');

    await prismaService.$disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Admin seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding if this script is executed directly
if (require.main === module) {
  seedAdmins();
}
