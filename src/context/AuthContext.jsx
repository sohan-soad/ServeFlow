import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch role from Firestore
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserRole(docSnap.data().role);
          
          // FCM Token Logic
          if (Capacitor.isNativePlatform()) {
            // Android Native
            try {
              const perm = await FirebaseMessaging.requestPermissions();
              if (perm.receive === 'granted') {
                const { token } = await FirebaseMessaging.getToken();
                if (token) {
                  await updateDoc(docRef, { fcmToken: token });
                }
              }
            } catch (err) {
              console.log("FCM Native Setup Error:", err);
            }
          } else {
            // Web Push
            try {
              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                const { getToken } = await import('firebase/messaging');
                const { messaging } = await import('../firebase');
                const token = await getToken(messaging, { 
                  vapidKey: 'fc_nG6lF1fhSJxtLHXmz3A5KhAz4vaVnVjK65YVoxLU' 
                });
                if (token) {
                  await updateDoc(docRef, { fcmToken: token });
                }
              }
            } catch (err) {
              console.log("FCM Web Setup Error:", err);
            }
          }
        } else {
          setUserRole('staff'); // fallback
        }
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    currentUser,
    userRole,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
