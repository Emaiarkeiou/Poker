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
app.use("/cards", express.static(path.join(__dirname, "assets/cards")));

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

    friends_list.forEach(async(friend) => {
        if (friend.socket) {
            io.to(friend.socket).emit("friends",await get_friendships(friend.username));
        };
    });

    const invited_list = await get_invites(socket_id);        
    invited_list.forEach(async(invited) => {
        if (invited.socket) {
            io.to(invited.socket).emit("invite",await get_invites(invited.socket));
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
    return {};
    //db.get_socket(username)
    // mandare solo una lista di oggetti {username:,online:}
    // la socket per capire se è online
    // filtrare via lo username di chi ha chiesto e stato
};


const get_players = async(tavolo) => {
    //general info: TUTTI i giocatori del tavolo con pronto, fiches, ordine, eliminato
    //get_orders
    return {};
};

const get_hand = async(tavolo,giro,turno) => {
    //tavolo information: dealer/n_mano, 
                        //turno(il primo turno è del 2* giocatore, lo small blind), 
                        //giro
                        //small blind fiches = n_mano*0.5
    //hand information: //puntate, //carte
    //get_hand_cards(giro)
    return {};
};

const get_hand_cards = async(tavolo,giro) => {
    //in base al giro fa vedere n carte
    return {};
};

const get_player_cards = async(socket) => {
    //restituisce le carte del giocatore
    return {};
};

const get_players_cards = async(tavolo) => {
    //restituisce le carte e ordine dei giocatori non eliminati del tavolo
    return {};
};

const scala_ordine = async(tavolo) => {
    const lunghezza = (await io.in(room).fetchSockets()).length;
    const ordini = await get_orders(tavolo);
    for (let i=0;i<lunghezza;i++){
        await db.update_player_order_by_order(tavolo,ordini[i],i+1)
    };
};




const start_hand = async(tavolo) => {
    await db.delete_invites_table(tavolo);  //delete all invites to table
    const sockets = await io.in(tavolo).fetchSockets(); //get all sockets in table
    await db.create_hand(tavolo);    //create mano con turno=2 e giro=1

    const carte = await db.get_n_cards((sockets.length*2)+5);   //carte
    await db.update_hand_cards(tavolo,carte.splice(0,5));

    sockets.forEach(async(socket) => { 
        if ((await db.get_player(socket.id))[0].fiches) {
            await db.update_eliminated(socket.id,"False");
        };
        await db.update_ready(socket.id,"False");    // unready everyone
        await db.update_player_cards(socket.id,carte.splice(0,2));
    });

    io.to(tavolo).emit("start hand",await get_hand(tavolo,1,2));
    io.to(room).emit("players",await get_players(room));

    io.to((await db.get_player_by_order(tavolo,2))[0].socket).emit("turn",{giro:1,turno:2});  //inizia il giocatore 2 del giro 1, lo small blind
};

const end_hand = async(tavolo,vincitori) => {
    io.to(tavolo).emit("all cards",await get_players_cards(tavolo));
    io.to(tavolo).emit("end hand",{vincitori:vincitori});
    vincitori.forEach(async (vincitore)=> { //vincitore = ordine del player
        let somma = await db.get_hand_bets_sum(tavolo);
        let player = await db.get_player_by_order(tavolo,vincitore)
        await db.update_fiches(player.socket, player.fiches + Math.floor(somma/vincitori.length))
    });
    await db.delete_hand(tavolo);               //delete mano
    await db.delete_all_player_cards(tavolo);   //delete player cards
    await db.increment_table_hand(tavolo);      //update n_mano del tavolo

    await db.delete_placeholders();
    await scala_ordine(tavolo);
    io.to(tavolo).emit("players",await get_players(tavolo));
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
    "move"          manda le informazioni della mossa fatta: tipo e puntata
    "all cards"     manda tutte le carte dei giocatori in gioco
    "end hand"      manda il vincitore e dice al client che la mano è finita
*/

const io = new Server(server);

io.of("/").adapter.on("join-room", async (room, socket_id) => {
    await db.update_player_order(socket_id,((await io.in(room).fetchSockets()).length))
    await db.update_fiches(socket_id,STARTING_FICHES)
    io.to(room).emit("players",await get_players(room));
});

io.of("/").adapter.on("leave-room", async (room, socket_id) => {
    const player = (await db.get_player(socket_id))[0];
    const turno = (await db.get_hand_turn_round(tavolo))[0];
    if (turno) {        //se si è in una mano, crea un placeholder
        await db.create_placeholder(socket_id,room,player.ordine,"True");       //socket,tavolo,ordine,eliminato
        await db.update_player_cards(socket_id,"NULL","NULL");   //carte
    } else {
        await scala_ordine(room);
    };

    await db.update_player_table(socket_id,"NULL");         //tavolo
    await db.update_ready(socket_id,"False");               //pronto
    await db.update_eliminated(socket_id,"False");          //eliminato
    await db.update_fiches(socket_id,"NULL");               //fiches
    await db.update_player_order(socket_id,"NULL");         //ordine

    if ((await io.in(room).fetchSockets()).length === 0) {
        await db.delete_table(room);
    } else {
        await db.delete_invites_player(socket_id);              //inviti
        io.to(tavolo).emit("players",await get_players(tavolo));
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
        socket.emit("request",await get_requests(username));

        friendships.forEach(async(friend) => {
            if (friend.online) {
                io.to(friend.socket).emit("friends",await get_friendships(friend.username));
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
            
        io.to(socket.id).emit("invite",await get_invites(socket.id));
        io.to(socket2).emit("invite",await get_invites(socket2));
    });

    socket.on("accept_invite", async (m) => {
        const username1 = m.username;
        const socket1 = (await db.get_socket(username1))[0];
    
        await db.delete_invite(socket1,socket.id);
        await update_player_table(socket.id, socket.rooms[0]);
        io.in(socket.id).socketsJoin(socket.rooms[0]);

        io.to(socket1).emit("invite",await get_invites(socket1));
        io.to(socket.id).emit("invite",await get_invites(socket.id));
    });

    socket.on("reject_invite", async (m) => {
        const username1 = m.username;
        const socket1 = (await db.get_socket(username1))[0];

        await db.delete_invite(socket1,socket.id);

        io.to(socket1).emit("invite",await get_invites(socket1));
        io.to(socket.id).emit("invite",await get_invites(socket.id));
    });



    /* RICHIESTE DI AMICIZIA */

    socket.on("request", async (m) => {
        //questo quando cerca un username, mettere try catch
        const username1 = (await db.get_username(socket.id))[0];
        const username2 = m.username;
        const socket2 = (await db.get_socket(username2))[0];

        await db.create_request(username1,username2);
            
        io.to(socket.id).emit("request",await get_requests(username1));
        io.to(socket2).emit("request",await get_requests(username2));
    });

    socket.on("accept_request", async (m) => {
        const username1 = m.username;
        const username2 = (await db.get_username(socket.id))[0];
        const socket1 = (await db.get_socket(username1))[0];
        
        await db.accept_request(username1,username2);

        io.to(socket1).emit("request",await get_requests(username1));
        io.to(socket.id).emit("request",await get_requests(username2));
        io.to(socket1).emit("friends",await get_friendships(username1));
        io.to(socket.id).emit("friends",await get_friendships(username2));
    });

    socket.on("reject_request", async (m) => {
        const username1 = m.username;
        const username2 = (await db.get_username(socket.id))[0];
        const socket1 = (await db.get_socket(username1))[0];

        await db.delete_request(username1,username2);

        io.to(socket1).emit("request",await get_requests(username1));
        io.to(socket.id).emit("request",await get_requests(username2));
    });

    socket.on("remove_friendship", async (m) => {
        const usernamex = m.username;
        const usernamey = (await db.get_username(socket.id))[0];
        const socketx = (await db.get_socket(usernamex))[0];

        await db.delete_friendship(usernamex,usernamey);

        io.to(socketx).emit("friends",await get_friendships(usernamex));
        io.to(socket.id).emit("friends",await get_friendships(usernamey));
    });



    /* GIOCO */

    socket.on("ready", async () => {
        await db.update_ready(socket.id,"True");
        const all_ready = await db.check_ready(socket.rooms[0]);

        io.to(socket.rooms[0]).emit("players",await get_players(socket.rooms[0]));
        if (all_ready.every(Boolean)) {
            start_hand(socket.rooms[0])
        };
    });

    socket.on("unready", async () => {
        await db.update_ready(socket.id,"False");

        io.to(socket.rooms[0]).emit("players",await get_players(socket.rooms[0]));
    });



    socket.on("move", async (m) => {
        /* 
            check: bussare
            call: chiamare
            raise: rilanciare
            fold: lasciare
            all-in
            small-blind
            big-blind
        */
        const giro = m.giro;
        const turno = m.turno;
        const tipo = m.tipo;
        const fiches_puntate = m.somma;
        const tavolo = socket.rooms[0];
        if (["check","call","raise","all-in","small-blind","big-blind","fold"].includes(tipo)) { //tipo? check allin raise call fold small blind big blind
            if (await db.check_fiches(socket.id,fiches_puntate)) {
                await db.create_bet(socket.id,tavolo,giro,fiches_puntate).then().catch((e)=> {db.add_to_bet(socket.id,tavolo,giro,fiches_puntate)});
            };
        };
        if (tipo==="fold") {
            await db.update_eliminated(socket.id,"True");
        };
        io.to(tavolo).emit("move",{tipo:tipo,puntata:await get_bet(socket.id,tavolo,giro)});

        const in_gioco = await db.get_players_in_hand(tavolo);      //lista dei giocatori ancora in gioco

        //check if tutti non eliminati hanno puntato o non hanno abbastanza (all in)
            //check if ultimo giro(4) or all in
                // guarda chi è ancora in gioco( controlla se è l'unico in gioco)
                    //if unico in gioco
                        //await end_hand(tavolo,ordine_vincitore)
                    //else if all in
                        //aggiunge a get_hand le nuove carte, cambiando il giro a 4
                        //io.to(socket.rooms[0]).emit("hand",);
                    //calcolo vincitore,tra le sockets in gioco
                    //await end_hand(tavolo,ordine_vincitore)
            //else
                //prossimo giro
                //update hand round (giro+1)
                //turno = 2(small blind, perchè 1 è dealer)
        //else
            //lista di tutti i giocatori non eliminati
            //update_hand_turn(socket.rooms[0],turno) //turno+1 posizione o 1 (ordine ciclico) 
            //turno sarebbe indice dell'elemento della lista di chi è ancora in gioco
        if (giro < 4) {
            if (tipo === "big-blind") {
                in_gioco.forEach(async(player) => {
                    io.to(player.socket).emit("your cards",await get_player_cards(player.socket));
                });
            };
            io.to(tavolo).emit("hand",await get_hand(tavolo, giro, turno));
            io.to(in_gioco[turno].socket).emit("turn",{turno:turno,giro:giro});
        };
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
