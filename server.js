require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');

const Order = require('./models/Order');

const app = express();

app.set('trust proxy', 1);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

app.set('io', io);

app.use(cors({
  origin: '*',
}));

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300
  })
);

app.use(
  express.json({
    limit: '10mb'
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb'
  })
);

app.use(
  '/uploads',
  express.static('uploads', {
    setHeaders: (res) => {
      res.set(
        'Access-Control-Allow-Origin',
        '*'
      );

      res.set(
        'Cross-Origin-Resource-Policy',
        'cross-origin'
      );

      res.set(
        'Cache-Control',
        'public, max-age=14400'
      );
    }
  })
);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Mongo Connected');
  })
  .catch((err) => {
    console.log(err);
  });

app.use(
  '/auth',
  require('./routes/auth')
);

app.use(
  '/catalogs',
  require('./routes/catalogs')
);

app.use(
  '/designs',
  require('./routes/designs')
);

app.use(
  '/orders',
  require('./routes/orders')
);

app.use(
  '/public',
  require('./routes/public')
);

app.use(
  '/inquiries', // <-- Changed this from '/inquiryRoutes'
  require('./routes/inquiries')
);

io.on('connection', () => {
  console.log('Socket connected');
});

/*
|--------------------------------------------------------------------------
| PARTIAL ORDER FULFILLMENT
|--------------------------------------------------------------------------
*/// Force Render rebuild for multer stream fix

app.patch(
  '/orders/:orderId/item/:itemId',
  async (req, res) => {
    try {
      const {
        orderId,
        itemId
      } = req.params;

      const { status } =
        req.body;

      if (
        ![
          'pending',
          'fulfilled',
          'cancelled'
        ].includes(status)
      ) {
        return res
          .status(400)
          .json({
            error:
              'Invalid status'
          });
      }

      const order =
        await Order.findById(
          orderId
        );

      if (!order) {
        return res
          .status(404)
          .json({
            error:
              'Order not found'
          });
      }

      const item =
        order.items.find(
          (i) =>
            i._id.toString() ===
            itemId
        );

      if (!item) {
        return res
          .status(404)
          .json({
            error:
              'Item not found'
          });
      }

      item.orderStatus =
        status;

      const allFulfilled =
        order.items.every(
          (i) =>
            i.orderStatus ===
            'fulfilled'
        );

      const allCancelled =
        order.items.every(
          (i) =>
            i.orderStatus ===
            'cancelled'
        );

      const someProcessed =
        order.items.some(
          (i) =>
            i.orderStatus ===
              'fulfilled' ||
            i.orderStatus ===
              'cancelled'
        );

      if (allFulfilled) {
        order.status =
          'fulfilled';

      } else if (
        allCancelled
      ) {
        order.status =
          'cancelled';

      } else if (
        someProcessed
      ) {
        order.status =
          'partial';

      } else {
        order.status =
          'pending';
      }

      await order.save();

      io.emit(
        'orderUpdated',
        order
      );

      res.json(order);

    } catch (err) {
      console.log(err);

      res.status(500).json({
        error:
          'Could not update order item'
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
*/

app.get('/health', (_, res) => {
  res.json({
    success: true,
    status: 'running'
  });
});

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});