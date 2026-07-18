// utils/thumbnail.js
//
// Generates a small, web-optimized thumbnail for an uploaded design image.
//
// Uses jimp (pure JavaScript, zero native binaries) instead of sharp.
// sharp's bundled libvips binary requires AVX2 CPU instructions, which some
// budget/virtualized VPS hosts don't expose — that caused a SIGILL crash
// ("Illegal instruction") on this server. jimp is slower per-image but has
// no CPU instruction-set requirements, so it works everywhere.
//
// Requires: npm install jimp@0.22.12   (pinned to the stable pre-v1 API)

const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

// Adjust if your uploads folder lives somewhere else relative to project root
const THUMBNAIL_DIR = path.join(__dirname, '..', 'uploads', 'thumbnails');

// 500px is plenty for a 2-column grid card even on retina screens —
// the card itself only renders at roughly (screenWidth / 2) logical px
const THUMBNAIL_MAX_WIDTH = 500;

if (!fs.existsSync(THUMBNAIL_DIR)) {
  fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
}

/**
 * Generates a resized + compressed thumbnail for an uploaded image.
 * Preserves aspect ratio (no cropping) since jewelry photos often aren't square
 * and the RN card already uses contentFit="contain".
 *
 * Jimp.read() accepts either a Buffer (image still in memory, e.g.
 * req.file.buffer from multer memory storage) or an absolute file path
 * (e.g. when backfilling thumbnails for images already saved to disk) —
 * both work with this function.
 *
 * @param {Buffer|string} source      In-memory image buffer OR absolute path to the original file
 * @param {string} sourceFilename     Original filename, used to derive the thumbnail filename
 * @returns {Promise<string>} Relative URL to store on the Design doc, e.g. "/uploads/thumbnails/abc123-thumb.jpg"
 */
async function generateThumbnail(source, sourceFilename) {
  const base = path.parse(sourceFilename).name;
  const thumbFilename = `${base}-thumb.jpg`;
  const outputPath = path.join(THUMBNAIL_DIR, thumbFilename);

  const image = await Jimp.read(source);

  // Only shrink, never enlarge — and keep aspect ratio via Jimp.AUTO
  if (image.bitmap.width > THUMBNAIL_MAX_WIDTH) {
    image.resize(THUMBNAIL_MAX_WIDTH, Jimp.AUTO);
  }

  await image.quality(80).writeAsync(outputPath);

  return `/uploads/thumbnails/${thumbFilename}`;
}

/**
 * Deletes a thumbnail file given its stored relative URL.
 * Useful when a design's image is replaced or the design is deleted.
 */
function deleteThumbnail(thumbnailUrl) {
  if (!thumbnailUrl) return;
  const filename = path.basename(thumbnailUrl);
  const filePath = path.join(THUMBNAIL_DIR, filename);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error('[deleteThumbnail] failed:', err);
    }
  });
}

module.exports = { generateThumbnail, deleteThumbnail };