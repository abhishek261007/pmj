const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');

/*
|--------------------------------------------------------------------------
| POST /customers/register  — public (called by the customer app)
| Creates a customer record and returns a non-expiring JWT.
|--------------------------------------------------------------------------
*/
router.post('/register', async (req, res) => {
  try {
    const { name, shopName, contactNumber, shopPhoneNumber, email, pushToken } = req.body;

    if (!name || !shopName || !contactNumber || !shopPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Name, shop name, contact number, and shop phone number are required',
      });
    }

    // Check if a customer with this contact number already exists
    let customer = await Customer.findOne({ contactNumber });

    if (customer) {
      // Update existing record
      customer.name = name;
      customer.shopName = shopName;
      customer.shopPhoneNumber = shopPhoneNumber;
      if (email !== undefined) customer.email = email;
      if (pushToken) customer.pushToken = pushToken;
      await customer.save();
    } else {
      customer = await Customer.create({
        name,
        shopName,
        contactNumber,
        shopPhoneNumber,
        email: email || null,
        pushToken: pushToken || null,
      });
    }

    // Also register the push token globally so Broadcast mode finds it
    if (pushToken) {
      const PushToken = require('../models/PushToken');
      await PushToken.findOneAndUpdate(
        { token: pushToken },
        {},
        { upsert: true, new: true }
      );
    }

    // Non-expiring JWT (no expiresIn set)
    const token = jwt.sign(
      { id: customer._id, type: 'customer' },
      process.env.JWT_SECRET
    );

    res.json({
      success: true,
      token,
      customer: {
        _id: customer._id,
        name: customer.name,
        shopName: customer.shopName,
        contactNumber: customer.contactNumber,
        shopPhoneNumber: customer.shopPhoneNumber,
        email: customer.email,
      },
    });
  } catch (err) {
    console.error('POST /customers/register error:', err);
    res.status(500).json({ success: false, message: 'Failed to register customer' });
  }
});

/*
|--------------------------------------------------------------------------
| GET /customers  — admin only
| Returns all registered customers.
|--------------------------------------------------------------------------
*/
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    console.error('GET /customers error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch customers' });
  }
});

/*
|--------------------------------------------------------------------------
| GET /customers/:id  — admin only
|--------------------------------------------------------------------------
*/
router.get('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json(customer);
  } catch (err) {
    console.error('GET /customers/:id error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch customer' });
  }
});

module.exports = router;
