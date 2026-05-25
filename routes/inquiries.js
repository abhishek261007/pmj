const express = require('express');
const Inquiry = require('../models/Inquiry');
const Design = require('../models/Design');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const inquiries = await Inquiry.find()
      .sort({ createdAt: -1 });

    res.json(inquiries);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
    });
  }
});

router.post('/create', async (req, res) => {
  try {
    const { items } = req.body;

    // CREATE INQUIRY
    const inquiry = await Inquiry.create({
      items,
    });

    // RESERVE DESIGNS
    for (const item of items) {
      await Design.findByIdAndUpdate(
        item.designId,
        {
          availability: 'reserved',
        }
      );
    }

    res.json({
      success: true,
      inquiry,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
    });
  }
});

module.exports = router;