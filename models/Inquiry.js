const mongoose = require('mongoose');

const InquirySchema = new mongoose.Schema(
  {
    items: [
      {
        designId: String,
        sku: String,
        catalogName: String,
      },
    ],

    status: {
      type: String,
      enum: [
        'pending',
        'completed',
        'cancelled',
      ],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Inquiry', InquirySchema);