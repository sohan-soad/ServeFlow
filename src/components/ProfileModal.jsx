import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { X, Upload, Camera } from 'lucide-react';

export default function ProfileModal({ isOpen, onClose }) {
  const { currentUser } = useAuth();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [photoFile, setPhotoFile] = useState(null);
  const [previewURL, setPreviewURL] = useState(currentUser?.photoURL || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !currentUser) return null;

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPreviewURL(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      let photoURL = currentUser.photoURL;

      if (photoFile) {
        const storageRef = ref(storage, `profiles/${currentUser.uid}/${photoFile.name}`);
        const snapshot = await uploadBytes(storageRef, photoFile);
        photoURL = await getDownloadURL(snapshot.ref);
      }

      await updateProfile(auth.currentUser, {
        displayName: displayName.trim(),
        photoURL: photoURL
      });

      // Update the user document in Firestore so admins see it too
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        photoURL: photoURL
      });

      // Force a re-render or reload if necessary, but Firebase handles auth changes somewhat natively
      window.location.reload(); // Simple way to ensure all components catch the updated profile
      
    } catch (err) {
      console.error(err);
      setError('Failed to update profile. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="glass-card animate-slide-up" style={{ width: '90%', maxWidth: '400px', position: 'relative', padding: '2rem' }}>
        <button 
          onClick={onClose} 
          className="btn btn-secondary" 
          style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.4rem', borderRadius: '50%', border: 'none' }}
        >
          <X size={18} />
        </button>
        
        <h3 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Edit Profile</h3>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '100px', height: '100px', 
            borderRadius: '50%', 
            backgroundColor: 'var(--bg-secondary)',
            backgroundImage: previewURL ? `url(${previewURL})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px dashed var(--border-color)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {!previewURL && <Camera size={32} color="var(--text-secondary)" />}
            
            <label style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              color: 'white', fontSize: '0.75rem',
              textAlign: 'center', padding: '0.25rem 0',
              cursor: 'pointer'
            }}>
              Change
              <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Full Name</label>
          <input 
            type="text" 
            className="input-field" 
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="John Doe"
          />
        </div>

        <button 
          className="btn btn-primary" 
          style={{ width: '100%', marginTop: '1rem' }} 
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
