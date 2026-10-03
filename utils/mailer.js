const nodemailer = require("nodemailer");

let transporter;

const sendEmail = async (to, subject, text) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    const err = new Error("Email is not configured on the server. Please contact the store.");
    err.status = 503;
    throw err;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
  await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text });
};

module.exports = { sendEmail };
