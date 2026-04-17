const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB. Dropping database for a clean slate...');
    
    // Drop the entire database
    await mongoose.connection.db.dropDatabase();
    console.log('Database dropped successfully.');

    // Seed test users
    const usersToCreate = [
      { name: 'Demo Student', email: 'student@test.com', passwordPlain: 'student123', role: 'student' },
      { name: 'Demo Teacher', email: 'teacher@test.com', passwordPlain: 'teacher123', role: 'teacher' },
      { name: 'Basant Bhushan', email: 'basantbhushan89@gmail.com', passwordHash: '$2a$10$ElPm7lfPoMpN8nOD2o8FGui1YXiD8fATJchvVJfBS7Bmb0N5mjrjC', role: 'head_admin' }
    ];

    for (const user of usersToCreate) {
      const hashedPassword = user.passwordHash || await bcrypt.hash(user.passwordPlain, 10);
      await mongoose.connection.collection('users').insertOne({
        name: user.name,
        email: user.email,
        password: hashedPassword,
        role: user.role,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`Created ${user.role}: ${user.email} / ${user.passwordPlain || '[SECURELY HASHED]'}`);
    }

    console.log('Clean slate ready! You can now log in with the new demo accounts.');
  } catch (error) {
    console.error('Error setting up clean slate:', error);
  } finally {
    process.exit(0);
  }
}

run();
