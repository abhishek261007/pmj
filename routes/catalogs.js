const router = require('express').Router();

const fs = require('fs');
const path = require('path');

const multerRaw = require('multer');
const multer = multerRaw.default || multerRaw;

const Catalog = require('../models/Catalog');
const Design = require('../models/Design');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
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

async function saveBufferToUploads(buffer, name, ext = 'jpg') {
  const safeName = sanitizeFilename(name || Date.now());

  let filename = `${safeName}.${ext}`;
  let filepath = path.join(UPLOAD_DIR, filename);

  let counter = 1;

  while (fs.existsSync(filepath)) {
    filename = `${safeName}_${counter}.${ext}`;
    filepath = path.join(UPLOAD_DIR, filename);
    counter++;
  }

  await fs.promises.writeFile(filepath, buffer);

  return `/uploads/${filename}`;
}

async function saveBase64ToUploads(base64String, name) {
  const cleaned = base64String.startsWith('data:')
    ? base64String.split(',')[1]
    : base64String;

  const buffer = Buffer.from(cleaned, 'base64');

  return saveBufferToUploads(buffer, name, 'jpg');
}

/*
|--------------------------------------------------------------------------
| GET /catalogs
|--------------------------------------------------------------------------
*/
router.get('/', auth, async (_, res) => {
  try {
    const catalogs = await Catalog.find()
      .sort({ createdAt: -1 });

    res.json(catalogs);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: 'Could not fetch catalogs.',
    });
  }
});

/*
|--------------------------------------------------------------------------
| POST /catalogs
|--------------------------------------------------------------------------
*/
router.post(
  '/',
  auth,
  (req, res, next) => {
    const ct = req.headers['content-type'] || '';

    if (ct.includes('multipart/form-data')) {
      upload.single('heroImage')(req, res, next);
    } else {
      next();
    }
  },
  async (req, res) => {
    try {
      const {
        name,
        description,
        skuPrefix,
      } = req.body;

      if (!name || !skuPrefix) {
        return res.status(400).json({
          message: 'name and skuPrefix are required.',
        });
      }

      let heroImageUrl = '';

      if (req.file?.buffer) {
        heroImageUrl = await saveBufferToUploads(
          req.file.buffer,
          `catalog-${skuPrefix}`,
          'jpg'
        );
      } else if (req.body?.heroImageBase64) {
        heroImageUrl = await saveBase64ToUploads(
          req.body.heroImageBase64,
          `catalog-${skuPrefix}`
        );
      }

      const catalog = await Catalog.create({
        name,
        description: description || '',
        heroImageUrl,
        skuPrefix: skuPrefix.toUpperCase().trim(),
        nextSkuNumber: 1,
      });

      logAudit({
        action: 'create',
        resource: 'catalog',
        resourceId: catalog._id,
        userId: req.user?.id,
        userRole: req.user?.role,
        details: { name, skuPrefix, description },
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json(catalog);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: 'Could not create catalog.',
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET /catalogs/:id/next-sku
|--------------------------------------------------------------------------
*/
router.get('/:id/next-sku', auth, async (req, res) => {
  try {
    const catalog = await Catalog.findById(
      req.params.id
    ).select('skuPrefix nextSkuNumber');

    if (!catalog) {
      return res.status(404).json({
        message: 'Catalog not found.',
      });
    }

    res.json({
      skuPrefix: catalog.skuPrefix,
      nextSkuNumber: catalog.nextSkuNumber,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: 'Could not fetch SKU info.',
    });
  }
});

/*
|--------------------------------------------------------------------------
| PATCH /catalogs/:id  — update catalog name, description, hero image
|--------------------------------------------------------------------------
*/
router.patch(
  '/:id',
  auth,
  (req, res, next) => {
    const ct = req.headers['content-type'] || '';
    if (ct.includes('multipart/form-data')) {
      upload.single('heroImage')(req, res, next);
    } else {
      next();
    }
  },
  async (req, res) => {
    try {
      const catalog = await Catalog.findById(req.params.id);
      if (!catalog) {
        return res.status(404).json({ message: 'Catalog not found.' });
      }

      const { name, description } = req.body;
      const previous = { name: catalog.name, description: catalog.description };

      if (name !== undefined) catalog.name = name;
      if (description !== undefined) catalog.description = description;

      if (req.file?.buffer) {
        if (catalog.heroImageUrl?.startsWith('/uploads/')) {
          const oldPath = path.join(__dirname, '..', catalog.heroImageUrl);
          try { if (fs.existsSync(oldPath)) await fs.promises.unlink(oldPath); }
          catch (e) { console.error('Could not delete old hero image:', e); }
        }
        catalog.heroImageUrl = await saveBufferToUploads(
          req.file.buffer,
          `catalog-${catalog.skuPrefix}-${Date.now()}`,
          'jpg'
        );
      } else if (req.body?.heroImageBase64) {
        if (catalog.heroImageUrl?.startsWith('/uploads/')) {
          const oldPath = path.join(__dirname, '..', catalog.heroImageUrl);
          try { if (fs.existsSync(oldPath)) await fs.promises.unlink(oldPath); }
          catch (e) { console.error('Could not delete old hero image:', e); }
        }
        catalog.heroImageUrl = await saveBase64ToUploads(
          req.body.heroImageBase64,
          `catalog-${catalog.skuPrefix}-${Date.now()}`
        );
      } else if (req.body?.removeHeroImage) {
        if (catalog.heroImageUrl?.startsWith('/uploads/')) {
          const oldPath = path.join(__dirname, '..', catalog.heroImageUrl);
          try { if (fs.existsSync(oldPath)) await fs.promises.unlink(oldPath); }
          catch (e) { console.error('Could not delete old hero image:', e); }
        }
        catalog.heroImageUrl = '';
      }

      await catalog.save();

      logAudit({
        action: 'update',
        resource: 'catalog',
        resourceId: catalog._id,
        userId: req.user?.id,
        userRole: req.user?.role,
        details: { name, description, previous },
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json(catalog);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Could not update catalog.' });
    }
  }
);

/*
|--------------------------------------------------------------------------
| DELETE /catalogs/:id
|--------------------------------------------------------------------------
*/
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const catalog = await Catalog.findById(
      req.params.id
    );

    if (!catalog) {
      return res.status(404).json({
        message: 'Catalog not found.',
      });
    }

    if (
      catalog.heroImageUrl &&
      catalog.heroImageUrl.startsWith('/uploads/')
    ) {
      const filepath = path.join(
        __dirname,
        '..',
        catalog.heroImageUrl
      );

      try {
        if (fs.existsSync(filepath)) {
          await fs.promises.unlink(filepath);
        }
      } catch (e) {
        console.error(
          'Could not delete hero image:',
          filepath,
          e
        );
      }
    }

    await Design.deleteMany({
      catalogId: req.params.id,
    });

    await Catalog.findByIdAndDelete(
      req.params.id
    );

    logAudit({
      action: 'delete',
      resource: 'catalog',
      resourceId: req.params.id,
      userId: req.user?.id,
      userRole: req.user?.role,
      details: { name: catalog.name, skuPrefix: catalog.skuPrefix },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: 'Could not delete catalog.',
    });
  }
});

module.exports = router;