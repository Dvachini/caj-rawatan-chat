const cookieName = 'caj_session';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cookies(header = '') {
  return Object.fromEntries(header.split(';').map((item) => item.trim().split('=').map(decodeURIComponent)).filter(([key]) => key));
}

function sessionCookie(token, secure) {
  return `${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${secure ? '; Secure' : ''}`;
}

export function addAuthRoutes(app, auth, { secureCookies = false } = {}) {
  app.post('/api/auth/register', async (request, response) => {
    const email = request.body?.email?.trim().toLowerCase();
    const password = request.body?.password;
    const token = request.body?.invite;
    if (!emailPattern.test(email || '') || typeof password !== 'string' || password.length < 12 || typeof token !== 'string') {
      return response.status(400).json({ error: 'E-mel, kata laluan minimum 12 aksara, dan jemputan diperlukan.' });
    }
    const user = await auth.register({ email, password, token });
    if (!user) return response.status(400).json({ error: 'Jemputan tidak sah atau telah digunakan.' });
    return response.status(201).json({ user });
  });

  app.post('/api/auth/login', async (request, response) => {
    const email = request.body?.email?.trim().toLowerCase();
    const password = request.body?.password;
    if (!email || typeof password !== 'string') return response.status(400).json({ error: 'E-mel dan kata laluan diperlukan.' });
    const result = await auth.login(email, password);
    if (!result) return response.status(401).json({ error: 'E-mel atau kata laluan salah.' });
    response.setHeader('set-cookie', sessionCookie(result.token, secureCookies));
    return response.json({ user: result.user });
  });

  app.get('/api/auth/session', async (request, response) => {
    const user = await auth.authenticate(cookies(request.headers.cookie)[cookieName]);
    return response.json({ user: user ? { id: user.id, email: user.email, role: user.role } : null });
  });

  app.post('/api/auth/logout', async (request, response) => {
    const token = cookies(request.headers.cookie)[cookieName];
    if (token) await auth.logout(token);
    response.setHeader('set-cookie', `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureCookies ? '; Secure' : ''}`);
    return response.status(204).end();
  });
}

export function requireUser(auth) {
  return async (request, response, next) => {
    const user = await auth.authenticate(cookies(request.headers.cookie)[cookieName]);
    if (!user) return response.status(401).json({ error: 'Sila log masuk.' });
    request.user = user;
    return next();
  };
}
