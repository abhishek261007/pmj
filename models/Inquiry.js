const mongoose = require('mongoose');

const InquirySchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },

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

    pushToken: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Inquiry', InquirySchema);