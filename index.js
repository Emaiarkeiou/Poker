const fs = require("fs");
const express = require("express");
const http = require("http");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");

const db = require("./database.js");
const carte = require("./carte.js");
const init = async () => {
    await db.createTables(); //crea le tabelle se non esistono
    await carte.generate_cards();
    console.log("creato")
}
init();

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
    const amicizie = await db.get_friendships(username);
    //db.get_socket(username)
    // mandare solo una lista di oggetti {username:,online:}
    // la socket per capire se è online
    // filtrare via lo username di chi ha chiesto e stato
};


const get_players = async(tavolo) => {
    //general info: tutti i giocatori del tavolo con pronto, fiches, ordine
    return {};
};

const get_hand = async(tavolo,giro,turno) => {
    //tavolo information: dealer/n_mano, 
                        //turno(il primo turno è del 2* giocatore, lo small blind), 
                        //giro
                        //small blind fiches = n_mano*0.5
    //hand information: //somma puntate, //carte
    //get_hand_cards(giro)
    return {};
};

const get_hand_cards = async(tavolo,giro) => {
    //in base al giro fa vedere n carte
    return {};
};






const start_hand = async(tavolo) => {
    await db.delete_invites_table(tavolo);  //delete all invites to table
    const sockets = await io.in(tavolo).fetchSockets(); //get all sockets in table
    await db.create_hand(tavolo);    //create mano con turno=2 e giro=1

    const carte = await db.get_n_cards((sockets.length*2)+5);   //carte
    await db.update_hand_cards(tavolo,carte.splice(0,5));

    sockets.forEach(async(socket) => { 
        await db.update_ready(socket.id,"False");    // unready everyone
        await db.update_player_cards(socket.id,carte.splice(0,2));
    });

    io.to(tavolo).emit("start hand",get_hand(tavolo,1,2));
    io.to(room).emit("players",get_players(room));

    io.to((await db.get_player_by_order(tavolo,2))[0]).emit("turn",{giro:1,turno:2});  //inizia il giocatore 2 del giro 1, lo small blind
};

const end_hand = async(tavolo) => {
    io.to(tavolo).emit("end hand","end hand");
    //eliminare la mano o tenere traccia di tutte le mani del tavolo? per ora non serve la mano
    await db.delete_hand(tavolo);     //delete mano
    const sockets = await io.in(tavolo).fetchSockets(); //get all sockets in table
    sockets.forEach(async(socket) => { 
        await db.update_player_cards(socket.id,"NULL","NULL");   //delete player cards
    });
    await db.increment_table_hand(tavolo);      //update n_mano del tavolo
};

const scala_ordine = async (tavolo,ordine) => {
    for (let i=ordine+1; i<(await io.in(tavolo).fetchSockets()).length+2; i++) {        //si scala l'ordine
        await db.decrement_player_order(tavolo,i);
    };
    
    const turno = (await db.get_hand_turn_round(tavolo))[0];    //{turno:n,giro:n}
    if (ordine == turno.turno) {
        io.to((await db.get_player_by_order(tavolo,ordine))).emit("turn",turno);   // resend turno allo stesso ordine
    } else {
        
    };
    io.to(tavolo).emit("players",get_players(tavolo));
};



/* DESCRIZIONE MESSAGGI CHE MANDA IL SERVER
    "request"       manda tutte le richieste di amicizia mandate o ricevute dal client
    "invite"        manda tutti gli inviti al tavolo mandati o ricevuti dal client
    "friends"       manda tutti gli username e stati online degli amici del client
    "start hand"    manda le informazioni generali della mano: piatto, dealer, small blind, turno
    "players"       manda le informazioni generali dei giocatori del tavolo: pronto, fiches, ordine(per disegnarli in ordine)
    "your cards"    manda le carte del client con id e immagine
    "hand"          manda le informazioni generali della mano: piatto, dealer, small blind, turno, giro, carte presenti
    "turn"          dice al client che è il suo turno e manda il turno per verificare
    "move"          manda le informazioni della mossa fatta
    "end hand"      manda il vincitore e dice al client che la mano è finita
*/

const io = new Server(server);

io.of("/").adapter.on("join-room", async (room, socket_id) => {
    await db.update_player_order(socket_id,((await io.in(room).fetchSockets()).length))
    await db.update_fiches(socket_id,STARTING_FICHES)
    io.to(room).emit("players",get_players(room));
});

io.of("/").adapter.on("leave-room", async (room, socket_id) => {
    await db.update_ready(socket_id,"False");               //pronto
    await db.update_player_table(socket_id,"NULL");         //tavolo
    await db.update_player_cards(socket_id,"NULL","NULL")   //carte
    await db.update_fiches(socket_id,"NULL");               //fiches

    const ordine = (await db.get_player_order(socket_id))[0];
    await db.update_player_order(socket_id,"NULL");         //ordine
    if ((await io.in(room).fetchSockets()).length === 0) {
        await db.delete_table(room);
    } else {
        await db.delete_invites_player(socket_id);              //inviti
        await scala_ordine(room,ordine);
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
            if (friend.online) {
                io.to(friend.socket).emit("friends",get_friendships(friend.username));
            };
        });
    });

    socket.on("logout", async () => {
        logout(socket.id);        
    });



    /* INVITI AL TAVOLO */

    socket.on("invite", async (m) => {
        //si può invitare anche quando non si è alla prima mano?si
        const username2 = m.username;
        const socket2 = (await db.get_socket(username2))[0];

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



    socket.on("move", async (m) => {
        /* 
            check: bussare
            call: chiamare
            raise: rilanciare
            fold: lasciare
            small blind
            big blind
        */
        
        //tipo? allin raise call fold small blind big blind
        //update/create puntata
        //update fiches
        //fold o perso
            //togli l'ordine,scala_ordine(socket.rooms[0],(await db.get_player_order(socket.id))[0])
        //check if theres enough fiches
        //io.to(socket.rooms[0]).emit("move",{tipo,puntata,});

        //check if tutti hanno puntato o non hanno abbastanza (all in) o non hanno order
            //check if ultimo giro(4) or all in
                // guarda chi è ancora in gioco(chi è in ordine e controlla se è l'unico in gioco)
                    /////controllo unico in gioco
                    //if all in
                        //aggiunge a get_hand le nuove carte, cambiando il giro a 4
                        //io.to(socket.rooms[0]).emit("hand",);
                    //calcolo vincitore,tra le sockets con ordine
                    //await end_hand(tavolo,ordine_vincitore)
            //else
                //prossimo giro
                //update hand round (giro+1)
                //turno = 2(small blind, perchè 1 è dealer)
        //else
            //prendi ordine/turno
            //select ordine/turno = $ordine/turno+1 o 1 (ordine ciclico)
            //update_hand_turn(socket.rooms[0],turno) 
            //turno sarebbe il numero(ordine) del giocatore che deve giocare

        //if giro < 4?
            //io.to(socket.rooms[0]).emit("hand",get_hand(tavolo,giro,turno));
            //get_player_by_order
            //io.to(socket).emit("turn",{turno:,giro:});
    });



    /* USCITA */

    socket.on("quit_table", async () => {
        io.in(socket.id).socketsLeave(socket.rooms[0]);
    });

    socket.on("disconnect", async () => {
        io.in(socket.id).socketsLeave(socket.rooms[0]); 
        //await 
        await logout(socket.id);                                //player
    });
});

server.listen(80, () => {
    console.log("server running on port: " + 80);
});
