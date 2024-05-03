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
    // filtrare via lo username di chi ha chiesto
};

const get_requests = async(username) => {
    return {};
};

const get_friendships = async(username) => {
    return await db.get_friendships(username);
    // filtrare via lo username di chi ha chiesto e stato
};


const start_game = async(tavolo) => {
    io.to(tavolo).emit("start game",get_players(tavolo));
    //Mano,fiches,Puntata,CartE
};

const end_game = async(tavolo) => {
    io.to(tavolo).emit("end game","end game");
    //Mano,fiches,Puntata,CartE
};












const io = new Server(server);

io.of("/").adapter.on("join-room", async (room, id) => {
    if (await db.get_table_size(room) >= 10) {
        await db.delete_invites_table(room)
    };
    io.to(room).emit("lobby",get_players(room));
    //ordine players
});

io.of("/").adapter.on("leave-room", (room, id) => {
    io.to(room).emit("lobby",get_players(room));
});

io.on("connection", (socket) => {
    console.log("socket connected: " + socket.id);


    /* STRUTTURA */
    /* 1: get dei dati (usernames e sockets) */
    /* 2: operazioni nel database/rooms */
    /* 3: risposta ai sockets */

    socket.on("login", async () => {
        const username = (await db.get_username(socket.id))[0];
        const friends_list = await get_friendships(username);

        await db.bind_socket(socket.id,username);

        friends_list.forEach((friend) => {
            if (friend.socket) {
                io.to(friend.socket).emit("friends",get_friendships(friend.username));
            };
        });
    });

    socket.on("logout", async () => {
        const username = (await db.get_username(socket.id))[0];
        const friends_list = await get_friendships(username);
        const invited_list = await get_invites(username);

        await db.bind_socket(null,(await db.get_username(socket.id))[0]);
        
        friends_list.forEach((friend) => {
            if (friend.socket) {
                io.to(friend.socket).emit("friends",get_friendships(friend.username));
            };
        });

        invited_list.forEach((invited) => {
            if (invited.socket) {
                io.to(invited.socket).emit("invite",get_invites(invited.username));
            };
        });
    });

    /* INVITI AL TAVOLO */

    socket.on("invite", async (m) => {
        //check numero players nel tavolo, in caso, errore
        const username1 = (await db.get_username(socket.id))[0];
        const tavolo = await db.get_table(username1);
        if (await db.get_table_size(tavolo) < 10) {
            const username2 = m.username;
            const socket2 = await (db.get_socket(username2))[0];

            await db.create_invite(username1,username2);
            
            io.to(socket.id).emit("invite",get_invites(username1));
            io.to(socket2).emit("invite",get_invites(username2));

        } else {
            socket.emit("error","Table Full");
        }
    
    });

    socket.on("accept_invite", async (m) => {
        const username1 = m.username;
        const tavolo = await db.get_table(username1);
        const username2 = (await db.get_username(socket.id))[0];
        const socket1 = (await db.get_socket(username1))[0];
    
        await db.delete_invite(username1,username2);
        await join_table(username2, tavolo);
        await io.in(socket.id).socketsJoin(tavolo);

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
         //questo quando cerca un username, mettere try catch
        const username1 = (await db.get_username(socket.id))[0];
        if (await db.get_friends_number(username1) < 100) {
            const username2 = m.username;
            const socket2 = (await db.get_socket(username2))[0];

            await db.create_request(username1,username2);
            
            io.to(socket.id).emit("request",get_requests(username1));
            io.to(socket2).emit("request",get_requests(username2));

        } else {
            socket.emit("error","Friends List Full");
        };
    });

    socket.on("accept_request", async (m) => {
        const username1 = m.username;
        const username2 = (await db.get_username(socket.id))[0];
        const socket1 = (await db.get_socket(username1))[0];
        //check numero di amici <100
        await db.accept_request(username1,username2);

        io.to(socket1).emit("invite",get_requests(username1));
        io.to(socket.id).emit("invite",get_requests(username2));
        io.to(socket1).emit("invite",get_friendships(username1));
        io.to(socket.id).emit("invite",get_friendships(username2));
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

        io.to(socketx).emit("invite",get_friendships(usernamex));
        io.to(socket.id).emit("invite",get_friendships(usernamey));
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

        //await end_game(tavolo)
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
