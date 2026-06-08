# Basic Web

A small Express application with:
- A public website area
- User signup
- User login & logout
- Google sign-in with Passport
- A protected members-only page

The app uses EJS templates, Express sessions, Passport, and bcrypt password hashing.


## Routes

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Public homepage |
| `GET` | `/about` | Public about page |
| `GET` | `/signup` | Signup form |
| `POST` | `/signup` | Creates a user and logs them in |
| `GET` | `/login` | Login form |
| `POST` | `/login` | Authenticates a user |
| `GET` | `/auth/google` | Starts Google OAuth login |
| `GET` | `/callback` | Handles the Google OAuth callback |
| `POST` | `/logout` | Destroys the current session |
| `GET` | `/members` | Protected members-only page |


## Default Login

The app seeds one default user every time the server starts:

```text
Email: demo@example.com
Password: password123
```

This is useful for local development because the app currently stores users in memory. Any users created through the signup form are lost when the server restarts, but the default demo user is recreated each time.


## Google Sign-In

To enable Google Sign-In create a Google OAuth application with:

```text
Authorized JavaScript origin: http://localhost:3000
Authorized redirect URI: http://localhost:3000/callback
```

Copy the sample environment file and fill in your credentials:

```sh
cp .env.example .env
```

Then start the app:

```sh
npm start
```

The app loads `.env` automatically. It defaults `GOOGLE_CALLBACK_URL` to `http://localhost:3000/callback`.

If you change the host, port, or callback path, update `GOOGLE_CALLBACK_URL` to the exact URI configured in Google.



## How Authentication Works

Users are stored in an in-memory `users` array in `src/auth.js`.

Passwords are hashed with bcrypt before they are stored.

When a user signs up, logs in with a password, or completes Google sign-in, their user id is saved to the session:

```js
req.session.userId = user.id;
```

The `requireAuth` middleware checks for a logged-in user before allowing access to `/members`. If no user is found, the visitor is redirected to `/login`.

Passport also stores authenticated Google users in the same session. Google accounts are matched to existing in-memory users by Google profile id first, then by email.

Google sign-in uses two routes:

- `GET /auth/google` starts the OAuth flow when someone clicks `Continue with Google`. Passport redirects the browser to Google and asks for the `profile` and `email` scopes.
- `GET /callback` runs after Google redirects back to the app with an authorization code. On this route, `passport.authenticate("google", { failureRedirect: "/login" })` exchanges that code for Google profile data, triggers the `GoogleStrategy` callback in `src/auth.js`, and sets `req.user` if authentication succeeds.

After Passport sets `req.user`, the callback route saves `req.user.id` to the session and redirects the user to `/members`. If Google authentication fails, Passport sends the user back to `/login`.

The app also uses `res.locals` to make user data available to every EJS template:

```js
res.locals.currentUser = getCurrentUser(req);
res.locals.flash = req.session.flash;
```

That lets the header and pages react to the current login state without passing the same values through every `res.render` call.

Most auth-related code lives in `src/auth.js`, including session setup, Passport setup, login/signup/logout routes, Google OAuth routes, auth middleware, and the in-memory users array. `src/server.js` wires the app together and keeps the public page routes plus the protected `/members` route.


## Development Notes

- This app is a learning-friendly starter, not production-ready authentication.
- Replace the in-memory `users` array with a database before using it for real accounts.
- Set a strong `SESSION_SECRET` in production instead of relying on the development fallback.
- Keep Google client secrets in environment variables, not source control.
- Consider adding CSRF protection before accepting real form submissions.
