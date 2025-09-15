import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function applySearchIndexes() {
  try {
    console.log('🚀 Starting database search index optimization...\n');

    // Read the SQL file
    const sqlPath = join(__dirname, '../prisma/search-indexes.sql');
    const sqlContent = readFileSync(sqlPath, 'utf8');

    // Split SQL commands by semicolon and filter out empty lines and comments
    const sqlCommands = sqlContent
      .split(';')
      .map((cmd) => cmd.trim())
      .filter((cmd) => cmd && !cmd.startsWith('--') && !cmd.startsWith('/*'));

    console.log(`📝 Found ${sqlCommands.length} SQL commands to execute\n`);

    // Execute each SQL command
    for (const [index, command] of sqlCommands.entries()) {
      if (!command || command.length < 10) continue; // Skip very short commands

      try {
        console.log(
          `⏳ Executing command ${index + 1}/${sqlCommands.length}...`,
        );
        console.log(
          `   Command: ${command.substring(0, 80)}${command.length > 80 ? '...' : ''}`,
        );

        await prisma.$executeRawUnsafe(command);
        console.log(`✅ Command ${index + 1} executed successfully\n`);
      } catch (error: any) {
        console.log(`⚠️  Command ${index + 1} failed: ${error.message}`);

        // Continue with other commands even if one fails
        if (!error.message.includes('already exists')) {
          console.log(`   SQL: ${command.substring(0, 200)}\n`);
        } else {
          console.log(`   (Index already exists - continuing...)\n`);
        }
      }
    }

    // Verify indexes were created
    console.log('🔍 Verifying created indexes...\n');
    const indexes = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'businesses' 
        AND indexname LIKE 'idx_businesses_%'
      ORDER BY indexname;
    `;

    console.log('📊 Search indexes created:');
    console.table(indexes);

    // Test a sample search query
    console.log('\n🧪 Testing search functionality...');
    const testResults = await prisma.$queryRaw`
      SELECT 
        id,
        title,
        city,
        ts_rank(to_tsvector('english', title || ' ' || description), plainto_tsquery('english', 'business')) as relevance_score
      FROM businesses 
      WHERE to_tsvector('english', title || ' ' || description) @@ plainto_tsquery('english', 'business')
      ORDER BY relevance_score DESC
      LIMIT 5;
    `;

    console.log('✅ Sample search results:');
    console.table(testResults);

    console.log('\n🎉 Database search optimization completed successfully!');
    console.log(
      '📈 Full-text search indexes are now active and ready for use.',
    );
  } catch (error) {
    console.error('❌ Error applying search indexes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
applySearchIndexes();
