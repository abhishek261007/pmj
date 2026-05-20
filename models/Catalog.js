const mongoose = require('mongoose');

const CatalogSchema = new mongoose.Schema({
  name: String,
  description: String,
}, {
  timestamps: true
});

module.exports = mongoose.model('Catalog', CatalogSchema);
