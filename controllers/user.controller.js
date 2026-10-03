const User = require("../model/user.model");
const asyncWrapper = require("../middleware/asyncwrapper");
const bcrypt = require("bcrypt");
const genrateToken = require("../utils/genrateToken");
const { sendEmail } = require("../utils/mailer");


// Sign Up
const signup = asyncWrapper(async (req, res) => {
  const { fullName, email, phone, password } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: "Email already exists" });

  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ fullName, email, phone, password: hashed });
  await user.save();
  const token = await genrateToken({ id: user._id, email: user.email, role: "user" });
  res
    .status(201)
    .json({ token, user: { id: user._id, fullName, email, phone } });
});

// Login
const login = asyncWrapper(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Invalid credentials" });

  const token = await genrateToken({ id: user._id, email: user.email, role: "user" });
  res.json({
    token,
    user: { id: user._id, fullName: user.fullName, email, phone: user.phone },
  });
});

// Forgot Password (send code)
const forgotPassword = asyncWrapper(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetCode = code;
  user.resetCodeExpire = Date.now() + 15 * 60 * 1000; // 15 min
  await user.save();

  await sendEmail(
    email,
    "IVY Password Reset",
    `Hello,

We received a request to reset your account password at IVY.

Your password reset verification code is: ${code}

Please enter this code in the app to complete your password reset. This code is valid for 15 minutes.

If you did not request a password reset, please ignore this email.

Best regards,
IVY Team`
  );
  res.json({ message: "Reset code sent to your email" });
});

// Reset Password (with code)
const resetPassword = asyncWrapper(async (req, res) => {
  const { email, code, newPassword } = req.body;
  const user = await User.findOne({ email });
  if (!user || !user.resetCode || !user.resetCodeExpire) {
    return res.status(400).json({ message: "Invalid or expired code" });
  }
  if (user.resetCode !== code || user.resetCodeExpire < Date.now()) {
    return res.status(400).json({ message: "Invalid or expired code" });
  }
  user.password = await bcrypt.hash(newPassword, 10);
  user.resetCode = undefined;
  user.resetCodeExpire = undefined;
  await user.save();
  res.json({ message: "Password reset successfully" });
});

// Get All Users (protected)
const getAllUsers = asyncWrapper(async (req, res) => {
  const users = await User.find(
    {},
    {
      password: 0,
      resetCode: 0,
      resetCodeExpire: 0,
      __v: 0,
    }
  );
  res.json(users);
});

// Get User By ID (protected)
const getUserById = asyncWrapper(async (req, res) => {
  const user = await User.findById(req.params.id, {
    password: 0,
    resetCode: 0,
    resetCodeExpire: 0,
    __v: 0,
  });
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

// Delete User By ID (protected)
const deleteUser = asyncWrapper(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  await user.deleteOne();
  res.json({ message: "User deleted" });
});

// Verifies the Google ID token with Google so the client cannot claim someone else's email
const verifyGoogleCredential = async (credential) => {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
  );
  if (!response.ok) return null;
  const payload = await response.json();
  const expectedAudience = process.env.GOOGLE_CLIENT_ID;
  if (expectedAudience && payload.aud !== expectedAudience) return null;
  if (payload.email_verified !== true && payload.email_verified !== "true") return null;
  return payload;
};

// Google OAuth - Create or Login
const googleAuth = asyncWrapper(async (req, res) => {
  const { credential } = req.body;
  if (!credential || typeof credential !== "string") {
    return res.status(400).json({ message: "Missing Google credential" });
  }

  const payload = await verifyGoogleCredential(credential);
  if (!payload) {
    return res.status(401).json({ message: "Google sign-in could not be verified" });
  }

  const { sub: googleId, email, name, picture } = payload;

  // Check if user exists by email or googleId
  let user = await User.findOne({ 
    $or: [{ email }, { googleId }] 
  });

  if (user) {
    // Update user with Google info if not already set
    if (!user.googleId) {
      user.googleId = googleId;
      if (picture) user.picture = picture;
      await user.save();
    }
  } else {
    // Create new user with Google OAuth
    user = new User({
      fullName: name,
      email,
      googleId,
      picture: picture || '',
      password: undefined // No password for Google OAuth users
    });
    await user.save();
  }

  const token = await genrateToken({ id: user._id, email: user.email, role: "user" });
  res.json({
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      picture: user.picture || ''
    }
  });
});

// Get User Orders
const getUserOrders = asyncWrapper(async (req, res) => {
  const userId = req.decoded.id;
  const Checkout = require("../model/checkout.model");
  
  const orders = await Checkout.find({ userId }, { __v: 0 })
    .sort({ createdAt: -1 })
    .populate('items.productId', 'title mainImage')
    .lean();
  
  res.json(orders);
});

module.exports = {
  signup,
  login,
  forgotPassword,
  resetPassword,
  getAllUsers,
  getUserById,
  deleteUser,
  googleAuth,
  getUserOrders,
};
