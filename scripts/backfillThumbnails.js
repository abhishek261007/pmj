// scripts/backfillThumbnails.js
//
// Run once to generate thumbnails for any existing Design documents
// that have an imageUrl but no thumbnailUrl yet.
//
// Usage:
//   node scripts/backfillThumbnails.js

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const Design = require('../models/Design');
const { generateThumbnail } = require('../utils/thumbnail');

// Adjust if your uploads folder lives somewhere else relative to project root
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const designs = await Design.find({
    imageUrl: { $exists: true, $ne: null },
    $or: [{ thumbnailUrl: { $exists: false } }, { thumbnailUrl: null }],
  });

  console.log(`Found ${designs.length} design(s) missing thumbnails.`);

  let success = 0;
  let failed = 0;

  for (const design of designs) {
    try {
      const filename = path.basename(design.imageUrl);
      const sourcePath = path.join(UPLOADS_DIR, filename);

      if (!fs.existsSync(sourcePath)) {
        console.warn(`Skipping ${design._id} — source file not found at ${sourcePath}`);
        failed++;
        continue;
      }

      design.thumbnailUrl = await generateThumbnail(sourcePath, filename);
      await design.save();
      success++;
    } catch (err) {
      console.error(`Failed for ${design._id}:`, err.message);
      failed++;
    }
  }

  console.log(`Done. ${success} succeeded, ${failed} failed.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Backfill script crashed:', err);
  process.exit(1);
});