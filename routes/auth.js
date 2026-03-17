const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// REGISTER
router.post('/register', async (req, res) => {
    const { username, email, password, real_name } = req.body;

    res.status(500).json({ error: "registration not availbale" });
    return;


    try {
        // Check if user exists (using citext for case-insensitive email/username)
        const userCheck = await db.query(
            'SELECT id FROM users WHERE email = $1 OR user_name = $2', 
            [email, username]
        );
        
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: "Username or Email already taken" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert using your specific columns
        const newUser = await db.query(
            `INSERT INTO users (user_name, email, password_hash, real_name) 
             VALUES ($1, $2, $3, $4) RETURNING id, user_name`,
            [username, email, hashedPassword, real_name || null]
        );

        res.status(201).json({ 
            message: "Driver registered! 🏁", 
            userId: newUser.rows[0].id 
        });
    } catch (err) {
        res.status(500).json({ error: "Server error during registration" });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await db.query(
            'SELECT * FROM users WHERE email = $1 OR user_name = $1', 
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const racerCheck = await db.query(
            'SELECT user_id FROM racer_stats WHERE user_id = $1', 
            [user.id]
        );

        if (racerCheck.rows.length === 0) {
            await db.query(
                `INSERT INTO racer_stats (user_id, racer_name, license_plate, fav_car, fav_avatar) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    user.id, 
                    user.user_name,
                    'NEW-DRV', 
                    'Starter Car', 
                    '🏎️'
                ]
            );
            console.log(`Created new racer profile for existing user: ${user.user_name}`);
        }

        await db.query('UPDATE users SET last_online = NOW() WHERE id = $1', [user.id]);

        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '9999h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.user_name,
                role: user.role
            }
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "Server error during login" });
    }
});

module.exports = router;