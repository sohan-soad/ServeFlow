importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAF_O2iQqb3tW0wnY4ETGqsb1qlYk7YueM",
  authDomain: "dev-experimental-b2d68.firebaseapp.com",
  projectId: "dev-experimental-b2d68",
  storageBucket: "dev-experimental-b2d68.firebasestorage.app",
  messagingSenderId: "162160839990",
  appId: "1:162160839990:web:9414a12392b61ff2b8f797",
  measurementId: "G-8X9EWW8DNJ"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
