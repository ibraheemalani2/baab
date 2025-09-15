import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applySimpleSearchIndexes() {
  try {
    console.log('🚀 Applying essential search indexes...\n');

    const indexCommands = [
      // Full-text search indexes
      {
        name: 'Title search index',
        sql: `CREATE INDEX IF NOT EXISTS idx_businesses_title_fts ON businesses USING gin(to_tsvector('english', coalesce(title, '')))`,
      },
      {
        name: 'Description search index',
        sql: `CREATE INDEX IF NOT EXISTS idx_businesses_description_fts ON businesses USING gin(to_tsvector('english', coalesce(description, '')))`,
      },
      {
        name: 'Location search index',
        sql: `CREATE INDEX IF NOT EXISTS idx_businesses_location_fts ON businesses USING gin(to_tsvector('english', coalesce(location, '')))`,
      },
      {
        name: 'Combined search index',
        sql: `CREATE INDEX IF NOT EXISTS idx_businesses_combined_fts ON businesses USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(location, '')))`,
      },
      // Tags array index
      {
        name: 'Tags array index',
        sql: `CREATE INDEX IF NOT EXISTS idx_businesses_tags_gin ON businesses USING gin(tags)`,
      },
      // Performance optimization indexes
      {
        name: 'Approved business price index',
        sql: `CREATE INDEX IF NOT EXISTS idx_businesses_approved_price ON businesses (price) WHERE status = 'APPROVED'`,
      },
      {
        name: 'Approved business revenue index',
        sql: `CREATE INDEX IF NOT EXISTS idx_businesses_approved_revenue ON businesses ("monthlyRevenue") WHERE status = 'APPROVED' AND "monthlyRevenue" IS NOT NULL`,
      },
      {
        name: 'City location composite',
        sql: `CREATE INDEX IF NOT EXISTS idx_businesses_city_location ON businesses (city, location) WHERE status = 'APPROVED'`,
      },
    ];

    console.log(`📝 Creating ${indexCommands.length} search indexes...\n`);

    // Execute each index command
    for (const [index, command] of indexCommands.entries()) {
      try {
        console.log(
          `⏳ ${index + 1}/${indexCommands.length}: Creating ${command.name}...`,
        );
        await prisma.$executeRawUnsafe(command.sql);
        console.log(`✅ ${command.name} created successfully\n`);
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log(`✅ ${command.name} already exists\n`);
        } else {
          console.error(`❌ Failed to create ${command.name}:`, error.message);
          console.error(`   SQL: ${command.sql}\n`);
        }
      }
    }

    // Verify indexes
    console.log('🔍 Verifying created indexes...\n');
    const indexes = (await prisma.$queryRaw`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'businesses' 
        AND (indexname LIKE 'idx_businesses_%' OR indexname LIKE '%fts%' OR indexname LIKE '%gin%')
      ORDER BY indexname;
    `) as any[];

    console.log(`📊 Found ${indexes.length} search-related indexes:`);
    indexes.forEach((idx, i) => {
      console.log(`${i + 1}. ${idx.indexname}`);
    });

    // Test search functionality with existing data
    console.log('\n🧪 Testing search functionality...');

    // Get count of businesses for testing
    const businessCount = await prisma.business.count();
    console.log(`📈 Found ${businessCount} businesses in database`);

    if (businessCount > 0) {
      // Test simple text search
      const searchTest = (await prisma.$queryRaw`
        SELECT 
          id,
          title,
          city,
          ts_rank(to_tsvector('english', coalesce(title, '')), plainto_tsquery('english', 'business')) as relevance
        FROM businesses 
        WHERE to_tsvector('english', coalesce(title, '')) @@ plainto_tsquery('english', 'business')
        ORDER BY relevance DESC
        LIMIT 3;
      `) as any[];

      console.log(`🔍 Sample search results (${searchTest.length} found):`);
      searchTest.forEach((result, i) => {
        console.log(
          `  ${i + 1}. "${result.title}" (${result.city}) - Score: ${result.relevance}`,
        );
      });
    } else {
      console.log(
        '📝 No businesses in database yet - search indexes ready for when data is added',
      );
    }

    // Run ANALYZE to update statistics
    console.log('\n📊 Updating table statistics...');
    await prisma.$executeRawUnsafe('ANALYZE businesses');
    console.log('✅ Statistics updated');

    console.log('\n🎉 Search index optimization completed successfully!');
    console.log('🚀 Full-text search is now ready for the BAAB platform');
  } catch (error) {
    console.error('❌ Error applying search indexes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the simplified migration
applySimpleSearchIndexes();
