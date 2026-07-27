import { logout } from './api';
import Message from './Message';
import useChat from './useChat';

const suggestions = [
  'Caj pesakit luar warga asing?',
  'Berapa caj gigi palsu?',
  'Pengecualian penderma darah?',
];

export default function ChatPage({ user, onLogout }) {
  const {
    messages,
    question,
    isLoading,
    conversations,
    abortRef,
    setQuestion,
    startNewConversation,
    openConversation,
    sendMessage,
  } = useChat();

  async function handleLogout() {
    await logout();
    onLogout();
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage();
  }

  return (
    <main className='mx-auto grid min-h-screen w-full max-w-6xl grid-rows-[auto_1fr_auto_auto] border-x-4 border-[#171717] bg-[#fffdf5]'>
      <header className='flex items-center gap-4 border-b-4 border-[#171717] bg-[#ffd84d] px-4 py-4 sm:px-6'>
        <div className='grid h-12 w-12 -rotate-3 place-items-center border-3 border-[#171717] bg-[#ff8fab] font-black shadow-[3px_3px_0_#171717]'>
          CR
        </div>
        <div>
          <h1 className='text-xl font-black uppercase tracking-tight'>Caj Rawatan</h1>
          <p className='text-xs font-bold'>{user.email}</p>
        </div>
        <button
          className='ml-auto border-3 border-[#171717] bg-white px-3 py-2 text-sm font-black shadow-[3px_3px_0_#171717] active:translate-x-1 active:translate-y-1 active:shadow-none'
          type='button'
          onClick={handleLogout}
        >
          Log keluar
        </button>
      </header>

      <div className='grid min-h-0 grid-rows-[auto_1fr] sm:grid-cols-[220px_1fr] sm:grid-rows-1'>
        <aside className='flex gap-3 overflow-x-auto border-b-4 border-[#171717] bg-[#78d6a3] p-3 sm:flex-col sm:border-r-4 sm:border-b-0'>
          <button
            className='shrink-0 border-3 border-[#171717] bg-[#ffd84d] px-3 py-2 text-left text-sm font-black shadow-[3px_3px_0_#171717] active:translate-x-1 active:translate-y-1 active:shadow-none'
            type='button'
            onClick={startNewConversation}
          >
            + Perbualan baharu
          </button>

          {conversations.map((conversation) => (
            <button
              className='max-w-48 shrink-0 truncate border-3 border-[#171717] bg-white px-3 py-2 text-left text-xs font-bold shadow-[3px_3px_0_#171717] hover:bg-[#77bdfb] active:translate-x-1 active:translate-y-1 active:shadow-none'
              key={conversation.id}
              type='button'
              onClick={() => openConversation(conversation.id)}
            >
              {conversation.title}
            </button>
          ))}
        </aside>

        <section
          className='flex min-h-0 flex-col gap-6 overflow-y-auto bg-[#fff7df] p-4 sm:p-6'
          aria-live='polite'
        >
          {messages.map((message, index) => (
            <Message key={`${message.role}-${index}`} message={message} />
          ))}
          {isLoading && (
            <p className='w-fit border-3 border-[#171717] bg-[#ffd84d] px-3 py-2 text-sm font-black shadow-[3px_3px_0_#171717]'>
              Menyemak sumber…
            </p>
          )}
        </section>
      </div>

      {messages.length === 1 && (
        <nav
          className='flex gap-3 overflow-x-auto bg-[#fff7df] px-4 pb-4 sm:px-6'
          aria-label='Cadangan soalan'
        >
          {suggestions.map((suggestion) => (
            <button
              className='shrink-0 border-3 border-[#171717] bg-[#ff8fab] px-3 py-2 text-sm font-black shadow-[3px_3px_0_#171717] active:translate-x-1 active:translate-y-1 active:shadow-none'
              key={suggestion}
              type='button'
              onClick={() => sendMessage(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </nav>
      )}

      <form
        className='border-t-4 border-[#171717] bg-[#77bdfb] p-4 sm:px-6'
        onSubmit={handleSubmit}
      >
        <div className='flex items-end gap-2 border-3 border-[#171717] bg-white p-2 shadow-[4px_4px_0_#171717] focus-within:bg-[#fff7df]'>
          <textarea
            className='min-h-12 flex-1 resize-none bg-transparent p-2 font-bold outline-none'
            maxLength='2000'
            placeholder='Tulis soalan caj rawatan…'
            rows='2'
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />

          {isLoading ? (
            <button
              className='border-3 border-[#171717] bg-[#ff8fab] px-4 py-2.5 font-black shadow-[3px_3px_0_#171717] active:translate-x-1 active:translate-y-1 active:shadow-none'
              type='button'
              onClick={() => abortRef.current?.abort()}
            >
              Henti
            </button>
          ) : (
            <button
              className='border-3 border-[#171717] bg-[#78d6a3] px-4 py-2.5 font-black shadow-[3px_3px_0_#171717] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none'
              disabled={!question.trim()}
              type='submit'
            >
              Hantar
            </button>
          )}
        </div>
        <small className='mt-3 block text-xs font-black text-[#171717]'>
          Jangan masukkan maklumat peribadi pesakit.
        </small>
      </form>
    </main>
  );
}
