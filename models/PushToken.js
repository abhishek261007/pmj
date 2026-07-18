const mongoose = require('mongoose');

const PushTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PushToken', PushTokenSchema);
