const mongoose = require('mongoose');

const DesignSchema = new mongoose.Schema({
  title: String,

  sku: String,

  weight: Number,

  imageUrl: String,

  status: {
    type: String,
    enum: ['available', 'sold'],
    default: 'available'
  },

  catalogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Catalog'
  },

  history: [
    {
      from: String,

      to: String,

      changedAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, {
  timestamps: true
});

module.exports = mongoose.model(
  'Design',
  DesignSchema
);