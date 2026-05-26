const express = require('express');
const Inquiry = require('../models/Inquiry');
const Design = require('../models/Design');
const router = express.Router();

/*
|--------------------------------------------------------------------------
| GET /inquiries
|--------------------------------------------------------------------------
*/
router.get('/', async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 });

    const enriched = await Promise.all(
      inquiries.map(async (inq) => {
        const items = await Promise.all(
          inq.items.map(async (item) => {
            const design = await Design.findById(item.designId);
            return {
              ...item.toObject(),
              status: design?.status || 'available',
            };
          })
        );
        return { ...inq.toObject(), items };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

/*
|--------------------------------------------------------------------------
| POST /inquiries/create
|--------------------------------------------------------------------------
*/
router.post('/create', async (req, res) => {
  try {
    const { items } = req.body;

    const inquiry = await Inquiry.create({ items });

    res.json({ success: true, inquiry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;