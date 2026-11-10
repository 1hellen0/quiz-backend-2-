'use strict';

const Sequelize = require('sequelize');
const process = require('process');
const env = process.env.NODE_ENV || 'development';
const config = require('../config/config')[env];
const sequelize = new Sequelize(config.database, config.username, config.password, config);

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log(
      `MySQL connection successful (${config.database} at ${config.host}:${config.port}).`
    );
  } catch (error) {
    const cause = error.original || error.parent || error;
    console.error(`MySQL connection failed (${cause.code || cause.name || 'unknown error'}).`);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

testConnection().catch(error => {
  console.error(`MySQL connection test failed (${error.code || error.name || 'unknown error'}).`);
  process.exitCode = 1;
});
