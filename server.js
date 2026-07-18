require('dotenv').config();

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');

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
    max: 3000
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
  express.static(path.join(__dirname, 'uploads'), {
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
  '/public',
  require('./routes/public')
);

app.use(
  '/inquiries',
  require('./routes/inquiries')
);

app.use(
  '/campaigns',
  require('./routes/campaigns')
);

app.use(
  '/audit-logs',
  require('./routes/audit')
);

app.use(
  '/customers',
  require('./routes/customers')
);

app.use(
  '/config',
  require('./routes/config')
);

app.use('/', require('./routes/notifications'));

io.on('connection', () => {
  console.log('Socket connected');
});

// ── Deep link landing page ──
app.get('/c/:id', (req, res) => {
  const { id } = req.params;
  const webUrl = `https://pmjewellers.com/catalog/${id}/web`;
  const playUrl = 'https://play.google.com/store/apps/details?id=com.abhishek261007.pmj';

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>PM Jewellers</title>
  <meta http-equiv="refresh" content="2;url=${playUrl}">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#F5F4F2;color:#333}
    .c{text-align:center;padding:40px}
    h1{font-size:24px;margin-bottom:8px;color:#8C7355}
    p{color:#666;margin-bottom:12px}
    a{color:#8C7355}
  </style>
</head>
<body>
  <div class="c">
    <h1>PM Jewellers</h1>
    <p>Opening the app…</p>
    <p>If nothing happens, <a href="${playUrl}">install from Google Play</a></p>
    <p>Or <a href="${webUrl}">view in browser</a></p>
  </div>
</body>
</html>`);
});

app.get('/catalog/:id', (req, res) => {
  const { id } = req.params;
  res.redirect(`/c/${id}`);
});

app.get('/catalog/:id/web', (req, res) => {
  res.redirect(`https://pmjewellers.com/catalog/${req.params.id}?source=web`);
});

app.get('/health', (_, res) => {
  res.json({
    success: true,
    status: 'running'
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
