const mongoose = require('mongoose');

const OrderItemSchema =
  new mongoose.Schema({
    designId: {
      type:
        mongoose.Schema.Types.ObjectId,
      ref: 'Design'
    },

    title: String,

    sku: String,

    weight: Number,

    imageUrl: String,

    orderStatus: {
      type: String,
      enum: [
        'pending',
        'fulfilled',
        'cancelled'
      ],
      default: 'pending'
    }
  });

const OrderSchema =
  new mongoose.Schema(
    {
      customerName: String,

      customerPhone: String,

      items: [
        OrderItemSchema
      ],

      status: {
        type: String,
        enum: [
          'pending',
          'partial',
          'fulfilled',
          'cancelled'
        ],
        default: 'pending'
      }
    },
    {
      timestamps: true
    }
  );

module.exports =
  mongoose.model(
    'Order',
    OrderSchema
  );