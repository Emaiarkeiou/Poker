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
    if (await db.login(req.body.username,req.body.password)) {
        res.json({ result: "ok" });
    } else {
        res.status(401); //401 è il codice unauthorized
        res.json({ result: "Unauthorized" });
    }
});

app.post("/signup", async(req, res) => {
    if (await db.check_username(req.body.username)) {
        res.status(406); //not acceptable
        res.json({ result: "username taken" });
    } else {
        await db.signup(req.body.username, req.body.password);
        res.json({ result: "ok" });
    }
});

app.post("/create_table", async(req, res) => {
    if (await db.login(req.headers.username,req.headers.password)) {
        const tavolo = await db.create_table(req.headers.username);
        const player = (await db.get_socket(req.headers.username))[0];
        await update_player_table(player.socket, tavolo);
        io.in(player.socket).socketsJoin(tavolo);
        res.json({ result: "ok" });
    } else {
        res.status(401); //401 è il codice unauthorized
        res.json({ result: "Unauthorized" });
    };
});






const get_requests = async(username) => {
    return await db.get_requests(username);
};

const get_friends = async(username) => {
    const amicizie = await db.get_friendships(username);
    const amici = [];
    amicizie.forEach(async(amicizia) => {
        if (amicizia.utente1 === username) {
            let online = (await db.get_socket(amicizia.utente2)).length;
            amici.push({username:amicizia.utente2,online:online});
        } else {
            let online = (await db.get_socket(amicizia.utente1)).length;
            amici.push({username:amicizia.utente1,online:online});
        };
    });
    return amici; //lista di {username:username,online:0/1}
};


const get_invites = async(socket) => {
    return await db.get_invites(socket);
    // filtrare via lo username di chi ha chiesto
};

const get_players = async(tavolo) => {
    //general info: TUTTI i giocatori del tavolo con pronto, fiches, ordine, eliminato
    //get_orders
    return {};
};

const get_hand = async(tavolo,giro,turno) => {
    //tavolo information: dealer/n_mano, //gestire chi parte prima, turno
                        //turno(il primo turno è del 2* giocatore, lo small blind), 
                        //giro
                        //small blind fiches = n_mano*0.5
    //hand information: //puntate del giro, somma totale di tutte le puntate non del giro, //carte
    //get_hand_cards(giro)
    return {};
};

const get_hand_cards = async(tavolo,giro) => {
    //in base al giro fa vedere n carte
    let carte = [];
    if (giro >= 2) {
        carte.push(await db.get_hand_card(tavolo,1))
        carte.push(await db.get_hand_card(tavolo,2))
        carte.push(await db.get_hand_card(tavolo,3))
        if (giro >= 3) {
            carte.push(await db.get_hand_card(tavolo,4))
            if (giro == 4) {
                carte.push(await db.get_hand_card(tavolo,5))
            };
        };
    };
    return carte;
};

const get_player_cards = async(socket) => {
    //restituisce le carte del giocatore [{id,valore,seme,path} x2]
    return [await db.get_player_card(socket,1),await db.get_player_card(socket,2)];
};

const calcola_punti = async(tavolo,carte) => {
    for (let i = 1; i<6 ; i++) {
        carte.push(await db.get_hand_card(tavolo,i))
    };
    return 1;
};

const calcola_vincitori = async(tavolo,players) => {
    let punti = [], vincitori = [];
    players.forEach(async(player) => {
        punti.push(await calcola_punti(tavolo,await get_player_cards(player.socket)));    //push del punteggio del giocatore
    });
    let max = Math.max(...punti);
    let indici = punti.reduce((r, v, i) => r.concat(v === max ? i : []), []);       //lista indici di chi ha i punti massimi
    indici.forEach((i) => {
        vincitori.push(players[i].ordine);      //push dell'ordine
    })
    return vincitori;
};

const get_players_cards = async(tavolo) => {
    let all_cards = [];
    (await db.get_players_by_table(tavolo)).forEach(async(player) => {
        let carte = await get_player_cards(player.socket);
        all_cards[player.ordine] = carte;
    });
    return all_cards;      //{ordine : [ {id,valore,seme,path} , {id,valore,seme,path} ], x n}
};



