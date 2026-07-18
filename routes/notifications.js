const express = require('express');
const PushToken = require('../models/PushToken');

const router = express.Router();

/*
|--------------------------------------------------------------------------
| POST /push-tokens/register  — public (called by client app)
|--------------------------------------------------------------------------
*/
router.post('/push-tokens/register', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    await PushToken.findOneAndUpdate(
      { token },
      {},
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('POST /push-tokens/register error:', err);
    res.status(500).json({ success: false, message: 'Failed to register push token' });
  }
});

module.exports = router;
