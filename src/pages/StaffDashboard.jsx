import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { Coffee, Droplets, LogOut, Send, CheckCircle2, Clock, Trash2, User } from 'lucide-react';
import ProfileModal from '../components/ProfileModal';

const QUICK_ITEMS = [
  { id: 'tea', name: 'Tea', icon: Coffee, color: '#f59e0b' },
  { id: 'coffee', name: 'Coffee', icon: Coffee, color: '#8b5cf6' },
  { id: 'water', name: 'Water', icon: Droplets, color: '#3b82f6' }
];

export default function StaffDashboard() {
  const { currentUser, logout } = useAuth();
  const [customRequest, setCustomRequest] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    
    // Removed orderBy to prevent the need for a composite index. 
    // We will sort manually in javascript below.
    const q = query(
      collection(db, 'requests'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort manually (Newest first)
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRequests(data);
    });

    return unsubscribe;
  }, [currentUser]);

  async function handleRequest(itemName) {
    if (!itemName.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'requests'), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        item: itemName,
        status: 'pending', // pending, served
        createdAt: new Date().toISOString(),
        userName: currentUser.displayName || null,
        userPhoto: currentUser.photoURL || null
      });
      setCustomRequest('');

      // Ping backend to send FCM Push Notification
      const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
      fetch(`${backendUrl}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: currentUser.email,
          item: itemName
        })
      }).catch(err => console.log('Backend Notification Ping failed:', err));

    } catch (err) {
      console.error(err);
      alert('Failed to send request');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        await deleteDoc(doc(db, 'requests', id));
      } catch (err) {
        console.error("Failed to delete request", err);
        alert('Failed to cancel order.');
      }
    }
  }

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            style={{ 
              border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
              width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden',
              backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={24} color="var(--text-secondary)" />
            )}
          </button>
          <div>
            <h3 style={{ marginBottom: '0.2rem' }}>Hi, {currentUser?.displayName || currentUser?.email?.split('@')[0]}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>What would you like today?</p>
          </div>
        </div>
        <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }} title="Logout">
          <LogOut size={18} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        {QUICK_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className="glass-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                border: 'none',
                cursor: 'pointer',
                padding: '1.25rem 0.5rem',
                transition: 'all 0.2s',
              }}
              onClick={() => handleRequest(item.name)}
              disabled={loading}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ 
                background: `${item.color}20`, 
                color: item.color,
                padding: '0.75rem', 
                borderRadius: '50%' 
              }}>
                <Icon size={28} />
              </div>
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.name}</span>
            </button>
          )
        })}
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem' }}>
        <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Custom Request</h4>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="e.g. Green tea with lemon"
            value={customRequest}
            onChange={(e) => setCustomRequest(e.target.value)}
            style={{ marginBottom: 0 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRequest(customRequest);
            }}
          />
          <button 
            className="btn btn-primary" 
            style={{ padding: '0 1.25rem' }}
            onClick={() => handleRequest(customRequest)}
            disabled={!customRequest.trim() || loading}
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Today's Requests</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingBottom: '2rem' }}>
          {requests.map(req => (
            <div key={req.id} className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.2rem' }}>{req.item}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {req.status === 'served' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--success)', fontSize: '0.875rem', fontWeight: 500 }}>
                    <CheckCircle2 size={16} /> Served
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--warning)', fontSize: '0.875rem', fontWeight: 500 }}>
                      <Clock size={16} /> Pending
                    </div>
                    <button 
                      onClick={() => handleDelete(req.id)}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem', color: 'var(--danger)', border: 'none', background: 'rgba(239, 68, 68, 0.1)' }}
                      title="Cancel Order"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {requests.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2rem' }}>
              No requests today.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
