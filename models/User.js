const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: String,
  username: {
    type: String,
    unique: true,
  },
  passwordHash: String,
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
