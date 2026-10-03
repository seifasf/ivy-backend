const express = require('express');
const helmet = require('helmet');
const app = express();
app.use(express.json());
require("dotenv").config();
const cors = require('cors');
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
    credentials: true
  }));

app.use(helmet());
const mongoose = require('mongoose');
const url = process.env.MONGO_URL;

// MongoDB connection with better error handling and timeout
if (!url) {
    console.error("❌ MONGO_URL is not set in .env file!");
    process.exit(1);
}

console.log("🔄 Attempting to connect to MongoDB...");
mongoose.connect(url, {
    serverSelectionTimeoutMS: 30000, // 30 seconds
    socketTimeoutMS: 45000, // 45 seconds
    connectTimeoutMS: 30000, // 30 seconds
    retryWrites: true,
    w: 'majority'
}).then(()=>{
    console.log("✅ Connected to MongoDB - IVY Database");
    console.log("📊 Database:", url.split('/').pop().split('?')[0]);
}).catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    console.error("🔍 Connection string:", url.replace(/:[^:@]+@/, ':****@')); // Hide password
    console.error("💡 Please check:");
    console.error("   1. MongoDB Atlas Network Access - Add your IP or 0.0.0.0/0");
    console.error("   2. Database user password is correct");
    console.error("   3. Connection string in .env file");
    console.error("   4. Internet connection is working");
});

// Import routes
const productRoutes = require('./routes/product.route');
app.use('/api/products', productRoutes);

const galleryRoutes = require('./routes/gallery.route');
app.use('/api/gallery', galleryRoutes);

const contactRoutes = require('./routes/contact.route');
app.use('/api/contact', contactRoutes);

const businessRoutes = require('./routes/business.route');
app.use('/api/business', businessRoutes);

const customizeRoutes = require('./routes/customize.route');
app.use('/api/customize', customizeRoutes);

const userRoutes = require('./routes/user.route');
app.use('/api/users', userRoutes);

const adminRoutes = require('./routes/admin.route');
app.use('/api/admin', adminRoutes);

const checkoutRoutes = require('./routes/checkout.route');
app.use('/api/checkout', checkoutRoutes);

const shippingRoutes = require('./routes/shipping.route');
app.use('/api/shipping', shippingRoutes);

const promoCodeRoutes = require('./routes/promocode.route');
app.use('/api/promocodes', promoCodeRoutes);

const dashboardRoutes = require('./routes/dashboard.route');
app.use('/api/dashboard', dashboardRoutes);

const governorateShippingRoutes = require('./routes/governorate-shipping.route');
app.use('/api/governorate-shipping', governorateShippingRoutes);

const settingsRoutes = require('./routes/settings.route');
app.use('/api/settings', settingsRoutes);

// Health check endpoint (no MongoDB required)
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Welcome to IVY E-commerce Backend API',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });  
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        server: 'running',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Serve uploaded images
app.use('/uploads', express.static('uploads')); 

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`IVY Backend Server is running on port ${PORT}`);
});
