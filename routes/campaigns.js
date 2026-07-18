const express = require('express');
const Campaign = require('../models/Campaign');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');

const router = express.Router();

/*
|--------------------------------------------------------------------------
| GET /campaigns/active  — public
|--------------------------------------------------------------------------
*/
router.get('/active', async (_, res) => {
  try {
    const now = new Date();

    const campaign = await Campaign.findOne({
      isActive: true,
      startAt: { $lte: now },
      endAt: { $gte: now },
    }).sort({ createdAt: -1 });

    if (!campaign) {
      return res.json(null);
    }

    res.json({
      _id: campaign._id,
      name: campaign.name,
      description: campaign.description,
      offerCode: campaign.offerCode,
      endAt: campaign.endAt,
      showValidTill: campaign.showValidTill,
    });
  } catch (err) {
    console.error('GET /campaigns/active error:', err);
    res.status(500).json({ message: 'Failed to fetch active campaign' });
  }
});

/*
|--------------------------------------------------------------------------
| POST /campaigns/validate  — public
|--------------------------------------------------------------------------
*/
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ valid: false, message: 'Code is required' });
    }

    const now = new Date();
    const campaign = await Campaign.findOne({
      offerCode: code.toUpperCase().trim(),
      isActive: true,
      startAt: { $lte: now },
      endAt: { $gte: now },
    });

    if (!campaign) {
      return res.json({ valid: false, message: 'Invalid or expired offer code' });
    }

    res.json({
      valid: true,
      campaign: {
        _id: campaign._id,
        name: campaign.name,
        offerCode: campaign.offerCode,
        description: campaign.description,
      },
    });
  } catch (err) {
    console.error('POST /campaigns/validate error:', err);
    res.status(500).json({ valid: false, message: 'Failed to validate code' });
  }
});

/*
|--------------------------------------------------------------------------
| GET /campaigns  — auth
|--------------------------------------------------------------------------
*/
router.get('/', auth, async (_, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (err) {
    console.error('GET /campaigns error:', err);
    res.status(500).json({ message: 'Failed to fetch campaigns' });
  }
});

/*
|--------------------------------------------------------------------------
| POST /campaigns  — admin only
|--------------------------------------------------------------------------
*/
router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, offerCode, description, startAt, endAt, showValidTill } = req.body;

    if (!name || !offerCode || !startAt || !endAt) {
      return res.status(400).json({
        success: false,
        message: 'Name, offerCode, startAt, and endAt are required',
      });
    }

    const existing = await Campaign.findOne({
      offerCode: offerCode.toUpperCase().trim(),
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A campaign with this offer code already exists',
      });
    }

    const campaign = await Campaign.create({
      name,
      offerCode: offerCode.toUpperCase().trim(),
      description: description || '',
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      showValidTill: showValidTill !== false,
    });

    res.json({ success: true, campaign });
  } catch (err) {
    console.error('POST /campaigns error:', err);
    res.status(500).json({ success: false, message: 'Failed to create campaign' });
  }
});

/*
|--------------------------------------------------------------------------
| PATCH /campaigns/:id  — admin only
|--------------------------------------------------------------------------
*/
router.patch('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, offerCode, description, startAt, endAt, showValidTill } = req.body;

    const update = {};
    if (name !== undefined) update.name = name;
    if (offerCode !== undefined) update.offerCode = offerCode.toUpperCase().trim();
    if (description !== undefined) update.description = description;
    if (startAt !== undefined) update.startAt = new Date(startAt);
    if (endAt !== undefined) update.endAt = new Date(endAt);
    if (showValidTill !== undefined) update.showValidTill = showValidTill;

    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    res.json({ success: true, campaign });
  } catch (err) {
    console.error('PATCH /campaigns/:id error:', err);
    res.status(500).json({ success: false, message: 'Failed to update campaign' });
  }
});

/*
|--------------------------------------------------------------------------
| POST /campaigns/:id/end  — admin only
|--------------------------------------------------------------------------
*/
router.post('/:id/end', auth, authorize('admin'), async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    res.json({ success: true, campaign });
  } catch (err) {
    console.error('POST /campaigns/:id/end error:', err);
    res.status(500).json({ success: false, message: 'Failed to end campaign' });
  }
});

module.exports = router;
