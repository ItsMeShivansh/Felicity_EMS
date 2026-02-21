const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Participant = require('./models/Participant');

require('dotenv').config();

const seedAdmin = async() => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');

    // Check is admin already exists
    const existingAdmin = await Participant.findOne({ email: "admin@felicity.iiit.ac.in" });
    if(existingAdmin) {
      console.log("Admin user already exists.");
      process.exit(0);
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("admin@123", salt);

    // Create Admin
    const adminUser = new Participant({
      firstName: "Admin",
      lastName: "User",
      email: "admin@felicity.iiit.ac.in",
      password: hashedPassword,
      type: "IIIT",
      contactNumber: "9999999999"
    });

    await adminUser.save();
    console.log("Admin created successfully!");
    process.exit(0);
  } catch (e) {
    console.error("Error seeding admin:", e.message);
    process.exit(1);
  }
};

seedAdmin();