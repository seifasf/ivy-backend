const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Import the Admin model
const Admin = require('./model/admin.model');

async function createAdmins() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Create admin 1: seif
    const admin1 = new Admin({
      fullName: 'seif',
      email: 'seif@ivy.com',
      phone: '01114692859',
      password: await bcrypt.hash('ivy1234', 10)
    });

    // Create admin 2: ayman
    const admin2 = new Admin({
      fullName: 'ayman',
      email: 'ayman@ivy.com',
      phone: '01126891394',
      password: await bcrypt.hash('ivy1234', 10)
    });

    // Create admin 3: test
    const admin3 = new Admin({
      fullName: 'test',
      email: 'test@ivy.com',
      phone: '01111111111',
      password: await bcrypt.hash('test1234', 10)
    });

    // Check if admins already exist
    const existingAdmin1 = await Admin.findOne({ email: 'seif@ivy.com' });
    const existingAdmin2 = await Admin.findOne({ email: 'ayman@ivy.com' });
    const existingAdmin3 = await Admin.findOne({ email: 'test@ivy.com' });

    if (existingAdmin1) {
      console.log('Admin seif already exists');
    } else {
      await admin1.save();
      console.log('Admin seif created successfully');
    }

    if (existingAdmin2) {
      console.log('Admin ayman already exists');
    } else {
      await admin2.save();
      console.log('Admin ayman created successfully');
    }

    if (existingAdmin3) {
      console.log('Admin test already exists');
    } else {
      await admin3.save();
      console.log('Admin test created successfully');
    }

    console.log('Admin creation process completed');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admins:', error);
    process.exit(1);
  }
}

createAdmins();
