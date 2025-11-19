/**
 * Quick test script for IMAP connection
 * Creates a test user and tests IMAP endpoint
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Load environment variables
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/commhub')
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    // Import models after connection
    const { User } = require('./dist/models/user');

    // Create or find test user
    let testUser = await User.findOne({ email: 'romain@villaume.fr' });

    if (!testUser) {
      testUser = await User.create({
        email: 'romain@villaume.fr',
        displayName: 'Romain Villaume',
        subscriptionTier: 'premium',
        connectedAccounts: [],
        preferences: {
          notifications: {
            enabled: true,
            email: true,
            push: false
          },
          quietHours: {
            enabled: false,
            start: '22:00',
            end: '08:00'
          },
          dataRetention: {
            messages: 365,
            analytics: 180
          }
        }
      });
      console.log('✅ Created test user:', testUser.email);
    } else {
      console.log('✅ Found existing user:', testUser.email);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: testUser._id.toString(), email: testUser.email },
      process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
      { expiresIn: '7d', issuer: 'ai-communication-hub', audience: 'api' }
    );

    console.log('\n🔑 JWT Token generated:');
    console.log(token);

    // Test IMAP connection
    console.log('\n🧪 Testing IMAP connection...\n');

    const fetch = require('node-fetch');

    try {
      const response = await fetch('http://localhost:3002/api/v1/accounts/imap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: 'romain@villaume.fr',
          password: '{8zX4Yr3g@',
          host: 'imap.mail.ovh.net',
          port: 993,
          secure: true
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ IMAP Connection Successful!');
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log('❌ IMAP Connection Failed:');
        console.log(JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.error('❌ Error testing IMAP:', error.message);
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
