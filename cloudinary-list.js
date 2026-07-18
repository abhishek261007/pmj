require('dotenv').config();

const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

(async () => {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'pmj-designs',
      max_results: 500,
    });

    console.log('Assets:', result.resources.length);
    console.log(result.resources.slice(0, 3));
  } catch (err) {
    console.error('FULL ERROR:');
    console.error(JSON.stringify(err, null, 2));
  }
})();