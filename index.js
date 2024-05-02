const fs = require("fs");
const express = require("express");
const http = require("http");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");

const db = require("./database.js");
db.createTables(); //crea le tabelle se non esistono

app.use(bodyParser.json());
app.use(
    bodyParser.urlencoded({
        extended: true,
    }),
);
app.use("/", express.static(path.join(__dirname, "")));


const server = http.createServer(app);

app.post("/login", async(req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    await db.login(username, password).then((result) => {
        if (result) {
            res.json({ result: "ok" });
        } else {
            res.status(401); //401 è il codice unauthorized
            res.json({ result: "Unauthorized" });
        }
    });
});

app.post("/signup", async(req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    await db.signup(username, password);
    res.json({ result: "ok" });
});

app.post("/create_table", async(req, res) => {
    result = await db.login(
        req.headers.username,
        req.headers.password,
    );
    if (result) {
        
        res.json({ result: "ok" });
    } else {
        res.status(401); //401 è il codice unauthorized
        res.json({ result: "Unauthorized" });
    };
});
















const io = new Server(server);





io.on("connection", (socket) => {
    console.log("socket connected: " + socket.id);
    io.emit("chat", {
        name: "",
        message: socket.id + " connected",
        date: "",
    });
    socket.on("message", (message) => {
        const response = {
        socketid: socket.id,
        name: message.name,
        message: message.message,
        date: new Date().toLocaleString("it-IT", {
            timeZone: "Europe/Rome",
        }),
        };
        console.log(response);
        io.emit("chat", response);
    });
    socket.on("disconnect", () => {
        const response = {
        name: "",
        message: socket.id + " disconnected",
        date: "",
        };
        console.log(response);
        io.emit("chat", response);
    });
});

server.listen(80, () => {
    console.log("server running on port: " + 80);
});
