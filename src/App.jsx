import { useEffect, useState } from 'react';

import { getSession } from './api';
import AuthPage from './AuthPage';
import ChatPage from './ChatPage';

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    getSession()
      .then(({ user: sessionUser }) => setUser(sessionUser))
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) {
    return <main className='grid min-h-screen place-items-center text-[#176b57]'>Memuatkan…</main>;
  }

  if (!user) return <AuthPage onLogin={setUser} />;

  return <ChatPage user={user} onLogout={() => setUser(null)} />;
}
