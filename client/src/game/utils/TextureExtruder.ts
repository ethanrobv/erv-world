import { Scene } from 'phaser';

/**
 * Programmatically extrudes a tileset texture to prevent tile bleeding (black lines).
 * It copies the edge pixels of every tile out by 1px to create a safety margin.
 */
export class TextureExtruder {
    /**
     * Extrudes the source image and adds it to the Texture Manager under newKey.
     * @param scene - The Phaser Scene.
     * @param key - The key of the source image (must be loaded).
     * @param tileWidth - Width of a single tile.
     * @param tileHeight - Height of a single tile.
     * @param newKey - The key to use for the generated extruded texture.
     */
    static extrude(scene: Scene, key: string, tileWidth: number, tileHeight: number, newKey: string) {
        const texture = scene.textures.get(key);
        const sourceImage = texture.getSourceImage();

        if (sourceImage instanceof Phaser.GameObjects.RenderTexture) return;

        // Calculate new dimensions: 2px padding added to every tile (Margin 1, Spacing 2)
        const cols = sourceImage.width / tileWidth;
        const rows = sourceImage.height / tileHeight;

        const newWidth = sourceImage.width + (cols * 2);
        const newHeight = sourceImage.height + (rows * 2);

        // Create a canvas to draw the extruded version
        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        // Loop through every tile and draw it with padding
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const srcX = x * tileWidth;
                const srcY = y * tileHeight;

                // Destination position: Margin = 1, Spacing = 2
                const destX = 1 + (x * (tileWidth + 2));
                const destY = 1 + (y * (tileHeight + 2));

                // 1. Draw the main tile
                ctx.drawImage(sourceImage as CanvasImageSource, srcX, srcY, tileWidth, tileHeight, destX, destY, tileWidth, tileHeight);

                // 2. Extrude Top Edge
                ctx.drawImage(sourceImage as CanvasImageSource, srcX, srcY, tileWidth, 1, destX, destY - 1, tileWidth, 1);
                // 3. Extrude Bottom Edge
                ctx.drawImage(sourceImage as CanvasImageSource, srcX, srcY + tileHeight - 1, tileWidth, 1, destX, destY + tileHeight, tileWidth, 1);
                // 4. Extrude Left Edge
                ctx.drawImage(sourceImage as CanvasImageSource, srcX, srcY, 1, tileHeight, destX - 1, destY, 1, tileHeight);
                // 5. Extrude Right Edge
                ctx.drawImage(sourceImage as CanvasImageSource, srcX + tileWidth - 1, srcY, 1, tileHeight, destX + tileWidth, destY, 1, tileHeight);
            }
        }

        // Add the new extruded texture to Phaser
        scene.textures.addCanvas(newKey, canvas);
    }
}
