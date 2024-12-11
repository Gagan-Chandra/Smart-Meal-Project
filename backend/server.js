const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const { createClient } = require('redis');
const amqp = require('amqplib');

const app = express();

// CORS Middleware
app.use((req, res, next) => {
    const allowedOrigins = ['http://34.55.208.133'];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200); // Handle preflight requests
    }
    next();
});

// JSON Middleware
app.use(express.json());

// Redis Initialization
const initializeRedis = async () => {
    try {
        const redisClient = createClient({
            url: process.env.REDIS_URL || 'redis://redis-service:6379',
        });
        redisClient.on('error', (err) => console.error('Redis Client Error:', err));
        await redisClient.connect();
        app.locals.redis = redisClient;
        console.log('Redis connected successfully.');
    } catch (err) {
        console.error('Failed to connect to Redis:', err.message);
        process.exit(1);
    }
};

// RabbitMQ Initialization
const initializeRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq-service');
        const rabbitMqChannel = await connection.createChannel();
        await rabbitMqChannel.assertQueue('imageQueue');
        app.locals.rabbitMqChannel = rabbitMqChannel;
        console.log('RabbitMQ connected and queue initialized.');
    } catch (err) {
        console.error('Error connecting to RabbitMQ:', err.message);
        process.exit(1);
    }
};

// Initialize Services
(async () => {
    await initializeRedis();
    await initializeRabbitMQ();
})();

// Routes
app.use('/api', authRoutes);
app.use('/api', recipeRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend is running' });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('Global Error Handler:', err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
