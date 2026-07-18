const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['create', 'update', 'delete'],
    required: true,
  },
  resource: {
    type: String,
    enum: ['catalog', 'design', 'inquiry', 'user', 'config'],
    required: true,
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  userRole: {
    type: String,
    default: null,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ip: {
    type: String,
    default: '',
  },
  userAgent: {
    type: String,
    default: '',
  },
  device: {
    type: String,
    default: '',
  },
  deviceName: {
    type: String,
    default: '',
  },
  deviceBrand: {
    type: String,
    default: '',
  },
  deviceModel: {
    type: String,
    default: '',
  },
  deviceOS: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
