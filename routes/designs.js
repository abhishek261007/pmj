const router = require('express').Router();

const fs = require('fs');
const path = require('path');

const multerRaw = require('multer');
const multer = multerRaw.default || multerRaw;

const Design = require('../models/Design');
const Catalog = require('../models/Catalog');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { generateThumbnail, deleteThumbnail } = require('../utils/thumbnail');
const { logAudit } = require('../utils/audit');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function sanitizeFilename(name) {
  return String(name)
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .trim();
}

// Now returns { imageUrl, thumbnailUrl } instead of just a string,
// since we generate the thumbnail straight from the in-memory buffer
// at the same time we write the original to disk.
async function saveBufferToUploads(buffer, sku, ext = 'jpg') {
  const safeSku = sanitizeFilename(sku || Date.now());

  let filename = `${safeSku}.${ext}`;
  let filepath = path.join(UPLOAD_DIR, filename);

  let counter = 1;

  while (fs.existsSync(filepath)) {
    filename = `${safeSku}_${counter}.${ext}`;
    filepath = path.join(UPLOAD_DIR, filename);
    counter++;
  }

  await fs.promises.writeFile(filepath, buffer);

  let thumbnailUrl = null;

  try {
    // sharp() can read straight from the buffer we already have in memory —
    // no need to re-read the file we just wrote
    thumbnailUrl = await generateThumbnail(buffer, filename);
  } catch (err) {
    // Don't fail the whole upload if thumbnail generation has an issue
    // (e.g. unsupported format) — the original image still saved fine.
    console.error('[saveBufferToUploads] thumbnail generation failed:', err);
  }

  return {
    imageUrl: `/uploads/${filename}`,
    thumbnailUrl,
  };
}

async function saveBase64ToUploads(base64String, sku) {
  const cleaned = base64String.startsWith('data:')
    ? base64String.split(',')[1]
    : base64String;

  const buffer = Buffer.from(cleaned, 'base64');

  return saveBufferToUploads(buffer, sku, 'jpg');
}

/*
|--------------------------------------------------------------------------
| GET /designs
|--------------------------------------------------------------------------
*/
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};

    if (req.query.catalogId) {
      filter.catalogId = req.query.catalogId;
    }

    const designs = await Design.find(filter)
      .sort({ createdAt: -1 });

    res.json(designs);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: 'Failed to fetch designs',
    });
  }
});

/*
|--------------------------------------------------------------------------
| POST /designs
|--------------------------------------------------------------------------
*/
router.post(
  '/',
  auth,
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
      const {
        title,
        sku,
        skuNumber,
        weight,
        catalogId,
        imageBase64,
      } = req.body;

      console.log(
        'DESIGN POST — content-type:',
        req.headers['content-type']
      );

      console.log('REQ.FILE:', !!req.file);
      console.log('HAS imageBase64:', !!imageBase64);

      let imageUrl = '';
      let thumbnailUrl = null;

      if (req.file && req.file.buffer) {
        const saved = await saveBufferToUploads(
          req.file.buffer,
          sku,
          'jpg'
        );
        imageUrl = saved.imageUrl;
        thumbnailUrl = saved.thumbnailUrl;
      } else if (imageBase64) {
        const saved = await saveBase64ToUploads(
          imageBase64,
          sku
        );
        imageUrl = saved.imageUrl;
        thumbnailUrl = saved.thumbnailUrl;
      }

      const design = await Design.create({
        title,
        sku,
        weight,
        catalogId,
        imageUrl,
        thumbnailUrl,
      });

      const usedNumber = parseInt(skuNumber, 10);

      if (!isNaN(usedNumber)) {
        await Catalog.findByIdAndUpdate(
          catalogId,
          {
            $max: {
              nextSkuNumber: usedNumber + 1,
            },
          }
        );
      }

      const io = req.app.get('io');

      if (io) {
        io.emit('design-created', design);
      }

      logAudit({
        action: 'create',
        resource: 'design',
        resourceId: design._id,
        userId: req.user?.id,
        userRole: req.user?.role,
        details: { sku, weight, catalogId, title },
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json(design);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        message:
          err.message ||
          'Could not create design',
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| PATCH /designs/:id/status
|--------------------------------------------------------------------------
*/
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['available', 'sold'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value.',
      });
    }

    const design = await Design.findById(
      req.params.id
    );

    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found.',
      });
    }

    const previous = { status: design.status };

    design.history.push({
      from: design.status,
      to: status,
    });

    design.status = status;

    await design.save();

    const io = req.app.get('io');

    if (io) {
      io.emit('design-updated', design);
    }

    logAudit({
      action: 'update',
      resource: 'design',
      resourceId: req.params.id,
      userId: req.user?.id,
      userRole: req.user?.role,
      details: { from: previous.status, to: status, previous },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      design,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
    });
  }
});

/*
|--------------------------------------------------------------------------
| DELETE /designs/:id
|--------------------------------------------------------------------------
*/
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const design = await Design.findById(
      req.params.id
    );

    if (design?.imageUrl?.startsWith('/uploads/')) {
      const filepath = path.join(
        __dirname,
        '..',
        design.imageUrl
      );

      try {
        if (fs.existsSync(filepath)) {
          await fs.promises.unlink(filepath);
        }
      } catch (e) {
        console.error(
          'Could not delete image:',
          filepath,
          e
        );
      }
    }

    // Clean up the thumbnail alongside the original image
    if (design?.thumbnailUrl) {
      deleteThumbnail(design.thumbnailUrl);
    }

    await Design.findByIdAndDelete(
      req.params.id
    );

    const io = req.app.get('io');

    if (io) {
      io.emit(
        'design-deleted',
        req.params.id
      );
    }

    logAudit({
      action: 'delete',
      resource: 'design',
      resourceId: req.params.id,
      userId: req.user?.id,
      userRole: req.user?.role,
      details: { sku: design?.sku, title: design?.title },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message:
        'Failed to delete design',
    });
  }
});

module.exports = router;