const scala_ordine = async(tavolo) => {
    const lunghezza = (await io.in(room).fetchSockets()).length;
    const ordini = await get_orders(tavolo);
    for (let i=0;i<lunghezza;i++){
        await db.update_player_order_by_order(tavolo,ordini[i].ordine,i+1)
    };
};




const start_hand = async(tavolo) => {
    await db.delete_invites_table(tavolo);  //delete all invites to table
    const sockets = await io.in(tavolo).fetchSockets(); //get all sockets in table
    await db.create_hand(tavolo);    //create mano con turno=2 e giro=1

    let carte = await db.get_n_cards((sockets.length*2)+5);   //carte
    carte = carte.map((carta) => carta.id);
    await db.update_hand_cards(tavolo,carte.splice(0,5));
    
    sockets.forEach(async(socket) => {
        await db.update_ready(socket.id,"False");    // unready everyone
        await db.update_player_cards(socket.id,carte.splice(0,2));
    });

    io.to(tavolo).emit("start hand",await get_hand(tavolo,1,2));
    io.to(room).emit("players",await get_players(room));

    io.to((await db.get_player_by_order(tavolo,2)).socket).emit("turn",{giro:1,turno:2});  //inizia il giocatore 2 del giro 1, lo small blind
};

const end_hand = async(tavolo,vincitori) => {
    io.to(tavolo).emit("all cards",await get_players_cards(tavolo));
    io.to(tavolo).emit("end hand",{vincitori:vincitori});
    vincitori.forEach(async (vincitore)=> { //vincitore = ordine del player
        let somma = (await db.get_bets_sum(tavolo))[0]["SUM(somma)"];
        let player = await db.get_player_by_order(tavolo,vincitore);
        await db.update_fiches(player.socket, "fiches + " + Math.floor(somma/vincitori.length))
    });
    await db.delete_hand(tavolo);               //delete mano
    await db.delete_all_player_cards(tavolo);   //delete player cards
    await db.increment_table_hand(tavolo);      //update n_mano del tavolo

    await db.delete_placeholders(tavolo);
    await scala_ordine(tavolo);
    await db.revisit_elimated(tavolo);
    io.to(tavolo).emit("players",await get_players(tavolo));
};

