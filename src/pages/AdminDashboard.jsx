import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, query, orderBy, limit } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { UserPlus, LogOut, Users, Activity, Clock, CheckCircle, TrendingUp, ShieldAlert, User } from 'lucide-react';
import ProfileModal from '../components/ProfileModal';

export default function AdminDashboard() {
  const { currentUser, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // User creation states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Listen to all users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen to all requests (limit to last 100 for performance)
    const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'), limit(100));
    const unsubRequests = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubUsers();
      unsubRequests();
    };
  }, []);

  async function handleCreateUser(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const primaryApp = getAuth().app;
      const secondaryApp = initializeApp(primaryApp.options, 'SecondaryApp');
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUser = userCredential.user;

      await setDoc(doc(db, 'users', newUser.uid), {
        email: newUser.email,
        role: role,
        createdAt: new Date().toISOString()
      });

      await secondaryAuth.signOut();
      
      setSuccess(`User ${email} created as ${role}!`);
      setEmail('');
      setPassword('');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to create user: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Calculate Metrics
  const totalRequests = requests.length;
  const pendingRequests = requests.filter(r => r.status === 'pending').length;
  const servedRequests = requests.filter(r => r.status === 'served').length;
  
  // Calculate most popular item
  const itemCounts = requests.reduce((acc, req) => {
    acc[req.item] = (acc[req.item] || 0) + 1;
    return acc;
  }, {});
  let popularItem = 'N/A';
  let maxCount = 0;
  for (const [item, count] of Object.entries(itemCounts)) {
    if (count > maxCount) {
      maxCount = count;
      popularItem = item;
    }
  }

  const MetricCard = ({ title, value, icon: Icon, color }) => (
    <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ background: `${color}20`, color: color, padding: '1rem', borderRadius: '50%' }}>
        <Icon size={24} />
      </div>
      <div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>{title}</div>
        <div style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  );

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '2rem' }}>
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={24} style={{ color: 'var(--accent-primary)' }} />
            Command Center
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Overview & Administration</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
          <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* METRICS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <MetricCard title="Total Orders" value={totalRequests} icon={Activity} color="#3b82f6" />
        <MetricCard title="Pending" value={pendingRequests} icon={Clock} color="#f59e0b" />
        <MetricCard title="Served" value={servedRequests} icon={CheckCircle} color="#10b981" />
        <MetricCard title="Top Item" value={popularItem} icon={TrendingUp} color="#8b5cf6" />
      </div>

      {/* MAIN CONTENT GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* LEFT COLUMN: LIVE FEED */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
            <Activity size={20} /> Live Operations
          </h3>
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '500px' }}>
            <div style={{ overflowY: 'auto', padding: '1rem' }}>
              {requests.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>No recent operations.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {requests.map(req => (
                    <div key={req.id} style={{ 
                      padding: '1rem', 
                      background: 'rgba(255,255,255,0.03)', 
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: `3px solid ${req.status === 'served' ? 'var(--success)' : 'var(--warning)'}`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{req.item}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {req.userEmail?.split('@')[0]} • {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: req.status === 'served' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: req.status === 'served' ? 'var(--success)' : 'var(--warning)'
                        }}>
                          {req.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: USER MANAGEMENT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* ADD USER */}
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', marginBottom: '1rem' }}>
              <UserPlus size={20} /> Add User
            </h3>
            <div className="glass-card">
              {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-sm)' }}>{error}</div>}
              {success && <div style={{ color: 'var(--success)', marginBottom: '1rem', fontSize: '0.875rem', padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-sm)' }}>{success}</div>}

              <form onSubmit={handleCreateUser}>
                <div className="input-group">
                  <label className="input-label">Email</label>
                  <input 
                    type="email" 
                    className="input-field" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Password</label>
                  <input 
                    type="password" 
                    className="input-field" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Role</label>
                  <select 
                    className="input-field" 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <option value="staff">Office Staff (Can request)</option>
                    <option value="support">Support Staff (Serves requests)</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button disabled={loading} type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  {loading ? 'Creating...' : 'Create User'}
                </button>
              </form>
            </div>
          </div>

          {/* USER LIST */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', marginBottom: '1rem' }}>
              <Users size={20} /> Directory ({users.length})
            </h3>
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, maxHeight: '300px' }}>
              <div style={{ overflowY: 'auto', padding: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {users.map(u => (
                    <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{u.email}</div>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '1rem',
                        backgroundColor: u.role === 'admin' ? 'rgba(59, 130, 246, 0.1)' : u.role === 'support' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                        color: u.role === 'admin' ? '#60a5fa' : u.role === 'support' ? '#a78bfa' : 'var(--text-secondary)'
                      }}>
                        {u.role.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
