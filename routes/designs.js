const router = require('express').Router();
const multer = require('multer');
const streamifier = require('streamifier');

const Design = require('../models/Design');
const auth = require('../middleware/auth');

const cloudinary = require('../config/cloudinary');

const storage = multer.memoryStorage();

const upload = multer({
  storage,

  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {

    const stream =
      cloudinary.uploader.upload_stream(
        {
          folder: 'pmj-designs',
        },

        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

    streamifier
      .createReadStream(buffer)
      .pipe(stream);
  });
};

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
      message: 'Failed to fetch designs',
    });
  }
});

router.post(
  '/',
  auth,
  upload.single('image'),

  async (req, res) => {
    try {

      console.log('BODY:', req.body);
      console.log('FILE:', req.file);

      const {
        title,
        sku,
        weight,
        catalogId,
      } = req.body;

      let imageUrl = '';

      if (req.file) {

        const uploaded =
          await uploadToCloudinary(
            req.file.buffer
          );

        imageUrl =
          uploaded.secure_url;
      }

      const design =
        await Design.create({
          title,
          sku,
          weight,
          catalogId,
          imageUrl,
        });

      req.app
        .get('io')
        .emit('design-created', design);

      res.json(design);

    } catch (err) {

      console.log(err);

      res.status(500).json({
        message:
          err.message ||
          'Could not create design',
      });
    }
  }
);

router.patch(
  '/:id/status',
  auth,

  async (req, res) => {
    try {

      const { status } =
        req.body;

      const design =
        await Design.findById(
          req.params.id
        );

      if (!design) {
        return res.status(404).json({
          message: 'Design not found',
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
        message:
          'Failed to update design',
      });
    }
  }
);

router.delete('/:id', auth, async (req, res) => {
  try {

    await Design.findByIdAndDelete(
      req.params.id
    );

    req.app
      .get('io')
      .emit(
        'design-deleted',
        req.params.id
      );

    res.json({
      success: true,
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message:
        'Failed to delete design',
    });
  }
});

module.exports = router;