const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/dbConnection');
const { resetJwtSecret } = require('../middleware/authMiddleware'); // Import the function

const router = express.Router();
const JWT_SECRET = 'ed38a16256fd69b7f7d46e62cea8797dc9539afdb0fed73a89ce8a93352e81bac160a96dcb08a20f514d2dce8b82a96720711c87e9075808eb4def39534e207c'; // Replace with an environment variable in production


// Register a new user
router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
        db.query(query, [username, hashedPassword], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'Username already exists.' });
                }
                console.error('Error inserting user:', err.message);
                return res.status(500).json({ error: 'Failed to register user.' });
            }
            res.status(201).json({ message: 'User registered successfully!' });
        });
    } catch (err) {
        console.error('Error hashing password:', err.message);
        res.status(500).json({ error: 'Failed to register user.' });
    }
});

// Login an existing user
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], async (err, results) => {
        if (err) {
            console.error('Error querying user:', err.message);
            return res.status(500).json({ error: 'Failed to login.' });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        console.log('Generated Token:', token); // Log the generated token
        res.json({ message: 'Login successful!', token });
    });
});

module.exports = router;
