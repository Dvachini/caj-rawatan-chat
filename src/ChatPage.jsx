import { useEffect, useRef, useState } from 'react';

import { getConversation, getConversations, logout } from './api';
import Message from './Message';

const suggestions = [
  'Caj pesakit luar warga asing?',
  'Berapa caj gigi palsu?',
  'Pengecualian penderma darah?',
];

const welcome = {
  role: 'assistant',
  text: 'Tanya tentang caj rawatan. Sumber rasmi diberi keutamaan.',
};

export default function ChatPage({ user, onLogout }) {
  const [messages, setMessages] = useState([welcome]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const abortRef = useRef();

  async function loadConversations() {
    try {
      const body = await getConversations();
      setConversations(body.conversations);
    } catch {
      setConversations([]);
    }
  }

  useEffect(() => {
    loadConversations();
  }, []);

  function startNewConversation() {
    setConversationId(null);
    setMessages([welcome]);
  }

  async function openConversation(id) {
    try {
      const { conversation } = await getConversation(id);
      setConversationId(id);
      setMessages(
        conversation.messages.map((message) => ({
          role: message.role,
          text: message.content,
          sources: message.sources,
        })),
      );
    } catch {
      setMessages([{ role: 'error', text: 'Perbualan tidak dapat dibuka.' }]);
    }
  }

  function updateLastMessage(event) {
    setMessages((current) =>
      current.map((message, index) => {
        if (index !== current.length - 1) return message;
        if (event.type === 'token') {
          return { ...message, text: message.text + event.value };
        }
        if (event.type === 'done') return { ...message, ...event };
        return message;
      }),
    );
  }

  async function readStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line) updateLastMessage(JSON.parse(line));
      }

      if (done) return;
    }
  }

  async function sendMessage(text = question) {
    const cleanQuestion = text.trim();
    if (!cleanQuestion || isLoading) return;

    setQuestion('');
    setIsLoading(true);
    setMessages((current) => [
      ...current,
      { role: 'user', text: cleanQuestion },
      { role: 'assistant', text: '', sources: [] },
    ]);
    abortRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: cleanQuestion, conversationId }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || 'Permintaan gagal.');
      }

      await readStream(response);
      await loadConversations();
    } catch (error) {
      if (error.name !== 'AbortError') {
        setMessages((current) => [
          ...current.slice(0, -1),
          { role: 'error', text: error.message },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    onLogout();
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage();
  }

  return (
    <main className='mx-auto grid min-h-screen w-full max-w-5xl grid-rows-[auto_1fr_auto_auto] border-x border-gray-200 bg-white'>
      <header className='flex items-center gap-3 border-b border-gray-200 px-4 py-4 sm:px-6'>
        <div className='grid h-11 w-11 place-items-center rounded-xl bg-[#176b57] font-bold text-white'>
          CR
        </div>
        <div>
          <h1 className='font-bold text-gray-900'>Caj Rawatan</h1>
          <p className='text-xs text-gray-500'>{user.email}</p>
        </div>
        <button
          className='ml-auto text-sm font-bold text-[#176b57]'
          type='button'
          onClick={handleLogout}
        >
          Log keluar
        </button>
      </header>

      <div className='grid min-h-0 grid-rows-[auto_1fr] sm:grid-cols-[220px_1fr] sm:grid-rows-1'>
        <aside className='flex gap-2 overflow-x-auto border-b border-gray-200 bg-[#f3f8f5] p-3 sm:flex-col sm:border-r sm:border-b-0'>
          <button
            className='shrink-0 rounded-lg bg-[#176b57] px-3 py-2 text-left text-sm font-bold text-white'
            type='button'
            onClick={startNewConversation}
          >
            + Perbualan baharu
          </button>
          {conversations.map((conversation) => (
            <button
              className='max-w-48 shrink-0 truncate rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs text-gray-700'
              key={conversation.id}
              type='button'
              onClick={() => openConversation(conversation.id)}
            >
              {conversation.title}
            </button>
          ))}
        </aside>

        <section className='flex min-h-0 flex-col gap-5 overflow-y-auto p-4 sm:p-6' aria-live='polite'>
          {messages.map((message, index) => (
            <Message key={`${message.role}-${index}`} message={message} />
          ))}
          {isLoading && <p className='text-sm text-[#176b57]'>Menyemak sumber…</p>}
        </section>
      </div>

      {messages.length === 1 && (
        <nav className='flex gap-2 overflow-x-auto px-4 pb-4 sm:px-6' aria-label='Cadangan soalan'>
          {suggestions.map((suggestion) => (
            <button
              className='shrink-0 rounded-full border border-[#bad0c8] bg-white px-3 py-2 text-sm text-[#175846]'
              key={suggestion}
              type='button'
              onClick={() => sendMessage(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </nav>
      )}

      <form className='border-t border-gray-200 p-4 sm:px-6' onSubmit={handleSubmit}>
        <div className='flex items-end gap-2 rounded-2xl border border-gray-300 bg-white p-2 focus-within:border-[#176b57]'>
          <textarea
            className='min-h-12 flex-1 resize-none p-2 outline-none'
            maxLength='2000'
            placeholder='Tulis soalan caj rawatan…'
            rows='2'
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          {isLoading ? (
            <button
              className='rounded-xl bg-red-700 px-4 py-2.5 font-bold text-white'
              type='button'
              onClick={() => abortRef.current?.abort()}
            >
              Henti
            </button>
          ) : (
            <button
              className='rounded-xl bg-[#176b57] px-4 py-2.5 font-bold text-white disabled:opacity-40'
              disabled={!question.trim()}
              type='submit'
            >
              Hantar
            </button>
          )}
        </div>
        <small className='mt-2 block text-xs text-gray-500'>
          Jangan masukkan maklumat peribadi pesakit.
        </small>
      </form>
    </main>
  );
}
