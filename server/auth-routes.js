const cookieName = 'caj_session';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((item) => item.trim().split('=').map(decodeURIComponent))
      .filter(([key]) => key),
  );
}

function getSessionToken(request) {
  return getCookies(request.headers.cookie)[cookieName];
}

function sessionCookie(token, secure) {
  const secureFlag = secure ? '; Secure' : '';
  return `${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${secureFlag}`;
}

function expiredSessionCookie(secure) {
  const secureFlag = secure ? '; Secure' : '';
  return `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureFlag}`;
}

export function addAuthRoutes(app, auth, { secureCookies = false } = {}) {
  app.post('/api/auth/register', async (request, response) => {
    const email = request.body?.email?.trim().toLowerCase();
    const password = request.body?.password;
    const token = request.body?.invite;
    const validInput =
      emailPattern.test(email || '') &&
      typeof password === 'string' &&
      password.length >= 12 &&
      typeof token === 'string';

    if (!validInput) {
      return response.status(400).json({
        error: 'E-mel, kata laluan minimum 12 aksara, dan jemputan diperlukan.',
      });
    }

    const user = await auth.register({ email, password, token });
    if (!user) {
      return response.status(400).json({
        error: 'Jemputan tidak sah atau telah digunakan.',
      });
    }

    return response.status(201).json({ user });
  });

  app.post('/api/auth/login', async (request, response) => {
    const email = request.body?.email?.trim().toLowerCase();
    const password = request.body?.password;

    if (!email || typeof password !== 'string') {
      return response.status(400).json({
        error: 'E-mel dan kata laluan diperlukan.',
      });
    }

    const result = await auth.login(email, password);
    if (!result) {
      return response.status(401).json({
        error: 'E-mel atau kata laluan salah.',
      });
    }

    response.setHeader(
      'set-cookie',
      sessionCookie(result.token, secureCookies),
    );
    return response.json({ user: result.user });
  });

  app.get('/api/auth/session', async (request, response) => {
    const user = await auth.authenticate(getSessionToken(request));

    if (!user) return response.json({ user: null });

    return response.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  });

  app.post('/api/auth/logout', async (request, response) => {
    const token = getSessionToken(request);
    if (token) await auth.logout(token);

    response.setHeader('set-cookie', expiredSessionCookie(secureCookies));
    return response.status(204).end();
  });
}

export function requireUser(auth) {
  return async (request, response, next) => {
    const user = await auth.authenticate(getSessionToken(request));

    if (!user) {
      return response.status(401).json({ error: 'Sila log masuk.' });
    }

    request.user = user;
    return next();
  };
}
