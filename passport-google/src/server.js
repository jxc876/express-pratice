const path = require("path");
require("dotenv").config();

const bcrypt = require("bcryptjs");
const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");
const { randomUUID } = require("crypto");

// You can override the host or port
// ex: HOST=127.0.0.1 PORT=4000 npm start
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "localhost";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/callback";
const app = express();

// Setup EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Parse URL-encoded bodies (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: false }));

// Configure Sessions
app.use(
  session({
    name: "basic_web_sid",
    secret: process.env.SESSION_SECRET || "dev-only-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  done(null, users.find((user) => user.id === id) || false);
});

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL
      },
      // callback function to find or create a user based on their Google profile
      (accessToken, refreshToken, profile, done) => {
        const email = getPrimaryEmail(profile);

        // find user by googleId
        let user = users.find((candidate) => candidate.googleId === profile.id);

        // find user by email if not found by googleId
        // handles case where user signed up with email 
        // and is now signing in with Google for the first time
        if (!user && email) {
          user = users.find((candidate) => candidate.email === email);
        }

        // if user exists, update their googleId and profile info if needed
        if (user) {
          user.googleId = profile.id;
          user.name = user.name || profile.displayName || email;
          user.email = user.email || email;
          user.photo = profile.photos && profile.photos[0] && profile.photos[0].value;

          // successfully found existing user, pass to Passport
          return done(null, user);
        }

        // if user doesn't exist, create a new one
        user = {
          id: randomUUID(),
          googleId: profile.id,
          name: profile.displayName || email || "Google User",
          email,
          photo: profile.photos && profile.photos[0] && profile.photos[0].value,
          joinedAt: new Date()
        };

        // In a real application, you'd save the user to the database here
        users.push(user);

        // successfully created new user, pass to Passport
        done(null, user);
      }
    )
  );
}

app.use(passport.initialize());
app.use(passport.session());

/**
 * Custom middleware to make the current user and flash messages available in all views.
 * Flash messages are stored in the session and cleared after being displayed once.
 */
// Must come before any route handlers that access currentUser or flash messages
app.use((req, res, next) => {
  res.locals.currentUser = getCurrentUser(req);
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

app.get("/", (req, res) => {
  res.render("home", {
    title: "Basic Web",
    usersCount: users.length
  });
});

app.get("/about", (req, res) => {
  res.render("about", { title: "About" });
});

app.get("/signup", redirectIfAuthenticated, (req, res) => {
  res.render("signup", { title: "Sign Up", form: {} });
});

// Handle Signup request
app.post("/signup", redirectIfAuthenticated, async (req, res) => {
  const { name, email, password } = req.body;
  const cleanName = String(name || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanName || !cleanEmail || !password) {
    return res.status(400).render("signup", {
      title: "Sign Up",
      form: { name: cleanName, email: cleanEmail },
      error: "Please fill in every field."
    });
  }

  if (password.length < 8) {
    return res.status(400).render("signup", {
      title: "Sign Up",
      form: { name: cleanName, email: cleanEmail },
      error: "Password must be at least 8 characters."
    });
  }

  if (users.some((user) => user.email === cleanEmail)) {
    return res.status(409).render("signup", {
      title: "Sign Up",
      form: { name: cleanName, email: cleanEmail },
      error: "An account already exists for that email."
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = {
    id: randomUUID(),
    name: cleanName,
    email: cleanEmail,
    passwordHash,
    joinedAt: new Date()
  };

  users.push(user);
  req.session.userId = user.id;
  req.session.flash = "Welcome! Your account is ready.";
  res.redirect("/members");
});

// Show basic login form
app.get("/login", redirectIfAuthenticated, (req, res) => {
  res.render("login", { title: "Log In", form: {} });
});

// Handle login request
app.post("/login", redirectIfAuthenticated, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = users.find((candidate) => candidate.email === email);
  const isValid =
    user && user.passwordHash && (await bcrypt.compare(password, user.passwordHash));

  if (!isValid) {
    return res.status(401).render("login", {
      title: "Log In",
      form: { email },
      error: "Email or password is incorrect."
    });
  }

  req.session.userId = user.id;
  req.session.flash = "You are logged in.";
  res.redirect("/members");
});

// Starts the Google OAuth flow when a user clicks "Continue with Google".
// Passport redirects the browser to Google, then Google returns to /callback.
app.get(
  "/auth/google",
  redirectIfAuthenticated,
  requireGoogleAuthConfig,
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/callback",
  redirectIfAuthenticated,
  requireGoogleAuthConfig,
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    req.session.userId = req.user.id;
    req.session.flash = "You are logged in with Google.";
    res.redirect("/members");
  }
);

// Handle Logout request
app.post("/logout", requireAuth, (req, res) => {
  req.logout((logoutError) => {
    if (logoutError) {
      return res.status(500).send("Could not log out.");
    }

    req.session.destroy((error) => {
      if (error) {
        return res.status(500).send("Could not log out.");
      }

      res.clearCookie("basic_web_sid");
      res.redirect("/");
    });
  });
});

app.get("/members", requireAuth, (req, res) => {
  res.render("members", {
    title: "Members",
    member: getCurrentUser(req),
    users
  });
});

app.use((req, res) => {
  res.status(404).render("not-found", { title: "Not Found" });
});


// Middleware for protected pages
function requireAuth(req, res, next) {
  if (!getCurrentUser(req)) {
    req.session.flash = "Please log in to view the members area.";
    return res.redirect("/login");
  }

  next();
}

function redirectIfAuthenticated(req, res, next) {
  if (getCurrentUser(req)) {
    return res.redirect("/members");
  }

  next();
}

function requireGoogleAuthConfig(req, res, next) {
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    return next();
  }

  req.session.flash =
    "Google sign-in needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment.";
  res.redirect("/login");
}

const defaultUser = {
  id: randomUUID(),
  name: "Demo User",
  email: "demo@example.com",
  passwordHash: bcrypt.hashSync("password123", 12),
  joinedAt: new Date()
};

const users = [defaultUser];

function getCurrentUser(req) {
  return req.user || users.find((user) => user.id === req.session.userId);
}

function getPrimaryEmail(profile) {
  const email = profile.emails && profile.emails[0] && profile.emails[0].value;
  return email ? email.trim().toLowerCase() : "";
}

app.listen(PORT, HOST, () => {
  console.log(`Basic Web running at http://${HOST}:${PORT}`);
});
