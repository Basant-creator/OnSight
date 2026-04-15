const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const password = await bcrypt.hash('student123', 10);
  await mongoose.connection.collection('users').updateOne(
    { email: 'student@test.com' },
    { $set: { name: 'Student Test', password: password, role: 'student' } },
    { upsert: true }
  );
  console.log('Student created');
  process.exit(0);
}
run();
