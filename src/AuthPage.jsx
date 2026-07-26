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
    <main className='grid min-h-screen place-items-center bg-[#edf4f1] p-5'>
      <form
        className='grid w-full max-w-sm gap-4 rounded-2xl border border-[#d7e3de] bg-white p-8 shadow-xl shadow-[#275d4b]/5'
        onSubmit={handleSubmit}
      >
        <div className='grid h-11 w-11 place-items-center rounded-xl bg-[#176b57] font-bold text-white'>
          CR
        </div>
        <div>
          <h1 className='text-xl font-bold text-gray-900'>
            {isRegistering ? 'Daftar akaun' : 'Log masuk'}
          </h1>
          <p className='mt-1 text-sm text-gray-500'>
            {isRegistering
              ? 'Gunakan jemputan untuk cipta akaun.'
              : 'Akses rujukan caj rawatan.'}
          </p>
        </div>

        <label className='grid gap-1 text-sm font-semibold text-gray-700'>
          E-mel
          <input
            className='rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-[#176b57] focus:ring-2 focus:ring-[#79bba9]'
            name='email'
            type='email'
            autoComplete='email'
            required
          />
        </label>

        <label className='grid gap-1 text-sm font-semibold text-gray-700'>
          Kata laluan
          <input
            className='rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-[#176b57] focus:ring-2 focus:ring-[#79bba9]'
            name='password'
            type='password'
            minLength='12'
            autoComplete={isRegistering ? 'new-password' : 'current-password'}
            required
          />
        </label>

        {error && <p className='text-sm text-red-700'>{error}</p>}

        <button
          className='rounded-lg bg-[#176b57] px-4 py-3 font-bold text-white hover:bg-[#125544]'
          type='submit'
        >
          {isRegistering ? 'Daftar' : 'Log masuk'}
        </button>
      </form>
    </main>
  );
}
