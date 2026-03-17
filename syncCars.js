const fs = require('fs');
const path = require('path');
const db = require('./db'); // Importing your existing db.js

const BASE_DIR = path.join(__dirname, 'public', 'arabalar');

async function syncDatabase() {
    try {
        console.log("Starting sync with denemdb...");

        // Ensure the table has the unique constraint before starting
        await db.query(`
            ALTER TABLE car_avatars 
            ADD CONSTRAINT unique_image_path UNIQUE (image_path);
        `).catch(() => console.log("Unique constraint already exists."));

        const brands = fs.readdirSync(BASE_DIR);

        for (const brand of brands) {
            const brandPath = path.join(BASE_DIR, brand);
            if (!fs.statSync(brandPath).isDirectory()) continue;

            const models = fs.readdirSync(brandPath);
            for (const model of models) {
                const modelPath = path.join(brandPath, model);
                if (!fs.statSync(modelPath).isDirectory()) continue;

                const variants = fs.readdirSync(modelPath);
                for (const variant of variants) {
                    const variantPath = path.join(modelPath, variant);
                    if (!fs.statSync(variantPath).isDirectory()) continue;

                    // Logic: "Sedan 2015-2022" -> Body: Sedan, Years: 2015-2022
                    // Logic: "2013-2018" -> Body: General, Years: 2013-2018
                    const parts = variant.split(' ');
                    const yearRange = parts[parts.length - 1]; 
                    const bodyType = parts.length > 1 ? parts.slice(0, -1).join(' ') : 'General';

                    const files = fs.readdirSync(variantPath);
                    const imageFile = files.find(f => f.endsWith('.webp') || f.endsWith('.png'));

                    if (imageFile) {
                        const relativeImagePath = `/arabalar/${brand}/${model}/${variant}/${imageFile}`;
                        
                        // Define tags based on folder name + custom logic
                        const tags = [bodyType];
                        if (brand === 'Togg') tags.push('Electric', 'SUV');
                        if (model.toLowerCase().includes('qashqai')) tags.push('Crossover');
                        if (bodyType.toLowerCase() === 'hatchback') tags.push('Compact');

                        const query = `
                            INSERT INTO car_avatars (brand, model_name, year_range, image_path, tags, is_active)
                            VALUES ($1, $2, $3, $4, $5, true)
                            ON CONFLICT (image_path) DO UPDATE 
                            SET brand = $1, model_name = $2, year_range = $3, tags = $5;
                        `;

                        await db.query(query, [brand, model, yearRange, relativeImagePath, tags]);
                        console.log(`✓ Synced: ${brand} ${model} [${bodyType}] (${yearRange})`);
                    }
                }
            }
        }
        console.log("\nSync Complete! All car data is updated.");
    } catch (err) {
        console.error("Critical Sync Error:", err);
    } finally {
        process.exit();
    }
}

syncDatabase();