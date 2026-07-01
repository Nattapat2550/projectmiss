require('dotenv').config({ path: './backend/.env' });
const pool = require('./backend/config/db');

async function dumpSchema() {
    try {
        const missing = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'missing_persons';");
        console.log('missing_persons:', missing.rows);
        
        const cases = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cases';");
        console.log('cases:', cases.rows);

        const informants = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'informants';");
        console.log('informants:', informants.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
dumpSchema();
