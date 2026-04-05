import { useState, useEffect } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import PortailChauffeur from './PortailChauffeur';

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (saved && token) setUser(JSON.parse(saved));
  }, []);

  function handleLogin(u) { setUser(u); }
  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  if (!user) return <Login onLogin={handleLogin} />;
  if (user.role === 'chauffeur') return <PortailChauffeur user={user} onLogout={handleLogout} />;
  return <Dashboard user={user} onLogout={handleLogout} />;
}
