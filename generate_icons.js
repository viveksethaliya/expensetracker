const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
};

const imagePath = "ChatGPT Image Feb 24, 2026, 05_23_46 PM.png";

(async () => {
    for (const [dpi, size] of Object.entries(sizes)) {
        const dir = path.join(__dirname, `android/app/src/main/res/mipmap-${dpi}`);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const file = path.join(dir, 'ic_launcher.png');
        const fileRound = path.join(dir, 'ic_launcher_round.png');

        await sharp(imagePath).resize(size, size).toFile(file);
        await sharp(imagePath).resize(size, size).toFile(fileRound);
        console.log(`Generated ${dpi} (${size}x${size})`);
    }
    console.log('All icons generated successfully!');
})();
