const fs = require('fs');
const path = require('path');

// Target Directory: client/public/assets/game
const targetDir = path.join(__dirname, 'client', 'public', 'assets', 'game');

console.log(`[Reset] Target directory: ${targetDir}`);

// 1. Clean up old corrupt files
if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
    console.log('[Reset] Deleted old corrupt assets folder.');
}
fs.mkdirSync(targetDir, { recursive: true });
console.log('[Reset] Created fresh folder.');

// -----------------------------------------------------------------------------
// BINARY ASSETS (Hex Strings to guarantee valid PNG structure)
// -----------------------------------------------------------------------------

// 1. player.png (16x16 Yellow Square)
const playerHex =
    '89504e470d0a1a0a0000000d494844520000001000000010080200000090916836000000017352474200aece1ce90000000467414d410000b18f0bfc61050000002049444154384f63fcffff3f030835414061a58d13a0fc81682800000000000000000403006d011f01c80c7f260000000049454e44ae426082';

// 2. bobber.png (8x8 White/Red float)
const bobberHex =
    '89504e470d0a1a0a0000000d49484452000000080000000808020000004b6d29dc000000017352474200aece1ce90000000467414d410000b18f0bfc61050000000f49444154185763f80f040c0c40000100224001159a4c8c170000000049454e44ae426082';

// 3. tiles.png (64x16 Texture Atlas)
// Contains 4 blocks of 16x16: [Empty, Green(Grass), Blue(Water), Red(Mars)]
const tilesHex =
    '89504e470d0a1a0a0000000d494844520000004000000010080200000016250502000000017352474200aece1ce90000000467414d410000b18f0bfc61050000003a49444154484f6360606000030588640000590003186df8ff3f1820c8c10505412218002446059d4828606400000000000000000000008c021100f72f1e01861963870000000049454e44ae426082';

// -----------------------------------------------------------------------------
// MAP DATA (JSON)
// -----------------------------------------------------------------------------

const earthJson = {
    "compressionlevel": -1,
    "height": 20,
    "width": 20,
    "infinite": false,
    "layers": [
        {
            "data": new Array(400).fill(1), // Index 1 = Green Grass
            "height": 20,
            "width": 20,
            "id": 1,
            "name": "Ground",
            "opacity": 1,
            "type": "tilelayer",
            "visible": true,
            "x": 0, "y": 0
        },
        {
            "data": new Array(400).fill(0).map((v, i) => {
                const x = i % 20; const y = Math.floor(i / 20);
                return (x > 5 && x < 15 && y > 5 && y < 15) ? 2 : 0; // Index 2 = Blue Water
            }),
            "height": 20,
            "width": 20,
            "id": 2,
            "name": "Water",
            "opacity": 0.8,
            "type": "tilelayer",
            "visible": true,
            "x": 0, "y": 0
        }
    ],
    "tileheight": 16,
    "tilewidth": 16,
    "tilesets": [{
        "columns": 4,
        "firstgid": 1,
        "image": "tiles.png",
        "imageheight": 16,
        "imagewidth": 64,
        "margin": 0,
        "name": "StandardTileset",
        "spacing": 0,
        "tilecount": 4,
        "tileheight": 16,
        "tilewidth": 16
    }]
};

const marsJson = JSON.parse(JSON.stringify(earthJson));
marsJson.layers[0].data.fill(3); // Index 3 = Red Mars Soil
marsJson.layers[1].data.fill(0); // No water on Mars default

// -----------------------------------------------------------------------------
// EXECUTION
// -----------------------------------------------------------------------------

function writeHex(filename, hexString) {
    const buffer = Buffer.from(hexString, 'hex');
    fs.writeFileSync(path.join(targetDir, filename), buffer);
    console.log(`[Success] Wrote ${filename} (${buffer.length} bytes)`);
}

function writeJson(filename, data) {
    fs.writeFileSync(path.join(targetDir, filename), JSON.stringify(data, null, 2));
    console.log(`[Success] Wrote ${filename}`);
}

try {
    writeHex('player.png', playerHex);
    writeHex('bobber.png', bobberHex);
    writeHex('tiles.png', tilesHex);
    writeJson('earth.json', earthJson);
    writeJson('mars.json', marsJson);
    console.log('\nAsset generation complete. Please restart your dev server.');
} catch (err) {
    console.error('[Error] Failed to write assets:', err);
}
