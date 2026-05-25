import mongoose from 'mongoose';

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

export default mongoose.model(
  'Inquiry',
  InquirySchema
);