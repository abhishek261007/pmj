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
| Body (multipart/form-data):
|   sku        – full SKU string, e.g. "PM-007"
|   skuNumber  – the raw integer chosen by the user, e.g. 7
|   weight     – number
|   catalogId  – ObjectId string
|   image?     – file
|
| After saving the design we advance the catalog's nextSkuNumber to
| (skuNumber + 1) — but ONLY if that would actually move the counter
| forward. This means:
|   • Normal flow  → counter goes 1 → 2 → 3 automatically.
|   • User skipped (picked a higher number) → counter jumps ahead correctly.
|   • User went backwards (picked a lower number) → counter is NOT reduced,
|     avoiding accidental duplicate SKUs in the future.
|--------------------------------------------------------------------------
*/
router.post('/', auth, upload.single('image'), async (req, res) => {
  console.log('=== DESIGN POST HIT ===');
  console.log('CONTENT-TYPE:', req.headers['content-type']);
  console.log('REQ.FILE:', req.file);
  console.log('REQ.BODY:', req.body);
  // ... rest of code
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, sku, skuNumber, weight, catalogId } = req.body;

    // ── Upload image if present ─────────────────────────────────────────
    let imageUrl = '';
    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file.buffer);
      imageUrl = uploaded.secure_url;
    }

    // ── Create the design ───────────────────────────────────────────────
    const design = await Design.create({
      title,
      sku,
      weight,
      catalogId,
      imageUrl,
    });

    // ── Advance the catalog SKU counter ─────────────────────────────────
    // nextSkuNumber should always be (highest used number + 1).
    // We use $max so the counter only ever moves forward.
    const usedNumber = parseInt(skuNumber, 10);

    if (!isNaN(usedNumber)) {
      await Catalog.findByIdAndUpdate(
        catalogId,
        { $max: { nextSkuNumber: usedNumber + 1 } }
      );
    }

    // ── Socket broadcast ────────────────────────────────────────────────
    req.app.get('io').emit('design-created', design);

    res.json(design);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Could not create design' });
  }
});

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