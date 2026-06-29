const admin = require('firebase-admin');

let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
} catch (e) {
  console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT", e);
}

// Prevent re-initialization on hot reload
if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    admin.initializeApp();
  }
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
};
