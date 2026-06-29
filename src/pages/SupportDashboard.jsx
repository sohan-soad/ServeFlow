import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { LogOut, CheckCircle, Clock, User } from 'lucide-react';
import ProfileModal from '../components/ProfileModal';

export default function SupportDashboard() {
  const { currentUser, logout, userRole } = useAuth();
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('pending'); // pending, served, all
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    // Get all requests, ordered by newest first
    const q = query(
      collection(db, 'requests'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(data);
    });

    return unsubscribe;
  }, []);

  async function markAsServed(id) {
    try {
      await updateDoc(doc(db, 'requests', id), {
        status: 'served',
        servedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error updating document: ", err);
      alert('Failed to update status.');
    }
  }

  async function markAsPending(id) {
    try {
      await updateDoc(doc(db, 'requests', id), {
        status: 'pending',
        servedAt: null
      });
    } catch (err) {
      console.error("Error updating document: ", err);
      alert('Failed to revert status.');
    }
  }

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

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
            <h3 style={{ marginBottom: '0.2rem' }}>Live Queue</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Serve the office</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {userRole === 'admin' && (
            <div style={{ color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center' }}>ADMIN VIEW</div>
          )}
          <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => setFilter('pending')}
          className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', flex: 1 }}
        >
          Pending
        </button>
        <button 
          onClick={() => setFilter('served')}
          className={`btn ${filter === 'served' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', flex: 1 }}
        >
          Served
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredRequests.map(req => (
            <div 
              key={req.id} 
              className="glass-card" 
              style={{ 
                padding: '1.25rem', 
                borderLeft: `4px solid ${req.status === 'served' ? 'var(--success)' : 'var(--warning)'}` 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.25rem' }}>{req.item}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    For: <span style={{ color: 'var(--text-primary)' }}>{req.userEmail?.split('@')[0]}</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                  {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {req.status === 'pending' ? (
                <button 
                  onClick={() => markAsServed(req.id)}
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
                >
                  <CheckCircle size={18} /> Mark as Served
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.875rem', fontWeight: 500, justifyContent: 'center', padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-full)' }}>
                    <CheckCircle size={18} /> Served at {new Date(req.servedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <button 
                    onClick={() => markAsPending(req.id)}
                    className="btn btn-secondary" 
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.75rem' }}
                  >
                    Mistake? Revert to Pending
                  </button>
                </div>
              )}
            </div>
          ))}

          {filteredRequests.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2rem' }}>
              No {filter} requests right now.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
