const fs = require("fs");
const express = require("express");
const http = require("http");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");

const db = require("./database.js");
db.createTables(); //crea le tabelle se non esistono

const STARTING_FICHES = 250;

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
        const tavolo = await db.create_table(req.headers.username);
        const socket_id = (await db.get_socket(req.headers.username))[0];

        await update_player_table(socket_id, tavolo);
        io.in(socket_id).socketsJoin(tavolo);

        res.json({ result: "ok" });
        
    } else {
        res.status(401); //401 è il codice unauthorized
        res.json({ result: "Unauthorized" });
    };
});

const logout = async (socket_id) => {
    const username = (await db.get_username(socket_id))[0];
    const friends_list = await get_friendships(username);

    await db.delete_player(socket_id);

    friends_list.forEach((friend) => {
        if (friend.socket) {
            io.to(friend.socket).emit("friends",get_friendships(friend.username));
        };
    });

    const invited_list = await get_invites(socket_id);        
    invited_list.forEach((invited) => {
        if (invited.socket) {
            io.to(invited.socket).emit("invite",get_invites(invited.socket));
        };
    });
}





const get_invites = async(socket) => {
    return await db.get_invites(socket);
    // filtrare via lo username di chi ha chiesto
};

const get_requests = async(username) => {
    return await db.get_requests(username);
};

const get_friendships = async(username) => {
    return await db.get_friendships(username);
    // filtrare via lo username di chi ha chiesto e stato
};

const get_players = async(tavolo) => {
    //tutti i giocatori del tavolo con pronto, fiches, ordine
    return {};
};

const get_hand = async(tavolo) => {
    //tavolo information: dealer,small blind
    //hand information: bo
    return {};
};

const get_bets = async(tavolo) => {
    return {};
};

const get_cards = async(tavolo) => {
    return {};
};





const start_hand = async(tavolo) => {
    await db.delete_invites_table(tavolo);  //delete all invites to table
    const sockets = await io.in(tavolo).fetchSockets(); //get all sockets in table
    await db.create_hand(tavolo);    //create mano
    sockets.forEach(async(socket) => { 
        await db.update_ready(socket.id,"False");    // unready everyone
    });
    //create puntate
    //CartE

    //ordine players
    
    io.to(tavolo).emit("start hand",get_hand(tavolo));
    io.to(room).emit("players",get_players(room));
};

const end_hand = async(tavolo) => {
    io.to(tavolo).emit("end hand","end hand");
    //eliminare la mano o tenere traccia di tutte le mani del tavolo? per ora non serve la mano
    //delete mano?
    //delete player cards
    //update n_mano del tavolo
};







const io = new Server(server);

io.of("/").adapter.on("join-room", async (room, socket_id) => {
    await db.update_order(socket_id,(await io.in(room).fetchSockets().size))
    await db.update_fiches(socket_id,STARTING_FICHES)
    io.to(room).emit("players",get_players(room));
});

io.of("/").adapter.on("leave-room", async (room, socket_id) => {
    await db.update_order(socket_id,"NULL")
    await db.update_fiches(socket.id,"NULL");
    // change all ordine
    if ((await io.in(room).fetchSockets().size) === 0) {
        await db.delete_table(room);
    } else {
        io.to(room).emit("players",get_players(room));
    };
});

