require('dotenv').config({ path: './config/config.env' });
const pool = require('./config/db');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log("Migrating human_trafficking_indicators and operation_result to BOOLEAN with default FALSE...");

        // Update human_trafficking_indicators
        await client.query(`
            ALTER TABLE cases 
            ALTER COLUMN human_trafficking_indicators TYPE BOOLEAN 
            USING (human_trafficking_indicators = 'มี' OR human_trafficking_indicators ILIKE 'true');
        `);

        // Update operation_result
        await client.query(`
            ALTER TABLE cases 
            ALTER COLUMN operation_result TYPE BOOLEAN 
            USING (operation_result ILIKE '%พบตัว%' AND operation_result NOT ILIKE '%ไม่พบตัว%');
        `);

        // Set default values to false
        await client.query(`
            ALTER TABLE cases 
            ALTER COLUMN human_trafficking_indicators SET DEFAULT false;
        `);

        await client.query(`
            ALTER TABLE cases 
            ALTER COLUMN operation_result SET DEFAULT false;
        `);

        // Update existing NULLs to false if needed (optional, but good for defaults)
        await client.query(`UPDATE cases SET human_trafficking_indicators = false WHERE human_trafficking_indicators IS NULL;`);
        await client.query(`UPDATE cases SET operation_result = false WHERE operation_result IS NULL;`);

        await client.query('COMMIT');
        console.log("Migration successful!");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Migration failed:", e);
    } finally {
        client.release();
        pool.end();
    }
}
migrate();
