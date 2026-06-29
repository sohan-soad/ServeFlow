const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Ensure you set the FIREBASE_SERVICE_ACCOUNT environment variable on Vercel/Render
// It should be the stringified JSON of your service account key.
// e.g. process.env.FIREBASE_SERVICE_ACCOUNT = '{"type": "service_account", ...}'
let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Local fallback for development
    serviceAccount = require('./service-account.json');
    console.log("Loaded local service account json!");
  }
} catch (e) {
  console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT", e);
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  // If no env var is found, we can try default initialization, 
  // which works if deployed on Google Cloud but usually fails on Vercel/Render without credentials.
  admin.initializeApp();
}

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/notify', async (req, res) => {
  try {
    const { userEmail, item } = req.body;

    if (!userEmail || !item) {
      return res.status(400).json({ error: 'Missing userEmail or item in body' });
    }

    const payload = {
      notification: {
        title: 'New Order Arrived!',
        body: `${userEmail.split('@')[0]} requested ${item}`
      }
    };

    // Find all users with role 'support' or 'admin' to notify them
    const usersRef = admin.firestore().collection('users');
    const supportQuery = await usersRef.where('role', 'in', ['support', 'admin']).get();
    
    const tokens = [];
    supportQuery.forEach((doc) => {
      const user = doc.data();
      if (user.fcmToken) {
        tokens.push(user.fcmToken);
      }
    });

    if (tokens.length > 0) {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: tokens,
        notification: payload.notification
      });
      console.log('Successfully sent notifications:', response);
      return res.status(200).json({ success: true, response });
    } else {
      console.log('No support staff tokens found.');
      return res.status(200).json({ success: true, message: 'No tokens to ping' });
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Standalone notification backend running on port ${PORT}`);
});
