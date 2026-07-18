const router = require('express').Router();
const AuditLog = require('../models/AuditLog');
const Catalog = require('../models/Catalog');
const Design = require('../models/Design');
const Inquiry = require('../models/Inquiry');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { action, resource, limit = 100, skip = 0 } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (resource) filter.resource = resource;

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const total = await AuditLog.countDocuments(filter);

    res.json({ logs, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
});

router.post('/:id/revert', auth, authorize('admin'), async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ message: 'Audit log not found' });
    }
    if (log.action !== 'update') {
      return res.status(400).json({ message: 'Only update actions can be reverted' });
    }

    const previous = log.details?.previous;
    if (!previous) {
      return res.status(400).json({ message: 'No previous state available to revert' });
    }

    switch (log.resource) {
      case 'catalog': {
        const catalog = await Catalog.findById(log.resourceId);
        if (!catalog) return res.status(404).json({ message: 'Catalog not found' });
        if (previous.name !== undefined) catalog.name = previous.name;
        if (previous.description !== undefined) catalog.description = previous.description;
        await catalog.save();
        break;
      }
      case 'design': {
        const design = await Design.findById(log.resourceId);
        if (!design) return res.status(404).json({ message: 'Design not found' });
        if (previous.status) {
          design.history.push({ from: design.status, to: previous.status });
          design.status = previous.status;
        }
        await design.save();
        break;
      }
      case 'inquiry': {
        const inquiry = await Inquiry.findById(log.resourceId);
        if (!inquiry) return res.status(404).json({ message: 'Inquiry not found' });
        if (previous.status) inquiry.status = previous.status;
        await inquiry.save();
        break;
      }
      default:
        return res.status(400).json({ message: 'Cannot revert this resource type' });
    }

    logAudit({
      action: 'update',
      resource: log.resource,
      resourceId: log.resourceId,
      userId: req.user?.id,
      userRole: req.user?.role,
      details: { reverted: true, fromLogId: log._id, previous },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, message: 'Reverted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to revert' });
  }
});

module.exports = router;
