import { useState, useEffect } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import PortailChauffeur from './PortailChauffeur';
import ConsultationPage from './ConsultationPage';

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

  // Détection route /consultation/:token
  const path = window.location.pathname;
  const consultMatch = path.match(/^\/consultation\/(.+)$/);
  if (consultMatch) {
    const token = consultMatch[1];
    return (
      <ConsultationPage
        token={token}
        user={user}
        onLoginRequest={() => {
          // Stocker la destination dans sessionStorage pour rediriger après login
          sessionStorage.setItem('redirect_after_login', path);
          window.location.href = '/';
        }}
      />
    );
  }

  if (!user) return <Login onLogin={(u) => {
    handleLogin(u);
    // Redirection après login si on vient d'une consultation
    const redirect = sessionStorage.getItem('redirect_after_login');
    if (redirect) {
      sessionStorage.removeItem('redirect_after_login');
      window.location.href = redirect;
    }
  }} />;

  if (user.role === 'chauffeur') return <PortailChauffeur user={user} onLogout={handleLogout} />;
  return <Dashboard user={user} onLogout={handleLogout} />;
}
