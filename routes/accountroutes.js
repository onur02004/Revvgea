const express = require('express');
const router = express.Router();
const db = require('../db'); 
const verifyToken = require('../authMiddleware'); // Located in the root per your image

// GET /api/account/basic-me
router.get('/basic-me', verifyToken, async (req, res) => {
    // req.user.id is provided by verifyToken
    const userId = req.user.id; 

    const sql = `
        SELECT 
            u.id AS user_id, 
            u.user_name, 
            u.profile_pic_path, 
            r.racer_name, 
            r.license_plate, 
            r.fav_car, 
            r.fav_avatar
        FROM users u
        INNER JOIN racer_stats r ON u.id = r.user_id
        WHERE u.id = $1;
    `;

    try {
        const { rows } = await db.query(sql, [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ 
                error: "Racer profile not found. Please initialize your racer data." 
            });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error("Database Error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post('/update-ride', verifyToken, async (req, res) => {
    const { fav_car, fav_avatar } = req.body;
    const userId = req.user.id;

    try {
        await db.query(
            'UPDATE racer_stats SET fav_car = $1, fav_avatar = $2 WHERE user_id = $3',
            [fav_car, fav_avatar, userId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/account/update-plate
router.put('/update-plate', verifyToken, async (req, res) => {
    const { license_plate } = req.body;
    const userId = req.user.id; // From verifyToken middleware
    

    if (!license_plate || license_plate.length > 10) {
        return res.status(400).json({ error: "Invalid plate format" });
    }

    try {
        const sql = 'UPDATE racer_stats SET license_plate = $1 WHERE user_id = $2 RETURNING *';
        const { rows } = await db.query(sql, [license_plate, userId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: "Racer profile not found" });
        }

        res.json({ success: true, plate: rows[0].license_plate });
    } catch (err) {
        console.error("Database Error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;