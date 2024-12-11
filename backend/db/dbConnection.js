const mysql = require('mysql2');
require('dotenv').config(); // Ensure you have dotenv configured to load environment variables

// Create a connection pool
const pool = mysql.createPool({
    connectionLimit: 20, // Maximum number of connections in the pool
    host: process.env.DB_HOST || 'localhost', // Use environment variable or fallback to 'localhost'
    user: process.env.DB_USER || 'root', // Use environment variable or fallback to 'root'
    password: process.env.DB_PASSWORD || '', // Use environment variable or fallback to an empty password
    database: process.env.DB_NAME || 'meal_planner', // Use environment variable or fallback to an empty database name
    waitForConnections: true, // Wait for connections instead of throwing an error when the pool is full
    queueLimit: 0, // No limit on the number of queued connection requests
    connectTimeout: 30000,       // Connection timeout: 30 seconds
    acquireTimeout: 60000,       // Time to wait for connection: 60 seconds
    timeout: 28800000            // Idle timeout: 8 hours
});

// Log successful connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
        process.exit(1); // Exit the process with failure if the connection fails
    }
    console.log('Connected to the MySQL database using connection pool.');
    connection.release(); // Release the connection back to the pool
});

// Handle pool errors
pool.on('error', (err) => {
    console.error('Unexpected MySQL pool error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.error('Database connection lost. Reconnecting...');
    }
});

// Keep connection alive by sending periodic queries
setInterval(() => {
    pool.query('SELECT 1', (err) => {
        if (err) {
            console.error('Database keep-alive query failed:', err.message);
        } else {
            console.log('Database keep-alive query successful.');
        }
    });
}, 30000); // Run every 30 seconds

// Export the pool as db for consistency
const db = pool;
module.exports = db;
