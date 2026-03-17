const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all active car avatars
router.get('/avatars', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM car_avatars WHERE is_active = TRUE ORDER BY brand, model_name');
        res.json(rows);
    } catch (err) {
        console.error("Error fetching avatars:", err.message);
        res.status(500).json({ error: "Could not load cars" });
    }
});

module.exports = router;