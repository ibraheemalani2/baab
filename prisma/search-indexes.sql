-- ========================================
-- BAAB Platform: Full-Text Search Indexes
-- Custom indexes for comprehensive search functionality
-- ========================================

-- Drop existing indexes if they exist (for re-running)
DROP INDEX IF EXISTS idx_businesses_title_search;
DROP INDEX IF EXISTS idx_businesses_description_search;
DROP INDEX IF EXISTS idx_businesses_combined_search;
DROP INDEX IF EXISTS idx_businesses_tags_gin;
DROP INDEX IF EXISTS idx_businesses_location_search;

-- ========================================
-- Full-Text Search Indexes (GIN)
-- ========================================

-- Title field full-text search (English optimized)
CREATE INDEX idx_businesses_title_search 
ON businesses USING gin(to_tsvector('english', coalesce(title, '')));

-- Description field full-text search (English optimized) 
CREATE INDEX idx_businesses_description_search
ON businesses USING gin(to_tsvector('english', coalesce(description, '')));

-- Location field full-text search
CREATE INDEX idx_businesses_location_search
ON businesses USING gin(to_tsvector('english', coalesce(location, '')));

-- Combined title + description + location search (most common search pattern)
CREATE INDEX idx_businesses_combined_search
ON businesses USING gin(
    to_tsvector('english', 
        coalesce(title, '') || ' ' || 
        coalesce(description, '') || ' ' || 
        coalesce(location, '')
    )
);

-- ========================================
-- Tags Array Search Index (GIN)  
-- ========================================

-- Tags array search (GIN index for array operations)
CREATE INDEX idx_businesses_tags_gin
ON businesses USING gin(tags);

-- ========================================
-- Additional Composite Indexes for Search Performance
-- ========================================

-- Price range + status for efficient filtering
CREATE INDEX idx_businesses_price_range_status 
ON businesses (status, price) WHERE status = 'APPROVED';

-- Revenue range + status for investor search
CREATE INDEX idx_businesses_revenue_range_status
ON businesses (status, "monthlyRevenue") WHERE status = 'APPROVED' AND "monthlyRevenue" IS NOT NULL;

-- Employee count + category for company size search
CREATE INDEX idx_businesses_employees_category
ON businesses (category, employees) WHERE employees IS NOT NULL;

-- Location-based search optimization
CREATE INDEX idx_businesses_city_location_search
ON businesses (city, location) WHERE status = 'APPROVED';

-- ========================================
-- Search Performance Optimization
-- ========================================

-- Create a function for weighted search ranking
CREATE OR REPLACE FUNCTION get_business_search_rank(
    business_title text,
    business_description text,
    business_location text,
    search_query text
) RETURNS float AS $$
BEGIN
    RETURN (
        -- Title gets highest weight (1.0)
        COALESCE(ts_rank(to_tsvector('english', business_title), plainto_tsquery('english', search_query)), 0) * 1.0 +
        -- Description gets medium weight (0.6) 
        COALESCE(ts_rank(to_tsvector('english', business_description), plainto_tsquery('english', search_query)), 0) * 0.6 +
        -- Location gets lower weight (0.3)
        COALESCE(ts_rank(to_tsvector('english', business_location), plainto_tsquery('english', search_query)), 0) * 0.3
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ========================================
-- Index Statistics and Performance
-- ========================================

-- Analyze tables to update statistics for optimal query planning
ANALYZE businesses;

-- Display created indexes for verification
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'businesses' 
    AND indexname LIKE 'idx_businesses_%'
ORDER BY indexname;

-- ========================================
-- Usage Examples (for testing)
-- ========================================

/*
-- Example full-text search queries:

-- 1. Simple title search
SELECT * FROM businesses 
WHERE to_tsvector('english', title) @@ plainto_tsquery('english', 'restaurant food');

-- 2. Combined search with ranking
SELECT *, get_business_search_rank(title, description, location, 'restaurant') as rank
FROM businesses 
WHERE to_tsvector('english', title || ' ' || description || ' ' || location) 
      @@ plainto_tsquery('english', 'restaurant')
ORDER BY rank DESC;

-- 3. Multi-criteria search with filters
SELECT * FROM businesses 
WHERE to_tsvector('english', title || ' ' || description) @@ plainto_tsquery('english', 'tech startup')
  AND status = 'APPROVED'
  AND city = 'Baghdad'
  AND price BETWEEN 100000 AND 500000
ORDER BY get_business_search_rank(title, description, location, 'tech startup') DESC;

-- 4. Tags array search
SELECT * FROM businesses 
WHERE tags @> ARRAY['technology', 'startup']
  AND status = 'APPROVED';

-- 5. Price range with location
SELECT * FROM businesses
WHERE status = 'APPROVED'
  AND city = 'Baghdad'
  AND price BETWEEN 50000 AND 200000
ORDER BY price ASC;
*/
