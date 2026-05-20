const router = require('express').Router();
const multer = require('multer');


const Design = require('../models/Design');
const auth = require('../middleware/auth');

const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,

  params: {
    folder: 'pmj-designs',

    allowed_formats: [
      'jpg',
      'jpeg',
      'png',
      'webp'
    ]
  }
});

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { catalogId } = req.query;

    const filter = {};

    if (catalogId) {
      filter.catalogId = catalogId;
    }

    const designs = await Design.find(filter)
      .sort({ createdAt: -1 });

    res.json(designs);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: 'Failed to fetch designs'
    });
  }
});

router.post(
  '/',
  auth,
  upload.single('image'),
  async (req, res) => {
    try {
      const {
        title,
        sku,
        weight,
        catalogId
      } = req.body;

      const imageUrl = req.file
  ? req.file.path
  : '';

      const design = await Design.create({
        title,
        sku,
        weight,
        catalogId,
        imageUrl
      });

      req.app
        .get('io')
        .emit('design-created', design);

      res.json(design);

    } catch (err) {
      console.log(err);

      res.status(500).json({
        message: 'Could not create design'
      });
    }
  }
);

router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;

    const design = await Design.findById(
      req.params.id
    );

    if (!design) {
      return res.status(404).json({
        message: 'Design not found'
      });
    }

    design.history.push({
      from: design.status,
      to: status,
    });

    design.status = status;

    await design.save();

    req.app
      .get('io')
      .emit('design-updated', design);

    res.json(design);

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: 'Failed to update design'
    });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Design.findByIdAndDelete(
      req.params.id
    );

    req.app
      .get('io')
      .emit('design-deleted', req.params.id);

    res.json({
      success: true
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: 'Failed to delete design'
    });
  }
});

module.exports = router;