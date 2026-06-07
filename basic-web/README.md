# Basic Web

A small Express application that demonstrates a public website area, account signup, login, logout, and a protected members-only page.

The app uses server-rendered EJS templates, Express sessions for authentication state, bcrypt password hashing, and modular CSS served from the public folder. 

## Features

- Public homepage and about page
- User signup with basic validation
- User login and logout
- Members-only route protected by authentication middleware
- Flash messages for login, signup, and protected-route redirects
- Seeded default user for quick local testing
- Modular CSS split into base, layout, components, forms, pages, and responsive files

## Default Login

The app seeds one default user every time the server starts:

```text
Email: demo@example.com
Password: password123
```

This is useful for local development because the app currently stores users in memory. Any users created through the signup form are lost when the server restarts, but the default demo user is recreated each time.

## Routes

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Public homepage |
| `GET` | `/about` | Public about page |
| `GET` | `/signup` | Signup form |
| `POST` | `/signup` | Creates a user and logs them in |
| `GET` | `/login` | Login form |
| `POST` | `/login` | Authenticates a user |
| `POST` | `/logout` | Destroys the current session |
| `GET` | `/members` | Protected members-only page |


## How Authentication Works

Users are stored in an in-memory `users` array in `src/server.js`. 

Passwords are hashed with bcrypt before they are stored.

When a user signs up or logs in, their user id is saved to the session:

```js
req.session.userId = user.id;
```

The `requireAuth` middleware checks for a logged-in user before allowing access to `/members`. If no user is found, the visitor is redirected to `/login`.

The app also uses `res.locals` to make user data available to every EJS template:

```js
res.locals.currentUser = getCurrentUser(req);
res.locals.flash = req.session.flash;
```

That lets the header and pages react to the current login state without passing the same values through every `res.render` call.


## Development Notes

- This app is a learning-friendly starter, not production-ready authentication.
- Replace the in-memory `users` array with a database before using it for real accounts.
- Set a strong `SESSION_SECRET` in production instead of relying on the development fallback.
- Consider adding CSRF protection before accepting real form submissions.
