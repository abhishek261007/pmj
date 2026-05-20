const router = require('express').Router();

const Order = require('../models/Order');

const auth = require('../middleware/auth');

router.get('/', auth, async (_, res) => {
  try {
    const orders = await Order.find()
      .populate('items')
      .sort({ createdAt: -1 });

    res.json(orders);

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: 'Could not fetch orders'
    });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const order = await Order.create(req.body);

    req.app.get('io').emit(
      'order-created',
      order
    );

    res.json(order);

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: 'Could not create order'
    });
  }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('items');

    req.app.get('io').emit(
      'order-updated',
      order
    );

    res.json(order);

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: 'Could not update order'
    });
  }
});

module.exports = router;