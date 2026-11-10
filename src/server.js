'use strict';

const http = require('http');
const { sequelize } = require('../models');
const app = require('./app');

const configuredPort = process.env.PORT;
const port = configuredPort === undefined ? 3000 : Number(configuredPort);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

async function startServer() {
  await sequelize.authenticate();

  const server = http.createServer(app);

  await new Promise((resolve, reject) => {
    const onListening = () => {
      server.removeListener('error', onError);
      resolve();
    };
    const onError = error => {
      server.removeListener('listening', onListening);
      reject(error);
    };

    server.once('listening', onListening);
    server.once('error', onError);
    server.listen(port);
  });

  return server;
}

async function shutdownServer(server) {
  let closeError;

  if (server.listening) {
    await new Promise(resolve => {
      server.close(error => {
        closeError = error;
        resolve();
      });
    });
  }

  try {
    await sequelize.close();
  } catch (error) {
    if (!closeError) {
      closeError = error;
    }
  }

  if (closeError) {
    throw closeError;
  }
}

function logSafeError(message, error) {
  console.error(message, error.code || error.name || 'UNKNOWN');
}

function registerShutdownHandlers(server) {
  let shutdownPromise;
  const shutdown = signal => {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    console.log(`${signal} received; closing server.`);
    shutdownPromise = shutdownServer(server)
      .then(() => console.log('Server and Sequelize connection closed.'))
      .catch(error => {
        logSafeError('Error while shutting down:', error);
        process.exitCode = 1;
      });

    return shutdownPromise;
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  server.on('error', error => {
    logSafeError('HTTP server error:', error);
    process.exitCode = 1;
    shutdown('server error');
  });

  return shutdown;
}

async function main() {
  let server;

  try {
    server = await startServer();
    console.log('MySQL connection verified.');
    console.log(`Express server listening on port ${server.address().port}.`);
    registerShutdownHandlers(server);
  } catch (error) {
    logSafeError('Server startup failed:', error);
    try {
      await sequelize.close();
    } catch (closeError) {
      logSafeError('Database connection close failed:', closeError);
    }
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  startServer,
  shutdownServer,
  registerShutdownHandlers
};