io.on("connection", (socket) => {
    console.log("socket connected: " + socket.id);

    /* STRUTTURA */
    /* 1: get dei dati (usernames e sockets) */
    /* 2: operazioni nel database/rooms */
    /* 3: risposta ai sockets */

    socket.on("login", async (m) => {
        const username = m.username;
        const friendships = await get_friendships(username);

        await db.create_player(socket.id,username);

        socket.emit("friends",friendships);
        socket.emit("request",get_requests(username));

        friendships.forEach((friend) => {
            if (friend.socket) {
                io.to(friend.socket).emit("friends",get_friendships(friend.username));
            };
        });
    });

    socket.on("logout", async () => {
        logout(socket.id);        
    });

    /* INVITI AL TAVOLO */

    socket.on("invite", async (m) => {
        //si può invitare anche quando non si è alla prima mano?
        const username2 = m.username;
        const socket2 = await (db.get_socket(username2))[0];

        await db.create_invite(socket.id,socket2,socket.rooms[0]);
            
        io.to(socket.id).emit("invite",get_invites(socket.id));
        io.to(socket2).emit("invite",get_invites(socket2));
    });

    socket.on("accept_invite", async (m) => {
        const username1 = m.username;
        const socket1 = (await db.get_socket(username1))[0];
    
        await db.delete_invite(socket1,socket.id);
        await update_player_table(socket.id, socket.rooms[0]);
        io.in(socket.id).socketsJoin(socket.rooms[0]);

        io.to(socket1).emit("invite",get_invites(socket1));
        io.to(socket.id).emit("invite",get_invites(socket.id));
    });

    socket.on("reject_invite", async (m) => {
        const username1 = m.username;
        const socket1 = (await db.get_socket(username1))[0];

        await db.delete_invite(socket1,socket.id);

        io.to(socket1).emit("invite",get_invites(socket1));
        io.to(socket.id).emit("invite",get_invites(socket.id));
    });



    /* RICHIESTE DI AMICIZIA */

    socket.on("request", async (m) => {
        //questo quando cerca un username, mettere try catch
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

        io.to(socket1).emit("request",get_requests(username1));
        io.to(socket.id).emit("request",get_requests(username2));
        io.to(socket1).emit("friends",get_friendships(username1));
        io.to(socket.id).emit("friends",get_friendships(username2));
    });

    socket.on("reject_request", async (m) => {
        const username1 = m.username;
        const username2 = (await db.get_username(socket.id))[0];
        const socket1 = (await db.get_socket(username1))[0];

        await db.delete_request(username1,username2);

        io.to(socket1).emit("request",get_requests(username1));
        io.to(socket.id).emit("request",get_requests(username2));
    });

    socket.on("remove_friendship", async (m) => {
        const usernamex = m.username;
        const usernamey = (await db.get_username(socket.id))[0];
        const socketx = (await db.get_socket(usernamex))[0];

        await db.delete_friendship(usernamex,usernamey);

        io.to(socketx).emit("friends",get_friendships(usernamex));
        io.to(socket.id).emit("friends",get_friendships(usernamey));
    });



    /* GIOCO */

    socket.on("ready", async () => {
        await db.update_ready(socket.id,"True");
        const all_ready = await db.check_ready(socket.rooms[0]);

        io.to(socket.rooms[0]).emit("players",get_players(socket.rooms[0]));
        if (all_ready.every(Boolean)) {
            start_hand(socket.rooms[0])
        };
    });

    socket.on("unready", async () => {
        await db.update_ready(socket.id,"False");

        io.to(socket.rooms[0]).emit("players",get_players(socket.rooms[0]));
    });

    socket.on("move", async () => {
        //io.to(tavolo).emit("move",);
        //io.to(socket).emit("turn",);
        //update fiches
        //update puntata
        //await end_hand(tavolo)
    });


    // ready => starta hand => Mano,fiches,Puntata,CartE => fine hand => ready ...
    // unready
    // moves => logica di gioco server
    // quit, leave

    socket.on("quit_table", async () => {
        await db.delete_invites_player(socket.id);              //inviti
        await db.update_ready(socket.id,"False");               //pronto
        await db.update_player_table(socket.id,"NULL");         //tavolo
        io.in(socket.id).socketsLeave(socket.rooms[0]);         //ordine,fiches
    });

    socket.on("quit_hand_and_table", async (m) => {
        await db.delete_invites_player(socket.id);              //inviti
        await db.update_ready(socket.id,"False");               //pronto
        await db.update_player_table(socket.id,"NULL");         //tavolo
        await db.update_player_cards(socket.id,"NULL","NULL")   //carte
        io.in(socket.id).socketsLeave(socket.rooms[0]);         //ordine,fiches
    });

    socket.on("disconnect", async () => {
        io.in(socket.id).socketsLeave(socket.rooms[0]);
        await logout(socket.id);                                //player
    });
});

server.listen(80, () => {
    console.log("server running on port: " + 80);
});
