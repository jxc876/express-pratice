const bcrypt = require("bcryptjs");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");
const db = require("./db");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/callback";

// When Passport logs a user in, store only their id in the session.
// This keeps the session small instead of saving the whole user object.
// https://www.passportjs.org/concepts/authentication/sessions
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// On later requests, Passport reads that id from the session, finds the full
// user record, and attaches it to req.user.
// https://www.passportjs.org/concepts/authentication/sessions
passport.deserializeUser((id, done) => {
  done(null, db.getUser(id) || false);
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
        let user = db.getUserByGoogleId(profile.id);

        // find user by email if not found by googleId
        // handles case where user signed up with email
        // and is now signing in with Google for the first time
        if (!user && email) {
          user = db.getUserByEmail(email);
        }

        // if user exists, update their googleId and profile info if needed
        if (user) {
          const updatedUser = db.updateUser(user.id, {
            googleId: profile.id,
            name: user.name || profile.displayName || email,
            email: user.email || email,
            photo: profile.photos && profile.photos[0] && profile.photos[0].value
          });

          // successfully found existing user, pass to Passport
          return done(null, updatedUser);
        }

        // if user doesn't exist, create a new one
        user = db.createUser({
          googleId: profile.id,
          name: profile.displayName || email || "Google User",
          email,
          photo: profile.photos && profile.photos[0] && profile.photos[0].value
        });

        // successfully created new user, pass to Passport
        done(null, user);
      }
    )
  );
}

function configureAuth(app) {
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

    if (db.getUserByEmail(cleanEmail)) {
      return res.status(409).render("signup", {
        title: "Sign Up",
        form: { name: cleanName, email: cleanEmail },
        error: "An account already exists for that email."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = db.createUser({
      name: cleanName,
      email: cleanEmail,
      passwordHash
    });

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
    const user = db.getUserByEmail(email);
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

  // Handles Google's redirect back to the app.
  app.get(
    "/callback",
    redirectIfAuthenticated,
    requireGoogleAuthConfig,
    // This middleware exchanges the Google authorization code
    // for profile data and runs the GoogleStrategy callback.
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
}

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

function getCurrentUser(req) {
  return req.user || db.getUser(req.session.userId);
}

module.exports = {
  configureAuth,
  getCurrentUser,
  requireAuth
};

function getPrimaryEmail(profile) {
  const email = profile.emails && profile.emails[0] && profile.emails[0].value;
  return email ? email.trim().toLowerCase() : "";
}
