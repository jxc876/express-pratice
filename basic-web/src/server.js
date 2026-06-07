const path = require("path");
const bcrypt = require("bcryptjs");
const express = require("express");
const session = require("express-session");
const { randomUUID } = require("crypto");

// You can override the host or port
// ex: HOST=127.0.0.1 PORT=4000 npm start
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";
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

/**
 * Custom middleware to make the current user and flash messages available in all views.
 * Flash messages are stored in the session and cleared after being displayed once.
 */
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
  const isValid = user && (await bcrypt.compare(password, user.passwordHash));

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

// Handle Logout request
app.post("/logout", requireAuth, (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).send("Could not log out.");
    }

    res.clearCookie("basic_web_sid");
    res.redirect("/");
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

const defaultUser = {
  id: randomUUID(),
  name: "Demo User",
  email: "demo@example.com",
  passwordHash: bcrypt.hashSync("password123", 12),
  joinedAt: new Date()
};

const users = [defaultUser];

function getCurrentUser(req) {
  return users.find((user) => user.id === req.session.userId);
}

app.listen(PORT, HOST, () => {
  console.log(`Basic Web running at http://${HOST}:${PORT}`);
});