const logout = async (socket_id) => {
    try {
        const player = (await db.get_username(socket_id))[0];
        const friends_list = await get_friends(player.username);

        await db.delete_player(socket_id);

        friends_list.forEach(async(friend) => {
            if (friend.socket) {
                io.to(friend.socket).emit("friends",await get_friends(friend.username));
            };
        });

        const invited_list = await get_invites(socket_id);        
        invited_list.forEach(async(invited) => {
            if (invited.socket) {
                io.to(invited.socket).emit("invite",await get_invites(invited.socket));
            };
        });
    } catch {};
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
    "error"         manda una stringa con l'errore
*/

const io = new Server(server);

io.of("/").adapter.on("join-room", async (room, socket_id) => {
    if (room != socket_id) {
        console.log("join "+room)
        await db.update_player_order(socket_id,((await io.in(room).fetchSockets()).length))
        await db.update_fiches(socket_id,STARTING_FICHES)
        io.to(room).emit("players",await get_players(room));
    };
});

io.of("/").adapter.on("leave-room", async (room, socket_id) => {
    if (room != socket_id) {
        console.log("left "+room)
        const player = await db.get_player(socket_id);
        const turno = await db.get_hand_turn_round(room);
        if (turno.giro) {        //se si è in una mano, crea un placeholder
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
    };
});

io.on("connection", (socket) => {
    
    /* STRUTTURA */
    /* 1: get dei dati (usernames e sockets) */
    /* 2: operazioni nel database/rooms */
    /* 3: risposta ai sockets */

    socket.on("login", async (m) => {
        const username = m.username;
        if ((await db.get_socket(username)).length) {
            socket.emit("error","user already logged in");
        } else {
            console.log("socket logged: " + socket.id);
            await db.create_player(socket.id,username);
            const friendships = await get_friends(username);

            socket.emit("friends",friendships);
            socket.emit("request",await get_requests(username));

            friendships.forEach(async(friend) => {
                if (friend.socket) {
                    io.to(friend.socket).emit("friends",await get_friends(friend.username));
                };
            });
        };
        
    });

    socket.on("logout", async () => {
        logout(socket.id);        
    });



    /* INVITI AL TAVOLO */

    socket.on("invite", async (m) => {
        const username2 = m.username;
        const socket2 = (await db.get_socket(username2))[0].socket;

        await db.create_invite(socket.id,socket2,socket.rooms[0]);
            
        io.to(socket.id).emit("invite",await get_invites(socket.id));
        io.to(socket2).emit("invite",await get_invites(socket2));
    });

    socket.on("accept_invite", async (m) => {
        const username1 = m.username;
        const socket1 = (await db.get_socket(username1))[0].socket;
    
        await db.delete_invite(socket1,socket.id);
        await update_player_table(socket.id, socket.rooms[0]);
        io.in(socket.id).socketsJoin(socket.rooms[0]);

        io.to(socket1).emit("invite",await get_invites(socket1));
        io.to(socket.id).emit("invite",await get_invites(socket.id));
    });

    socket.on("reject_invite", async (m) => {
        const username1 = m.username;
        const socket1 = (await db.get_socket(username1))[0].socket;

        await db.delete_invite(socket1,socket.id);

        io.to(socket1).emit("invite",await get_invites(socket1));
        io.to(socket.id).emit("invite",await get_invites(socket.id));
    });



    /* RICHIESTE DI AMICIZIA */

    socket.on("request", async (m) => {
        if ((await db.get_username(socket.id)).length) {
            const username1 = (await db.get_username(socket.id))[0].username;
            const username2 = m.username;
            if (await db.check_username(username2)) {
                await db.create_request(username1,username2);
                io.to(socket.id).emit("request",await get_requests(username1));

                if ((await db.get_socket(username2)).length) {
                    const socket2 = (await db.get_socket(username2))[0].socket;
                    io.to(socket2).emit("request",await get_requests(username2));
                };
            };
        };

    });

    socket.on("accept_request", async (m) => {
        const username1 = m.username;
        const username2 = (await db.get_username(socket.id))[0].username;
        
        await db.accept_request(username1,username2);

        if ((await db.get_socket(username1)).length) {
            const socket1 = (await db.get_socket(username1))[0].socket;
            io.to(socket1).emit("request",await get_requests(username1));
            io.to(socket1).emit("friends",await get_friends(username1));
        };
        io.to(socket.id).emit("request",await get_requests(username2));
        io.to(socket.id).emit("friends",await get_friends(username2));
    });

    socket.on("reject_request", async (m) => {
        const username1 = m.username;
        const username2 = (await db.get_username(socket.id))[0].socket;

        await db.delete_request(username1,username2);

        if ((await db.get_socket(username1)).length) {
            const socket1 = (await db.get_socket(username1))[0].socket;
            io.to(socket1).emit("request",await get_requests(username1));
        };
        io.to(socket.id).emit("request",await get_requests(username2));
    });

    socket.on("remove_friendship", async (m) => {
        const usernamex = m.username;
        const usernamey = (await db.get_username(socket.id))[0].username;

        await db.delete_friendship(usernamex,usernamey);
        await db.delete_friendship(usernamey,usernamex);

        if ((await db.get_socket(usernamex)).length) {
            const socketx = (await db.get_socket(usernamex))[0].socket;
            io.to(socketx).emit("friends",await get_friends(usernamex));
        };
        io.to(socket.id).emit("friends",await get_friends(usernamey));
    });



    /* GIOCO */

    socket.on("ready", async () => {
        await db.update_ready(socket.id,"True");
        let all_ready = await db.check_ready(socket.rooms[0]);
        all_ready = all_ready.map((pronto) => pronto.pronto);
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
        const giro = parseInt(m.giro);
        let turno = parseInt(m.turno);
        const tipo = m.tipo;
        const fiches_puntate = parseInt(m.somma);
        const tavolo = socket.rooms[0];

        if (["check","call","raise","all-in","small-blind","big-blind","fold"].includes(tipo)) { //tipo? check allin raise call fold small blind big blind
            if (await db.check_fiches(socket.id,fiches_puntate)) {              //check che il giocatore abbia abbastanza fiches
                await db.update_fiches(socket.id,"fiches - "+fiches_puntate);   //update delle fiches del giocatore
                if ((await db.get_bet(socket.id,tavolo,giro)).length) {         //check che la puntata del giro esista già
                    await db.add_to_bet(socket.id,tavolo,giro,fiches_puntate);  //update della puntata
                } else {
                    await db.create_bet(socket.id,tavolo,giro,fiches_puntate);  //creazione della puntata
                };
            };
        };
        if (tipo==="fold") {
            await db.update_eliminated(socket.id,"True");
        };
        io.to(tavolo).emit("move",{tipo:tipo,puntata:(await get_bet(socket.id,tavolo,giro))[0]});

        const in_gioco = await db.get_players_in_hand(tavolo);      //lista dei giocatori ancora in gioco {socket,ordine,fiches}
        
        if (!(await db.check_bets(tavolo,giro))) {              //check if tutti non eliminati hanno puntato o non hanno abbastanza (all in)
            if (giro==4 || await db.check_allin(tavolo)) {          //check if ultimo giro(4) or all in
                if (in_gioco.length === 1) {                            //if unico in gioco
                    await end_hand(tavolo,in_gioco[0].ordine);              //await end_hand(tavolo,ordine_vincitore)
                } else {
                    if (await db.check_allin(tavolo)) {                                 //else if all in
                        io.to(tavolo).emit("hand",await get_hand(tavolo, 4, turno));        //aggiunge a hand le nuove carte, cambiando il giro a 4
                    };
                    let vincitori = await calcola_vincitori(tavolo,in_gioco);       //calcolo vincitore,tra le sockets in gioco ,restituisce l'ordine dei vincitori
                    await end_hand(tavolo,vincitori);    //await end_hand(tavolo,ordine_vincitori)
                };
            } else {
                await db.update_hand_round(tavolo,giro+1);      //prossimo giro
                await db.update_hand_turn(tavolo,2);            //turno = 2(small blind, perchè 1 è dealer)     
            };
        } else {
            turno = turno == in_gioco.length ? 1 : turno+1;   //se l'indice è l'ultimo, ritorna al primo, altrimenti aumenta di 1
            await db.update_hand_turn(tavolo,turno);        //turno => indice+1 dell'elemento della lista di chi è ancora in gioco
        };

        if (giro < 4) {
            if (tipo === "big-blind") {
                in_gioco.forEach(async(player) => {
                    io.to(player.socket).emit("your cards",await get_player_cards(player.socket));
                });
            };
            io.to(tavolo).emit("hand",await get_hand(tavolo, giro, turno));
            io.to(in_gioco[turno-1].socket).emit("turn",{turno:turno,giro:giro});       //manda turno e giro per conferma
        };
    });



    /* USCITA */

    socket.on("quit_table", async () => {
        io.in(socket.id).socketsLeave(socket.rooms[0]);
    });

    socket.on("disconnect", async () => {
        io.in(socket.id).socketsLeave(socket.rooms[0]);         
        await logout(socket.id);                                //player
    });
});

server.listen(80, () => {
    console.log("server running on port: " + 80);
});

// listen for TERM signal .e.g. kill
process.on ('SIGTERM', async () => {
    await db.delete_all_players();
}); 
/*
// listen for INT signal e.g. Ctrl-C
process.on ('SIGINT', async () => {
    await db.delete_all_players();
}); 
*/
process.on('exit', async () => {
    await db.delete_all_players();
}); 
