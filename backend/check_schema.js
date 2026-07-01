require('dotenv').config({ path: './config/config.env' });
const pool = require('./config/db');
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cases'")
  .then(res => console.log(res.rows))
  .catch(console.error)
  .finally(() => pool.end());
