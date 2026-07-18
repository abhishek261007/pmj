const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  phone: { type: String, required: true, index: true },
  inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inquiry', default: null },
  title: { type: String, required: true },
  body: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', NotificationSchema);
