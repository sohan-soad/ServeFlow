const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendNotificationOnNewRequest = functions.firestore
  .document('requests/{requestId}')
  .onCreate(async (snap, context) => {
    const requestData = snap.data();

    // The message payload
    const payload = {
      notification: {
        title: 'New Request!',
        body: `${requestData.userEmail.split('@')[0]} requested: ${requestData.item}`,
      },
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // standard for some frameworks, capacitor handles it via intent
        requestId: context.params.requestId
      }
    };

    try {
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
        // Send notifications to all devices with tokens
        const response = await admin.messaging().sendToDevice(tokens, payload);
        console.log('Successfully sent notifications:', response);
      } else {
        console.log('No support staff tokens found.');
      }
      
      return null;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  });
