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
app.use("/", express.static(path.join(__dirname, "public")));


const server = http.createServer(app);

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
