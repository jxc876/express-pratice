const path = require("path");
require("dotenv").config({ quiet: true });

const express = require("express");
const auth = require("./auth");

// You can override the host or port
// ex: HOST=127.0.0.1 PORT=4000 npm start
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "localhost";
const app = express();

// Setup EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Parse URL-encoded bodies (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: false }));

auth.configureAuth(app);

app.get("/", (req, res) => {
  res.render("home", {
    title: "Basic Web",
    usersCount: auth.getUsers().length
  });
});

app.get("/about", (req, res) => {
  res.render("about", { title: "About" });
});

app.get("/members", auth.requireAuth, (req, res) => {
  res.render("members", {
    title: "Members",
    member: auth.getCurrentUser(req),
    users: auth.getUsers()
  });
});

app.use((req, res) => {
  res.status(404).render("not-found", { title: "Not Found" });
});


app.listen(PORT, HOST, () => {
  console.log(`Basic Web running at http://${HOST}:${PORT}`);
});
