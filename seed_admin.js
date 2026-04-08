const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./backend/models/User");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '.env') });

const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/exam_platform";

const seedHeadAdmin = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB.");

    const email = "basantbhushan89@gmail.com";
    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      console.log(`Head Admin ${email} already exists! Aborting.`);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("SuperSecretAdminPassword123!", 10);

    const admin = await User.create({
      name: "Basant Bhushan",
      email: email,
      password: hashedPassword,
      role: "head_admin",
    });

    console.log("SUCCESS! Securely injected the Root Head Admin.");
    console.log("-----------------------------------------");
    console.log(`Email: ${admin.email}`);
    console.log(`Role:  ${admin.role}`);
    console.log(`Pass:  SuperSecretAdminPassword123!`);
    console.log("-----------------------------------------");
    console.log("You can now login and immediately change this password.");
    
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed Head Admin:", error);
    process.exit(1);
  }
};

seedHeadAdmin();
