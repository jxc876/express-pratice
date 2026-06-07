# About

A simple app to explore Auth with Express.

There are two files
* `server-simple.js` — Uses a signed cookie & password to protect a page
* `server.js` — Allows User sign-up & login, uses server side sessions

# Login Flow

A login flow for `server.js` looks like this:

User signs up
* Server hashes their password
* Server stores user in DB

User logs in
* Server verifies password
* Server creates a session
* Browser stores session cookie
* Members-only routes check the session

```
Browser                    Express Server                  Database
   | POST /signup  ---------> | hash password  ------------> | save user
   |
   | POST /login   ---------> | verify password ------------> | find user
   |                          | create session
   | <-------- Set-Cookie ----|
   |
   | GET /members ----------> | check session cookie
   | <-------- protected page |
```

# 201 vs 302

Is it better to return a HTTP 201 Created 

Or a HTTP 301 redirect to the login page?

## Redirect 

It depends on whether you're building a traditional server-rendered website or an API.

If the browser submits an HTML form then a redirect is common.

```
302 Found
Location: /login
```

or even

```
303 See Other
Location: /login
```

The browser automatically navigates to the login page.

## REST API

If you're building an API that React, Vue, mobile apps, etc. will consume, then return a success status code.

Example Request

```
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "123",
  "username": "mike"
}
```

Example Response

```
201 Created
```

The frontend decides what to do next:

```javascript
await fetch("/signup", ...);
navigate("/login");
```

## Another Option

Many modern apps skip the login page entirely:

1. POST /signup
2. Create user & session
3. User is logged in
4. Redirect to /members
