const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');

router.post('/register', async (req, res) => {
  const { name, username, password, role } = req.body;

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    username,
    passwordHash,
    role
  });

  res.json(user);
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });

  if (!user) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({
    id: user._id,
    role: user.role
  }, process.env.JWT_SECRET);

  res.json({
    token,
    user
  });
});

module.exports = router;
