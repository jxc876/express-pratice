import express from "express";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt";

/**
 * This version uses a simple signed cookie to protect the members area.
 * 
 * The cookie is named `site_auth` and has a value of "yes" when the user is authenticated.
 * The cookie is signed to prevent tampering, but it is not encrypted, so it should not contain sensitive data.
 * The cookie is set to httpOnly to prevent access from JavaScript, and it has a max age of 1 hour.
 * 
 * See https://www.npmjs.com/package/cookie-parser
 */
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser("replace-this-with-a-real-secret"));

const PASSWORD_HASH = await bcrypt.hash("secret123", 12);

app.get("/", (req, res) => { 
    res.send(`
    <h1>Welcome</h1>
    <p><a href="/login">Login</a></p>
    <p><a href="/members">Members Area</a></p>
    <p><a href="/logout">Logout</a></p>
  `);
});

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

function requirePassword(req, res, next) {
    if (req.signedCookies.site_auth !== "yes") {
        return res.redirect("/login");
    }

    next();
}

app.get("/members", requirePassword, (req, res) => {
    console.log("\n-------------------------------");
    console.log("Members page requested");
    res.send("<h1>Protected page</h1>");
});

// Making this a GET route for simplicity
app.get("/logout", (req, res) => {
    console.log("\n-------------------------------");
    console.log("Logout request received");
    res.clearCookie("site_auth");
    res.redirect("/login");
});

app.listen(3000);