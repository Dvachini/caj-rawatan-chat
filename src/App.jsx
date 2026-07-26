import { useEffect, useRef, useState } from 'react';

const suggestions = ['Caj pesakit luar warga asing?', 'Berapa caj gigi palsu?', 'Pengecualian penderma darah?'];
const welcome = { role: 'assistant', text: 'Tanya tentang caj rawatan. Sumber rasmi diberi keutamaan.' };

function Auth({ onLogin }) {
  const invite = new URLSearchParams(location.search).get('invite');
  const [register, setRegister] = useState(Boolean(invite));
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const path = register ? '/api/auth/register' : '/api/auth/login';
    const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...data, invite }) });
    const body = await response.json();
    if (!response.ok) return setError(body.error);
    if (register) {
      setRegister(false);
      history.replaceState({}, '', location.pathname);
      return;
    }
    onLogin(body.user);
  }

  return (
    <main className='auth-shell'>
      <form className='auth-card' onSubmit={submit}>
        <div className='brand-mark'>CR</div>
        <h1>{register ? 'Daftar akaun' : 'Log masuk'}</h1>
        <p>{register ? 'Gunakan jemputan untuk cipta akaun.' : 'Akses rujukan caj rawatan.'}</p>
        <label>E-mel<input name='email' type='email' autoComplete='email' required /></label>
        <label>Kata laluan<input name='password' type='password' minLength='12' autoComplete={register ? 'new-password' : 'current-password'} required /></label>
        {error && <p className='auth-error'>{error}</p>}
        <button type='submit'>{register ? 'Daftar' : 'Log masuk'}</button>
      </form>
    </main>
  );
}

function Chat({ user, onLogout }) {
  const [messages, setMessages] = useState([welcome]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const abortRef = useRef();

  async function loadConversations() {
    const response = await fetch('/api/conversations');
    if (response.ok) setConversations((await response.json()).conversations);
  }
  useEffect(() => { loadConversations(); }, []);

  async function openConversation(id) {
    const response = await fetch(`/api/conversations/${id}`);
    if (!response.ok) return;
    const { conversation } = await response.json();
    setConversationId(id);
    setMessages(conversation.messages.map((message) => ({ role: message.role, text: message.content, sources: message.sources })));
  }

  async function sendMessage(text = question) {
    const clean = text.trim();
    if (!clean || loading) return;
    setQuestion(''); setLoading(true);
    setMessages((current) => [...current, { role: 'user', text: clean }, { role: 'assistant', text: '', sources: [] }]);
    abortRef.current = new AbortController();
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: clean, conversationId }), signal: abortRef.current.signal });
      if (!response.ok) throw new Error((await response.json()).error || 'Permintaan gagal.');
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const lines = buffer.split('\n'); buffer = lines.pop();
        for (const line of lines) {
          if (!line) continue; const event = JSON.parse(line);
          setMessages((current) => current.map((message, index) => index !== current.length - 1 ? message : event.type === 'token' ? { ...message, text: message.text + event.value } : event.type === 'done' ? { ...message, ...event } : message));
        }
        if (done) break;
      }
      await loadConversations();
    } catch (error) {
      if (error.name !== 'AbortError') setMessages((current) => [...current.slice(0, -1), { role: 'error', text: error.message }]);
    } finally { setLoading(false); }
  }

  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); onLogout(); }

  return (
    <main className='shell'>
      <header><div className='brand-mark'>CR</div><div><h1>Caj Rawatan</h1><p>{user.email}</p></div><button className='link-button' onClick={logout}>Log keluar</button></header>
      <div className='workspace'>
        <aside><button onClick={() => { setConversationId(null); setMessages([welcome]); }}>+ Perbualan baharu</button>{conversations.map((item) => <button className='history-item' key={item.id} onClick={() => openConversation(item.id)}>{item.title}</button>)}</aside>
        <section className='chat' aria-live='polite'>{messages.map((message, index) => <article className={`message ${message.role}`} key={index}><span className='role'>{message.role === 'user' ? 'Anda' : 'Rujukan'}</span><p>{message.text}</p>{message.sources?.length > 0 && <ul className='sources'>{message.sources.map((source, i) => <li key={i}>{source.label}</li>)}</ul>}{message.status === 'experiential' && <small>Bukan ketetapan rasmi. Sahkan sebelum kutipan.</small>}{message.fallback && <small>Petikan sumber dipaparkan terus.</small>}</article>)}{loading && <p className='thinking'>Menyemak sumber…</p>}</section>
      </div>
      {messages.length === 1 && <nav className='suggestions'>{suggestions.map((item) => <button key={item} onClick={() => sendMessage(item)}>{item}</button>)}</nav>}
      <form onSubmit={(event) => { event.preventDefault(); sendMessage(); }}><div className='composer'><textarea maxLength='2000' placeholder='Tulis soalan caj rawatan…' rows='2' value={question} onChange={(event) => setQuestion(event.target.value)} />{loading ? <button className='stop' type='button' onClick={() => abortRef.current?.abort()}>Henti</button> : <button disabled={!question.trim()}>Hantar</button>}</div><small>Jangan masukkan maklumat peribadi pesakit.</small></form>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);
  useEffect(() => { fetch('/api/auth/session').then((response) => response.json()).then((body) => setUser(body.user)).catch(() => setUser(null)); }, []);
  if (user === undefined) return <main className='loading'>Memuatkan…</main>;
  return user ? <Chat user={user} onLogout={() => setUser(null)} /> : <Auth onLogin={setUser} />;
}
