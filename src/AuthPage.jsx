import { useState } from 'react';

export default function AuthPage({ onLogin }) {
  const invite = new URLSearchParams(location.search).get('invite');
  const [isRegistering, setIsRegistering] = useState(Boolean(invite));
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const data = Object.fromEntries(new FormData(event.currentTarget));
    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...data, invite }),
    });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error);
      return;
    }

    if (isRegistering) {
      setIsRegistering(false);
      history.replaceState({}, '', location.pathname);
      return;
    }

    onLogin(body.user);
  }

  return (
    <main className='grid min-h-screen place-items-center p-5'>
      <form
        className='grid w-full max-w-sm gap-5 border-4 border-[#171717] bg-[#fffdf5] p-7 shadow-[8px_8px_0_#171717] sm:p-8'
        onSubmit={handleSubmit}
      >
        <div className='grid h-14 w-14 -rotate-3 place-items-center border-3 border-[#171717] bg-[#ffd84d] text-lg font-black shadow-[4px_4px_0_#171717]'>
          CR
        </div>
        <div>
          <h1 className='text-3xl font-black uppercase tracking-tight text-[#171717]'>
            {isRegistering ? 'Daftar akaun' : 'Log masuk'}
          </h1>
          <p className='mt-2 font-bold text-[#383838]'>
            {isRegistering
              ? 'Gunakan jemputan untuk cipta akaun.'
              : 'Akses rujukan caj rawatan.'}
          </p>
        </div>

        <label className='grid gap-2 text-sm font-black uppercase text-[#171717]'>
          E-mel
          <input
            className='border-3 border-[#171717] bg-white px-3 py-3 font-bold outline-none focus:bg-[#fff7df]'
            name='email'
            type='email'
            autoComplete='email'
            required
          />
        </label>

        <label className='grid gap-2 text-sm font-black uppercase text-[#171717]'>
          Kata laluan
          <input
            className='border-3 border-[#171717] bg-white px-3 py-3 font-bold outline-none focus:bg-[#fff7df]'
            name='password'
            type='password'
            minLength='12'
            autoComplete={isRegistering ? 'new-password' : 'current-password'}
            required
          />
        </label>

        {error && (
          <p className='border-3 border-[#171717] bg-[#ff8fab] p-3 text-sm font-bold'>
            {error}
          </p>
        )}

        <button
          className='border-3 border-[#171717] bg-[#78d6a3] px-4 py-3 font-black uppercase shadow-[4px_4px_0_#171717] transition-transform hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#171717] active:translate-x-1 active:translate-y-1 active:shadow-none'
          type='submit'
        >
          {isRegistering ? 'Daftar' : 'Log masuk'}
        </button>
      </form>
    </main>
  );
}
