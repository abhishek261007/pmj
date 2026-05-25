import express from 'express';
import Inquiry from '../models/Inquiry';
import Design from '../models/Design';

const router = express.Router();

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
    console.log(err);

    res.status(500).json({
      success: false,
    });
  }
});

export default router;