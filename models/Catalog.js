const mongoose = require('mongoose');

const CatalogSchema = new mongoose.Schema({
  name: { type: String, required: true },

  description: { type: String, default: '' },

  heroImageUrl: {
    type: String,
    default: '',
  },

  skuPrefix: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },

  nextSkuNumber: {
    type: Number,
    default: 1,
  },

}, { timestamps: true });

module.exports = mongoose.model('Catalog', CatalogSchema);