# Basic Web

Basic Web is a small Node.js and Express application that demonstrates a public website area, account signup, login, logout, and a protected members-only page.

The app uses server-rendered EJS templates, Express sessions for authentication state, bcrypt password hashing, and modular CSS served from the public folder. It is intentionally lightweight so it is easy to read, run, and extend.

## Features

- Public homepage and about page
- User signup with basic validation
- User login and logout
- Members-only route protected by authentication middleware
- Flash messages for login, signup, and protected-route redirects
- Seeded default user for quick local testing
- Modular CSS split into base, layout, components, forms, pages, and responsive files

## Tech Stack

- Node.js
- Express
- EJS
- express-session
- bcryptjs
- Plain CSS

## Getting Started

Install dependencies:

```sh
npm install
```

Start the application:

```sh
npm start
```

For development with Node's watch mode:

```sh
npm run dev
```

The app runs at:

```text
http://127.0.0.1:3000
```

You can override the host or port with environment variables:

```sh
HOST=127.0.0.1 PORT=4000 npm start
```

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

## Project Structure

```text
.
├── package.json
├── package-lock.json
├── src
│   ├── server.js
│   ├── public
│   │   ├── styles.css
│   │   └── styles
│   │       ├── base.css
│   │       ├── components.css
│   │       ├── forms.css
│   │       ├── layout.css
│   │       ├── pages.css
│   │       └── responsive.css
│   └── views
│       ├── about.ejs
│       ├── home.ejs
│       ├── login.ejs
│       ├── members.ejs
│       ├── not-found.ejs
│       ├── signup.ejs
│       └── partials
│           ├── footer.ejs
│           └── header.ejs
```

## How Authentication Works

Users are stored in an in-memory `users` array in `src/server.js`. Passwords are hashed with bcrypt before they are stored.

When a user signs up or logs in, their user id is saved to the session:

```js
req.session.userId = user.id;
```

The `requireAuth` middleware checks for a logged-in user before allowing access to `/members`. If no user is found, the visitor is redirected to `/login`.

The app also uses `res.locals` to make request-specific data available to every EJS template:

```js
res.locals.currentUser = getCurrentUser(req);
res.locals.flash = req.session.flash;
```

That lets the header and pages react to the current login state without passing the same values through every `res.render` call.

## CSS Organization

The main stylesheet at `src/public/styles.css` imports focused CSS modules:

```css
@import url("./styles/base.css");
@import url("./styles/layout.css");
@import url("./styles/components.css");
@import url("./styles/forms.css");
@import url("./styles/pages.css");
@import url("./styles/responsive.css");
```

This keeps the browser entrypoint simple while making the CSS easier to scan and maintain.

## Development Notes

- This app is a learning-friendly starter, not production-ready authentication.
- Replace the in-memory `users` array with a database before using it for real accounts.
- Set a strong `SESSION_SECRET` in production instead of relying on the development fallback.
- Consider adding CSRF protection before accepting real form submissions.
