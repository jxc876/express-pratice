import express from "express";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt";

/**
 * This example uses a simple password to protect a members only area.
 * When the user provides the correct password, a signed cookie is set to indicate that the user is authenticated.
 * 
 * The cookie is named `site_auth` and has a value of "yes" when the user is authenticated.
 * The cookie is signed to prevent tampering, but it is not encrypted, so it should not contain sensitive data.
 * The cookie is set to httpOnly to prevent access from JavaScript, and it has a max age of 1 hour.
 * 
 * See https://www.npmjs.com/package/cookie-parser
 */
const app = express();

// COOKIE_SECRET="xxx" node server-cookie.js
const COOKIE_SECRET = process.env.COOKIE_SECRET || "replace-this-with-a-real-secret";

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(COOKIE_SECRET));

// In a real app, you would would store the hash in a DB and not hardcode it
const PASSWORD = "secret123";
const PASSWORD_HASH = await bcrypt.hash(PASSWORD, 12);

/**
 * Show a simple home page with links to login, members area, and logout.
 * The members area and logout links will redirect to login if the user is not authenticated.
 */
app.get("/", (req, res) => { 
    res.send(`
    <h1>Welcome</h1>
    <p><a href="/login">Login</a></p>
    <p><a href="/members">Members Area</a></p>
    <p><a href="/logout">Logout</a></p>
  `);
});

/**
 * Shows a simple login form that submits to the POST /login route.
 * The form only has a password field, no username, for simplicity.
 */
app.get("/login", (req, res) => {
    res.send(`
    <form method="POST" action="/login">
      <label>Password: 
        <input type="password" name="password" required />
      </label>
      <button type="submit">Enter</button>
    </form>
  `);
});

/**
 * Login consist of sending a password-only, no username.
 * If the password is correct, we set a signed cookie to indicate the user is authenticated.
 */
app.post("/login", async (req, res) => {
    console.log("\n-------------------------------");
    console.log("Login request received");
    console.log(req.headers["content-type"]);
    console.log(req.body);
    
    const valid = await bcrypt.compare(req.body.password, PASSWORD_HASH);

    if (!valid) {
        return res.status(401).send("Invalid password");
    }

    res.cookie("site_auth", "yes", {
        signed: true,
        httpOnly: true,
        secure: false, // true in production with HTTPS
        sameSite: "lax",
        maxAge: 1000 * 60 * 60, // 1 hour
    });

    res.redirect("/members");
});

/**
 * The members area checks for the presence of this cookie and redirects to login if it's not present or invalid.
 * The logout route clears the cookie and redirects to login.
 */
app.get("/members", requirePassword, (req, res) => {
    console.log("\n-------------------------------");
    console.log("Members page requested");
    res.send("<h1>Protected page</h1>");
});

/**
 * Logging out consistent of clearing the cookie and redirecting to login.
 * Made this a GET route for simplicity so we don't need a form.
 */
app.get("/logout", (req, res) => {
    console.log("\n-------------------------------");
    console.log("Logout request received");
    res.clearCookie("site_auth");
    res.redirect("/login");
});

/**
 * Helper middleware to check for the presence of the signed cookie. 
 * If the cookie is not present or has an invalid signature, it redirects to the login page. 
 * Otherwise, it calls `next()` to proceed to the protected route handler.
 */
function requirePassword(req, res, next) {
    if (req.signedCookies.site_auth !== "yes") {
        return res.redirect("/login");
    }

    next();
}

app.listen(3000);