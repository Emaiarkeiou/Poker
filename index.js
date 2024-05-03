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
    const result = await db.login(
        req.body.username,
        req.body.password,
    );
    if (result) {
        await db.bind_socket(req.headers.socket,username)
        res.json({ result: "ok" });
    } else {
        res.status(401); //401 è il codice unauthorized
        res.json({ result: "Unauthorized" });
    }
});

app.post("/signup", async(req, res) => {
    try {
        await db.signup(username, password);
        res.json({ result: "ok" });
    } catch (e) {
        res.json({ result: e.name});
    }
    /*
    result = await db.check_username(req.body.username)
    if (result) {
        await db.signup(username, password);
        res.json({ result: "ok" });
    } else {
        res.json({ result: "" });
    }
    */
});

app.post("/logout", async(req, res) => {
    await db.bind_socket(null,req.headers.username)
    res.json({ result: "ok" });
});

app.post("/create_table", async(req, res) => {
    const result = await db.login(
        req.headers.username,
        req.headers.password,
    );
    if (result) {
        let tavolo = await db.create_table(req.headers.username);
        await join_table(req.headers.username, tavolo);

        let id = (await db.get_socket(req.headers.username))[0];
        io.in(id).socketsJoin(tavolo);

        res.json({ result: "ok" });
        
    } else {
        res.status(401); //401 è il codice unauthorized
        res.json({ result: "Unauthorized" });
    };
});



const get_players = async(tavolo) => {
    return {};
};

const get_invites = async(username) => {
    return {};
};

const get_requests = async(username) => {
    return {};
};

const get_friends = async(username) => {
    return {};
};


const start_game = async(tavolo) => {
    io.to(tavolo).emit("game",get_players(tavolo));
    //Mano,fiches,Puntata,CartE
};













const io = new Server(server);

io.of("/").adapter.on("join-room", (room, id) => {
    io.to(room).emit("lobby",get_players(room));
    //ordine players
});

io.of("/").adapter.on("leave-room", (room, id) => {
    io.to(room).emit("lobby",get_players(room));
});

io.on("connection", (socket) => {
    console.log("socket connected: " + socket.id);

    //login e logout per mandare agli amici la lista amici

    /* STRUTTURA */
    /* 1: get dei dati (usernames e sockets) */
    /* 2: operazioni nel database/rooms */
    /* 3: risposta ai sockets */

    /* INVITI AL TAVOLO */

    socket.on("invite", async (m) => {
        //se c'è già????
        const username1 = (await db.get_username(socket.id))[0];
        const username2 = m.username;
        const socket2 = await (db.get_socket(username2))[0];

        await db.create_invite(username1,username2);
        
        io.to(socket.id).emit("invite",get_invites(username1));
        io.to(socket2).emit("invite",get_invites(username2));
    });

    socket.on("accept_invite", async (m) => {
        const username1 = m.username;
        const username2 = (await db.get_username(socket.id))[0];
        const socket1 = (await db.get_socket(username1))[0];
        
        await db.delete_invite(username1,username2);
        const tavolo = await db.get_table(username1);
        await join_table(username2, tavolo);
        io.in(socket.id).socketsJoin(tavolo);
        //io.to(tavolo).emit(get_players(tavolo));
        io.to(socket1).emit("invite",get_invites(username1));
        io.to(socket.id).emit("invite",get_invites(username2));
    });

    socket.on("reject_invite", async (m) => {
        const username1 = m.username;
        const username2 = (await db.get_username(socket.id))[0];
        const socket1 = (await db.get_socket(username1))[0];

        await db.delete_invite(username1,username2);

        io.to(socket1).emit("invite",get_invites(username1));
        io.to(socket.id).emit("invite",get_invites(username2));
    });



    /* RICHIESTE DI AMICIZIA */

    socket.on("request", async (m) => {
        //se c'è già???? //questo quando cerca un username, try catch
        const username1 = (await db.get_username(socket.id))[0];
        const username2 = m.username;
        const socket2 = (await db.get_socket(username2))[0];

        await db.create_request(username1,username2);
        
        io.to(socket.id).emit("request",get_requests(username1));
        io.to(socket2).emit("request",get_requests(username2));
    });

    socket.on("accept_request", async (m) => {
        const username1 = m.username;
        const username2 = (await db.get_username(socket.id))[0];
        const socket1 = (await db.get_socket(username1))[0];

        await db.accept_request(username1,username2);

        io.to(socket1).emit("invite",get_requests(username1));
        io.to(socket.id).emit("invite",get_requests(username2));
        io.to(socket1).emit("invite",get_friends(username1));
        io.to(socket.id).emit("invite",get_friends(username2));
    });

    socket.on("reject_request", async (m) => {
        const username1 = m.username;
        const username2 = (await db.get_username(socket.id))[0];
        const socket1 = (await db.get_socket(username1))[0];

        await db.delete_request(username1,username2);

        io.to(socket1).emit("invite",get_requests(username1));
        io.to(socket.id).emit("invite",get_requests(username2));
    });

    socket.on("remove_friendship", async (m) => {
        const usernamex = m.username;
        const usernamey = (await db.get_username(socket.id))[0];
        const socketx = (await db.get_socket(usernamex))[0];

        await db.delete_friendship(usernamex,usernamey);

        io.to(socketx).emit("invite",get_friends(usernamex));
        io.to(socket.id).emit("invite",get_friends(usernamey));
    });



    /* GIOCO */

    socket.on("ready", async () => {
        const username = (await db.get_username(socket.id))[0];

        await db.ready(username);
        const all_ready = await db.check_ready(socket.rooms[0]);

        io.to(socket.rooms[0]).emit("lobby",get_players(socket.rooms[0]));
        if (all_ready.every(Boolean)) {
            start_game(socket.rooms[0])
        };
    });

    socket.on("unready", async () => {
        const username = (await db.get_username(socket.id))[0];

        await db.unready(username);

        io.to(socket.rooms[0]).emit("lobby",get_players(socket.rooms[0]));
    });

    socket.on("move", async () => {
        //io.to(tavolo).emit("move",);
        //io.to(socket).emit("turn",);

        //io.to(tavolo).emit("game","end game");
    });


    // ready => starta game => Mano,fiches,Puntata,CartE => fine game => ready ...
    // unready
    // moves => logica di gioco server
    // quit, leave

    socket.on("disconnect", async () => {
        const username = (await db.get_username(socket.id))[0];
        // eliminare tutto
        // abbandonare tutto
        // mandare a tutti gli amici l'aggiornamento della lista amici e inviti
        // 
        if (username) {
            await db.bind_socket(null,m.username);
        }
    });
});

server.listen(80, () => {
    console.log("server running on port: " + 80);
});
