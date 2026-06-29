require('dotenv').config();
const pool = require('./config/db');

async function createIndexes() {
    try {
        console.log("Creating database indexes for performance...");
        
        // 1. Indexes on Foreign Keys (JOIN columns)
        await pool.query("CREATE INDEX IF NOT EXISTS idx_cases_missing_person_id ON cases(missing_person_id);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_cases_informant_id ON cases(informant_id);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_cases_agency_id ON cases(agency_id);");

        // 2. Indexes for sorting columns (frequently used in dashboard and table)
        await pool.query("CREATE INDEX IF NOT EXISTS idx_missing_persons_age ON missing_persons(age);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_missing_persons_gender ON missing_persons(gender);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_missing_persons_nationality ON missing_persons(nationality);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_cases_missing_date ON cases(missing_date);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_cases_reported_date ON cases(reported_date);");
        
        // 3. Trigram indexes for ILIKE searches (if pg_trgm is available, else standard index)
        try {
            await pool.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
            await pool.query("CREATE INDEX IF NOT EXISTS idx_missing_fname_th_trgm ON missing_persons USING gin (first_name_th gin_trgm_ops);");
            await pool.query("CREATE INDEX IF NOT EXISTS idx_missing_lname_th_trgm ON missing_persons USING gin (last_name_th gin_trgm_ops);");
            await pool.query("CREATE INDEX IF NOT EXISTS idx_missing_id_card_trgm ON missing_persons USING gin (missing_id_card_passport gin_trgm_ops);");
            console.log("Trigram indexes created successfully.");
        } catch (trgmErr) {
            console.log("pg_trgm extension not available, skipping trigram indexes.");
        }
        
        console.log("All indexes created successfully.");
    } catch (error) {
        console.error("Error creating indexes:", error);
    } finally {
        pool.end();
    }
}

createIndexes();
