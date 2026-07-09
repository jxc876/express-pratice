import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import crypto from "crypto";
import cookieParser from "cookie-parser";

/**
 * This version creates a server-side session for each logged-in user.
 * It and stores the session ID in a cookie and the session data on the server.
 * 
 * See https://www.npmjs.com/package/bcrypt
 * See https://www.npmjs.com/package/express-session
 */
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const app = express();

// Parse URL-encoded bodies (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// app.use(cookieParser());
app.use(cookieParser(process.env.SESSION_SECRET || "replace-this-with-a-real-secret"));

// Configure Sessions
app.use(session({
    secret: process.env.SESSION_SECRET || "replace-this-with-a-real-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, // true in production with HTTPS
        sameSite: "lax",
    },
}));

// Handle Signup request
app.post("/signup", async (req, res) => {
    console.log("\n-------------------------------");
    console.log("Signup request received");
    console.log(req.headers["content-type"]);
    console.log(req.body);

    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send("Username and password are required");
    }

    const existingUser = await findUserByUsername(username);

    if (existingUser) {
        return res.status(409).send("Username already exists");
    }

    // Hash the password with bcrypt, uses a random salt
    const passwordHash = await bcrypt.hash(password, 12);

    // Save this to your database
    const user = {
        id: crypto.randomUUID(),
        username,
        passwordHash,
    };

    // db.users.insert(user)
    await saveUser(user);

    res.redirect("/login");
});

// Show basic login form
app.get("/login", (req, res) => {
    console.log("\n-------------------------------");
    console.log("Login page requested");
    res.send(`
        <h1>Login Page</h1>
        <form method="POST" action="/login">
            <label>Username: <input name="username" /></label><br/>
            <label>Password: <input type="password" name="password" /></label><br/>
            <button type="submit">Login</button>
        </form>
    `); 
});


// Handle login request
app.post("/login", async (req, res) => {
    console.log("\n-------------------------------");
    console.log("Login request received");
    console.log(req.headers["content-type"]);
    console.log(req.body);

    const { username, password } = req.body;

    // Look user up from database
    const user = await findUserByUsername(username);
    console.log("Found user:", user);

    if (!user) {
        return res.status(401).send("Invalid username or password");
    }

    const passwordIsValid = await bcrypt.compare(password, user.passwordHash);
    console.log("Password valid:", passwordIsValid);

    if (!passwordIsValid) {
        return res.status(401).send("Invalid username or password");
    }

    // Stores the session server-side & sends a cookie
    // its available on future requests as req.session
    // req.session.userId = user.id;
    // res.redirect("/members");

    // the above only set the cookie on the first login request, not on subsequent ones

    // Regenerate a new session ID to prevent session fixation attacks
    // https://github.com/expressjs/session#sessionregeneratecallback
    req.session.regenerate(function(err) {
        // we have a new session here
        if (!err) {
            // This creates a new session and sets the userId on it
            // then sends the cookie to the client
            console.log("Session regenerated, new session ID:", req.sessionID);
            req.session.userId = user.id;
            res.redirect("/members");
        }
    });
});


// Handle Logout request
app.post("/logout", (req, res) => {
    console.log("\n-------------------------------");
    console.log("Logout request received");
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.redirect("/");
    });
});


// Members-only route:
app.get("/members", requireLogin, (req, res) => {
    console.log("\n-------------------------------");
    console.log("cookies", req.cookies);
    console.log("signed cookies", req.signedCookies);
    console.log("Members area accessed by user ID:", req.session.userId);
    res.send("Welcome to the members-only area!");
});


// Middleware for protected pages
function requireLogin(req, res, next) {
    if (!req.session.userId) {
        console.log("Unauthorized access attempt to members area");
        return res.redirect("/login");
    }

    next();
}

// make the logged-in user available everywhere
// app.use(async (req, res, next) => {
//     if (req.session.userId) {
//         req.user = mockDatabase.users.find(
//             u => u.id === req.session.userId
//         );
//     }

//     next();
// });

const mockDatabase = {
    users: [],
};

async function saveUser(user) {
    mockDatabase.users.push(user);
    console.log(mockDatabase.users);
}

// Mock function to find user by username
async function findUserByUsername(username) {
    return mockDatabase.users.find(user => user.username === username);
}


app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});
