const express = require('express');
const Inquiry = require('../models/Inquiry');
const Design = require('../models/Design');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const router = express.Router();

/*
|--------------------------------------------------------------------------
| GET /inquiries  — protected
|--------------------------------------------------------------------------
*/
router.get('/', auth, async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 });

    const enriched = await Promise.all(
      inquiries.map(async (inq) => {
        const items = await Promise.all(
          inq.items.map(async (item) => {
            const design = item.designId
              ? await Design.findById(item.designId)
              : null;

            return {
              ...item.toObject(),
              status: design?.status || 'available',
            };
          })
        );

        return {
          ...inq.toObject(),
          items,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error('GET /inquiries error:', err);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch inquiries',
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET /inquiries/:id  — protected
|--------------------------------------------------------------------------
*/
router.get('/:id', auth, async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found',
      });
    }

    const items = await Promise.all(
      inquiry.items.map(async (item) => {
        const design = item.designId
          ? await Design.findById(item.designId)
          : null;

        return {
          ...item.toObject(),
          status: design?.status || 'available',
        };
      })
    );

    res.json({
      ...inquiry.toObject(),
      items,
    });
  } catch (err) {
    console.error('GET /inquiries/:id error:', err);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch inquiry',
    });
  }
});

/*
|--------------------------------------------------------------------------
| POST /inquiries/create  — public (customers submit this)
|--------------------------------------------------------------------------
*/
router.post('/create', async (req, res) => {
  try {
    const { customerName, customerPhone, items, pushToken } = req.body;

    const inquiry = await Inquiry.create({
      customerName,
      customerPhone,
      items,
      pushToken,
    });

    if (pushToken) {
      const PushToken = require('../models/PushToken');
      await PushToken.findOneAndUpdate(
        { token: pushToken },
        {},
        { upsert: true, new: true }
      );
    }

    logAudit({
      action: 'create',
      resource: 'inquiry',
      resourceId: inquiry._id,
      details: { customerName, customerPhone, itemCount: items?.length },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      inquiry,
    });
  } catch (err) {
    console.error('POST /inquiries/create error:', err);

    res.status(500).json({
      success: false,
      message: 'Failed to create inquiry',
    });
  }
});

/*
|--------------------------------------------------------------------------
| PATCH /inquiries/:id/status  — protected
|--------------------------------------------------------------------------
*/
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found',
      });
    }

    const previous = { status: inquiry.status };
    inquiry.status = status;
    await inquiry.save();

    logAudit({
      action: 'update',
      resource: 'inquiry',
      resourceId: req.params.id,
      userId: req.user?.id,
      userRole: req.user?.role,
      details: { status, previous },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      inquiry,
    });
  } catch (err) {
    console.error('PATCH /inquiries/:id/status error:', err);

    res.status(500).json({
      success: false,
      message: 'Failed to update inquiry status',
    });
  }
});

/*
|--------------------------------------------------------------------------
| DELETE /inquiries/:id  — protected
|--------------------------------------------------------------------------
*/
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const inquiry = await Inquiry.findByIdAndDelete(req.params.id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found',
      });
    }

    logAudit({
      action: 'delete',
      resource: 'inquiry',
      resourceId: req.params.id,
      userId: req.user?.id,
      userRole: req.user?.role,
      details: { customerName: inquiry?.customerName, customerPhone: inquiry?.customerPhone },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Inquiry deleted successfully',
    });
  } catch (err) {
    console.error('DELETE /inquiries/:id error:', err);

    res.status(500).json({
      success: false,
      message: 'Failed to delete inquiry',
    });
  }
});

module.exports = router;