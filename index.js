require("dotenv").config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const mongoose = require('mongoose');
const { serveImage, LEGACY_DIR } = require('./utils/images');
const { apiLimiter } = require('./middleware/rateLimits');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Render (and most hosts) sit behind one proxy; needed for correct client IPs in rate limiting
app.set('trust proxy', 1);
app.disable('x-powered-by');

// FRONTEND_URL may hold several origins separated by commas
const frontendOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

app.use(cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      ...frontendOrigins
    ],
    credentials: true,
    maxAge: 86400
  }));

// Images are loaded by the storefront from another origin
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));

const url = process.env.MONGO_URL;
if (!url) {
    console.error("❌ MONGO_URL is not set in .env file!");
    process.exit(1);
}

const connectWithRetry = async (attempt = 1) => {
    try {
        console.log(`🔄 Connecting to MongoDB (attempt ${attempt})...`);
        await mongoose.connect(url, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
        });
        console.log("✅ Connected to MongoDB - IVY Database");
        console.log("📊 Database:", mongoose.connection.name);
    } catch (err) {
        const delay = Math.min(30000, 2000 * attempt);
        console.error(`❌ MongoDB connection error: ${err.message}. Retrying in ${delay / 1000}s`);
        setTimeout(() => connectWithRetry(attempt + 1), delay);
    }
};
connectWithRetry();

const dbStatus = () => (mongoose.connection.readyState === 1 ? 'connected' : 'disconnected');

app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Welcome to IVY E-commerce Backend API',
        mongodb: dbStatus(),
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', (req, res) => {
    const healthy = dbStatus() === 'connected';
    res.status(healthy ? 200 : 503).json({
        status: healthy ? 'ok' : 'degraded',
        server: 'running',
        mongodb: dbStatus(),
        timestamp: new Date().toISOString()
    });
});

// Images live in MongoDB (GridFS); the local folder only holds files uploaded before that change
app.get('/uploads/:filename', serveImage);
app.use('/uploads', express.static(LEGACY_DIR, { maxAge: '365d', immutable: true }));

app.use('/api', apiLimiter);

app.use('/api/products', require('./routes/product.route'));
app.use('/api/gallery', require('./routes/gallery.route'));
app.use('/api/contact', require('./routes/contact.route'));
app.use('/api/business', require('./routes/business.route'));
app.use('/api/customize', require('./routes/customize.route'));
app.use('/api/users', require('./routes/user.route'));
app.use('/api/admin', require('./routes/admin.route'));
app.use('/api/checkout', require('./routes/checkout.route'));
app.use('/api/shipping', require('./routes/shipping.route'));
app.use('/api/promocodes', require('./routes/promocode.route'));
app.use('/api/dashboard', require('./routes/dashboard.route'));
app.use('/api/governorate-shipping', require('./routes/governorate-shipping.route'));
app.use('/api/settings', require('./routes/settings.route'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
    console.log(`IVY Backend Server is running on port ${PORT}`);
});

const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => mongoose.connection.close(false).finally(() => process.exit(0)));
    setTimeout(() => process.exit(0), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
