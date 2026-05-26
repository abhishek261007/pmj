const router = require('express').Router();

const Catalog = require('../models/Catalog');
const Design  = require('../models/Design');
const auth    = require('../middleware/auth');

/*
|--------------------------------------------------------------------------
| GET /catalogs
|--------------------------------------------------------------------------
*/
router.get('/', auth, async (_, res) => {
  const catalogs = await Catalog.find().sort({ createdAt: -1 });
  res.json(catalogs);
});

/*
|--------------------------------------------------------------------------
| POST /catalogs
| Body: { name, description?, skuPrefix }
|--------------------------------------------------------------------------
*/
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, skuPrefix } = req.body;

    if (!name || !skuPrefix) {
      return res.status(400).json({ message: 'name and skuPrefix are required.' });
    }

    const catalog = await Catalog.create({
      name,
      description: description || '',
      skuPrefix: skuPrefix.toUpperCase().trim(),
      nextSkuNumber: 1,
    });

    res.json(catalog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not create catalog.' });
  }
});

/*
|--------------------------------------------------------------------------
| GET /catalogs/:id/next-sku
| Returns the prefix and the next available SKU number for the catalog.
| The frontend uses this to pre-fill the SKU stepper.
|--------------------------------------------------------------------------
*/
router.get('/:id/next-sku', auth, async (req, res) => {
  try {
    const catalog = await Catalog.findById(req.params.id).select('skuPrefix nextSkuNumber');

    if (!catalog) {
      return res.status(404).json({ message: 'Catalog not found.' });
    }

    res.json({
      skuPrefix:     catalog.skuPrefix,
      nextSkuNumber: catalog.nextSkuNumber,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not fetch SKU info.' });
  }
});

/*
|--------------------------------------------------------------------------
| DELETE /catalogs/:id
|--------------------------------------------------------------------------
*/
router.delete('/:id', auth, async (req, res) => {
  try {
    await Design.deleteMany({ catalogId: req.params.id });
    await Catalog.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not delete catalog.' });
  }
});

module.exports = router;