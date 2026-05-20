const router = require('express').Router();

const Catalog = require('../models/Catalog');
const Design = require('../models/Design');

const auth = require('../middleware/auth');

router.get('/', auth, async (_, res) => {
  const catalogs = await Catalog.find()
    .sort({ createdAt: -1 });

  res.json(catalogs);
});

router.post('/', auth, async (req, res) => {
  const catalog = await Catalog.create(req.body);

  res.json(catalog);
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Design.deleteMany({
      catalogId: req.params.id
    });

    await Catalog.findByIdAndDelete(
      req.params.id
    );

    res.json({
      success: true
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: 'Could not delete catalog'
    });
  }
});

module.exports = router;