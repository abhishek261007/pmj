const router = require('express').Router();

const multerRaw = require('multer');
const multer    = multerRaw.default || multerRaw;
const { Readable } = require('stream');

const Design  = require('../models/Design');
const Catalog = require('../models/Catalog');
const auth    = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');

const upload = multer({ limits: { fileSize: 15 * 1024 * 1024 } });

const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'pmj-designs' },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    Readable.from(buffer).pipe(stream);
  });

// Upload from a base64 string (used when client sends JSON instead of multipart)
const uploadBase64ToCloudinary = (base64String) =>
  new Promise((resolve, reject) => {
    // base64String may or may not have the data URI prefix — handle both
    const dataUri = base64String.startsWith('data:')
      ? base64String
      : `data:image/jpeg;base64,${base64String}`;

    cloudinary.uploader.upload(
      dataUri,
      { folder: 'pmj-designs' },
      (error, result) => (error ? reject(error) : resolve(result))
    );
  });

/*
|--------------------------------------------------------------------------
| GET /designs
|--------------------------------------------------------------------------
*/
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.catalogId) filter.catalogId = req.query.catalogId;
    const designs = await Design.find(filter).sort({ createdAt: -1 });
    res.json(designs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch designs' });
  }
});

/*
|--------------------------------------------------------------------------
| POST /designs
|
| Accepts TWO formats so we can support both multipart and JSON:
|
| A) multipart/form-data  (legacy / future)
|    Fields: sku, skuNumber, weight, catalogId
|    File:   image (binary)
|
| B) application/json     (current React Native client)
|    { sku, skuNumber, weight, catalogId, imageBase64? }
|    imageBase64 is a bare base64 string or a data URI
|--------------------------------------------------------------------------
*/
router.post(
  '/',
  auth,
  // Run multer only for multipart requests; skip gracefully for JSON
  (req, res, next) => {
    const ct = req.headers['content-type'] || '';
    if (ct.includes('multipart/form-data')) {
      upload.single('image')(req, res, next);
    } else {
      next();
    }
  },
  async (req, res) => {
    try {
      const { title, sku, skuNumber, weight, catalogId, imageBase64 } = req.body;

      console.log('DESIGN POST — content-type:', req.headers['content-type']);
      console.log('REQ.FILE:', req.file);
      console.log('HAS imageBase64:', !!imageBase64);

      let imageUrl = '';

      if (req.file && req.file.buffer) {
        // Multipart upload
        const uploaded = await uploadToCloudinary(req.file.buffer);
        imageUrl = uploaded.secure_url;
      } else if (imageBase64) {
        // JSON / base64 upload
        const uploaded = await uploadBase64ToCloudinary(imageBase64);
        imageUrl = uploaded.secure_url;
      }

      const design = await Design.create({
        title,
        sku,
        weight,
        catalogId,
        imageUrl,
      });

      // Advance the catalog SKU counter (only ever moves forward)
      const usedNumber = parseInt(skuNumber, 10);
      if (!isNaN(usedNumber)) {
        await Catalog.findByIdAndUpdate(
          catalogId,
          { $max: { nextSkuNumber: usedNumber + 1 } }
        );
      }

      req.app.get('io').emit('design-created', design);
      res.json(design);

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message || 'Could not create design' });
    }
  }
);

/*
|--------------------------------------------------------------------------
| PATCH /designs/:id/status
|--------------------------------------------------------------------------
*/
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['available', 'sold'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }
    const design = await Design.findById(req.params.id);
    if (!design) {
      return res.status(404).json({ success: false, message: 'Design not found.' });
    }
    design.history.push({ from: design.status, to: status });
    design.status = status;
    await design.save();
    if (req.app.get('io')) {
      req.app.get('io').emit('design-updated', design);
    }
    res.json({ success: true, design });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

/*
|--------------------------------------------------------------------------
| DELETE /designs/:id
|--------------------------------------------------------------------------
*/
router.delete('/:id', auth, async (req, res) => {
  try {
    await Design.findByIdAndDelete(req.params.id);
    req.app.get('io').emit('design-deleted', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete design' });
  }
});

module.exports = router;