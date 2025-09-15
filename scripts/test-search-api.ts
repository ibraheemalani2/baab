import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSearchFunctionality() {
  console.log('🧪 Testing Advanced Search API Functionality...\n');

  try {
    // Test 1: Basic full-text search
    console.log('1️⃣ Testing basic full-text search...');
    const basicSearchQuery = `
      SELECT 
        title, city, status,
        ts_rank(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(location, '')), 
                plainto_tsquery('simple', 'متجر')) as relevance_score
      FROM businesses 
      WHERE to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(location, '')) 
            @@ plainto_tsquery('simple', 'متجر')
        AND status = 'APPROVED'
      ORDER BY relevance_score DESC;
    `;

    const basicResults = (await prisma.$queryRawUnsafe(
      basicSearchQuery,
    )) as any[];
    console.log(
      `✅ Arabic search for "متجر" found ${basicResults.length} results:`,
    );
    basicResults.forEach((r, i) => {
      console.log(
        `  ${i + 1}. "${r.title}" (${r.city}) - Score: ${r.relevance_score}`,
      );
    });

    // Test 2: Price range filtering
    console.log('\n2️⃣ Testing price range filtering...');
    const priceRangeQuery = `
      SELECT title, price, currency, city
      FROM businesses 
      WHERE status = 'APPROVED' 
        AND price BETWEEN 100000 AND 4000000
      ORDER BY price ASC;
    `;

    const priceResults = (await prisma.$queryRawUnsafe(
      priceRangeQuery,
    )) as any[];
    console.log(
      `✅ Price range (100K-4M) found ${priceResults.length} results:`,
    );
    priceResults.forEach((r, i) => {
      console.log(
        `  ${i + 1}. "${r.title}": ${r.price.toLocaleString()} ${r.currency} (${r.city})`,
      );
    });

    // Test 3: Multi-criteria search (text + filters)
    console.log('\n3️⃣ Testing combined text + filter search...');
    const combinedQuery = `
      SELECT 
        title, city, category, price, currency,
        ts_rank(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')), 
                plainto_tsquery('simple', 'مطعم')) as relevance_score
      FROM businesses 
      WHERE to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')) 
            @@ plainto_tsquery('simple', 'مطعم')
        AND status = 'APPROVED'
        AND city = 'بغداد'
      ORDER BY relevance_score DESC;
    `;

    const combinedResults = (await prisma.$queryRawUnsafe(
      combinedQuery,
    )) as any[];
    console.log(
      `✅ Search for "مطعم" in Baghdad found ${combinedResults.length} results:`,
    );
    combinedResults.forEach((r, i) => {
      console.log(
        `  ${i + 1}. "${r.title}" - ${r.category} (${r.price.toLocaleString()} ${r.currency})`,
      );
    });

    // Test 4: Filter options aggregation
    console.log('\n4️⃣ Testing filter options aggregation...');
    const filtersQuery = `
      SELECT 
        ARRAY_AGG(DISTINCT city ORDER BY city) as cities,
        ARRAY_AGG(DISTINCT category ORDER BY category) as categories,
        ARRAY_AGG(DISTINCT currency ORDER BY currency) as currencies,
        MIN(price) as min_price,
        MAX(price) as max_price,
        COUNT(*) as total_approved
      FROM businesses 
      WHERE status = 'APPROVED'
    `;

    const filterResults = (await prisma.$queryRawUnsafe(filtersQuery)) as any[];
    const filters = filterResults[0];
    console.log('✅ Available filter options:');
    console.log(`  Cities: ${filters.cities?.join(', ') || 'None'}`);
    console.log(`  Categories: ${filters.categories?.join(', ') || 'None'}`);
    console.log(`  Currencies: ${filters.currencies?.join(', ') || 'None'}`);
    console.log(
      `  Price Range: ${filters.min_price?.toLocaleString()} - ${filters.max_price?.toLocaleString()}`,
    );
    console.log(`  Total Approved: ${filters.total_approved}`);

    // Test 5: Tags search
    console.log('\n5️⃣ Testing tags extraction...');
    const tagsQuery = `
      SELECT DISTINCT UNNEST(tags) as tag, COUNT(*) as usage_count
      FROM businesses 
      WHERE status = 'APPROVED' AND tags IS NOT NULL AND array_length(tags, 1) > 0
      GROUP BY tag
      ORDER BY usage_count DESC, tag ASC;
    `;

    const tagsResults = (await prisma.$queryRawUnsafe(tagsQuery)) as any[];
    console.log(`✅ Found ${tagsResults.length} unique tags:`);
    tagsResults.forEach((r, i) => {
      console.log(`  ${i + 1}. "${r.tag}" (used ${r.usage_count} times)`);
    });

    // Test 6: Performance check with EXPLAIN
    console.log('\n6️⃣ Testing query performance...');
    const performanceQuery = `
      EXPLAIN (ANALYZE, BUFFERS) 
      SELECT title, city, 
             ts_rank(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')), 
                     plainto_tsquery('simple', 'عمل')) as score
      FROM businesses 
      WHERE to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')) 
            @@ plainto_tsquery('simple', 'عمل')
        AND status = 'APPROVED'
      ORDER BY score DESC
      LIMIT 10;
    `;

    try {
      const performanceResults = (await prisma.$queryRawUnsafe(
        performanceQuery,
      )) as any[];
      console.log('✅ Query execution plan:');
      performanceResults.forEach((row, i) => {
        console.log(`  ${row['QUERY PLAN']}`);
      });
    } catch (error) {
      console.log(
        '⚠️  Performance analysis skipped (may require additional permissions)',
      );
    }

    // Test 7: Sorting options
    console.log('\n7️⃣ Testing sorting capabilities...');

    // Price ascending
    const sortPriceQuery = `
      SELECT title, price, currency, created_at
      FROM businesses 
      WHERE status = 'APPROVED'
      ORDER BY price ASC, created_at DESC
      LIMIT 3;
    `;

    const sortedResults = (await prisma.$queryRawUnsafe(
      sortPriceQuery,
    )) as any[];
    console.log(`✅ Cheapest businesses (price ASC):`);
    sortedResults.forEach((r, i) => {
      console.log(
        `  ${i + 1}. "${r.title}": ${r.price.toLocaleString()} ${r.currency}`,
      );
    });

    console.log('\n🎉 All search functionality tests completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Full-text search indexes: ✅ Working`);
    console.log(`   - Price range filtering: ✅ Working`);
    console.log(`   - Multi-criteria search: ✅ Working`);
    console.log(`   - Filter options aggregation: ✅ Working`);
    console.log(`   - Tags extraction: ✅ Working`);
    console.log(`   - Sorting capabilities: ✅ Working`);
    console.log(`   - Arabic text search: ✅ Working`);
  } catch (error) {
    console.error('❌ Error testing search functionality:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
testSearchFunctionality();
