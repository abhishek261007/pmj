const mongoose = require('mongoose');

const InquirySchema = new mongoose.Schema(
  {
    items: [
      {
        designId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Design',
        },
        sku: String,
        catalogName: String,
        imageUrl: String,
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Inquiry', InquirySchema);