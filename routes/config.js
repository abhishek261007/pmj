const router = require('express').Router();
const Config = require('../models/Config');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

/*
|--------------------------------------------------------------------------
| GET /config/:key
|--------------------------------------------------------------------------
| Public route so the app can fetch the config without auth.
*/
router.get('/:key', async (req, res) => {
  try {
    const config = await Config.findOne({ key: req.params.key });
    
    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }
    
    res.json({ key: config.key, value: config.value });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch config.' });
  }
});

/*
|--------------------------------------------------------------------------
| PUT /config/:key
|--------------------------------------------------------------------------
| Protected route for admins to update configurations.
*/
router.put('/:key', auth, authorize('admin'), async (req, res) => {
  try {
    const { value } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    const config = await Config.findOneAndUpdate(
      { key: req.params.key },
      { value },
      { new: true, upsert: true } // Create if doesn't exist
    );

    logAudit({
      action: 'update',
      resource: 'config',
      resourceId: config._id,
      userId: req.user?.id,
      userRole: req.user?.role,
      details: { key: config.key, value: config.value },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update config.' });
  }
});

module.exports = router;
