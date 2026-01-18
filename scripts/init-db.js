/**
 * Database Initialization Script
 * Run with: npm run db:init
 */

require('dotenv').config();
const { initializeSchema, close } = require('../components/database');

async function main() {
  console.log('Initializing database schema...');

  try {
    await initializeSchema();
    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  } finally {
    await close();
  }
}

main();
