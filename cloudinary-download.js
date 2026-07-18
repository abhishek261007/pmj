require('dotenv').config();

const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const https = require('https');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const download = (url, file) =>
  new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(file);

    https.get(url, (res) => {
      res.pipe(stream);

      stream.on('finish', () => {
        stream.close();
        resolve();
      });
    }).on('error', reject);
  });

(async () => {
  let nextCursor = null;
  let total = 0;

  do {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'pmj-designs',
      max_results: 500,
      next_cursor: nextCursor,
    });

    for (const img of result.resources) {
      const filename =
        img.public_id.replace(/\//g, '_') +
        '.' +
        img.format;

      const filepath = path.join(
        process.env.HOME,
        'pmj-images',
        filename
      );

      console.log('Downloading:', filename);

      await download(
        img.secure_url,
        filepath
      );

      total++;
    }

    nextCursor = result.next_cursor;

  } while (nextCursor);

  console.log(`Downloaded ${total} files`);
})();