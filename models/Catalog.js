const mongoose = require('mongoose');

const CatalogSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  description:   { type: String, default: '' },

  // e.g. "PM", "SLV-A" — set once at creation, never changed
  skuPrefix:     { type: String, required: true, uppercase: true, trim: true },

  // Auto-incrementing counter; always points to the NEXT available number
  nextSkuNumber: { type: Number, default: 1 },

}, { timestamps: true });

module.exports = mongoose.model('Catalog', CatalogSchema);