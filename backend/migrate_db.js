require('dotenv').config({ path: './config/config.env' });
const pool = require('./config/db');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Migrate missing_persons
        console.log("Migrating missing_persons...");
        await client.query('ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS date_of_birth DATE;');
        
        const resMissing = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'missing_persons' AND column_name = 'age';
        `);
        if (resMissing.rows.length > 0) {
            await client.query("UPDATE missing_persons SET date_of_birth = MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int - age, 1, 1) WHERE age IS NOT NULL AND date_of_birth IS NULL;");
            await client.query('ALTER TABLE missing_persons DROP COLUMN age;');
        }
        
        // Migrate informants
        console.log("Migrating informants...");
        await client.query('ALTER TABLE informants ADD COLUMN IF NOT EXISTS date_of_birth DATE;');
        
        const resInformants = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'informants' AND column_name = 'age';
        `);
        if (resInformants.rows.length > 0) {
            await client.query("UPDATE informants SET date_of_birth = MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int - age, 1, 1) WHERE age IS NOT NULL AND date_of_birth IS NULL;");
            await client.query('ALTER TABLE informants DROP COLUMN age;');
        }

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
