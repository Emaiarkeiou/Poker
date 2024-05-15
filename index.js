const fs = require("fs");
const express = require("express");
const http = require("http");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");

const db = require("./database.js");
const carte = require("./carte.js");
const { platform } = require("os");
const init = async () => {
    await db.createTables(); //crea le tabelle se non esistono
    await carte.generate_cards();
    console.log("creato")
}
init();


const STARTING_FICHES = 250;
const MAXPLAYERS = 8;

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
    if (await db.login(req.body.username, req.body.password)) {
        try {
            const tavolo = await db.create_table(req.body.username);
            const player = (await db.get_socket(req.body.username))[0];
            await db.update_player_table(player.socket, tavolo);
            io.in(player.socket).socketsJoin(tavolo);
            res.json({ result: "ok" });
        } catch {
            res.status(401); //401 è il codice unauthorized
            res.json({ result: "Unauthorized" });
        };
    } else {
        res.status(401); //401 è il codice unauthorized
        res.json({ result: "Unauthorized" });
    };
});

const logout = async (socket_id) => {
    try {
        const player = (await db.get_username(socket_id))[0];
        const friends_list = await get_friends(player.username);
        const invited_list = await get_invites(socket_id); //non spostare
        
        await db.delete_player(socket_id);

        await Promise.all(friends_list.map(async(friend) => {
            if (friend.online) {
                io.to((await db.get_socket(friend.username))[0].socket).emit("friends",await get_friends(friend.username));
            };
        }));

        await Promise.all(invited_list.map(async(invite) => {
            io.to(invite.giocatore1).emit("invite",await get_invites(invite.giocatore1));
            io.to(invite.giocatore2).emit("invite",await get_invites(invite.giocatore2));
        }));    
    } catch {};
};



// GIOCATORI, INVITI AL TAVOLO, RICHIESTE D'AMICIZIA

const get_requests = async(username) => {
    return await db.get_requests(username);
};

const get_friends = async(username) => {
    const amicizie = await db.get_friendships(username);

    let amici = await Promise.all(amicizie.map(async (amicizia) => {
        if (amicizia.utente1 == username) {
            let online = (await db.get_socket(amicizia.utente2)).length;
            return {username:amicizia.utente2,online:online};
        } else if(amicizia.utente2 == username) {
            let online = (await db.get_socket(amicizia.utente1)).length;
            return {username:amicizia.utente1,online:online};
        };
    }));
    return amici; //lista di {username:username,online:0/1}
};

const get_invites = async(socket) => {  //[{giocatore1:socket,giocatore2:socket,username1:username,username2:username,tavolo},]
    let invites = await Promise.all((await db.get_invites(socket)).map(async (invite) => {
        invite.username1 = (await db.get_username(invite.giocatore1))[0].username;
        invite.username2 = (await db.get_username(invite.giocatore2))[0].username;
        return invite;
    }));
    return invites;
};

const get_players_by_table = async(tavolo) => {
    //general info: TUTTI i giocatori del tavolo con username,pronto,ordine,fiches,eliminato
    return await db.get_players_by_table(tavolo);
};



// INFORMAZIONI DELLA MANO

const get_hand_info = async(tavolo) => { 
    //{n_mano:,small_blind:,dealer:,giro:,turno:,puntate_giro:,somma_tot:,carte:[{id,valore,seme,path}],
    // players:[{username,pronto,ordine,fiches,eliminato}],in_gioco:[{username,socket,ordine,fiches}]}
    let info = {};
    const inftavolo = (await db.get_table(tavolo))[0];
    info.n_mano = inftavolo.n_mano;
    info.small_blind = 1 + Math.floor(inftavolo.n_mano * 0.2)
    info.dealer = inftavolo.dealer;
    const mano = (await db.get_hand(tavolo))[0];
    info.giro = mano.giro;
    info.turno = mano.turno;
    let puntate_giro = await db.get_round_bets(tavolo,mano.giro);
    puntate_giro = await Promise.all(puntate_giro.map(async(puntata) => {
        puntata.username = (await db.get_username(puntata.giocatore))[0].username;
        return puntata;
    }));
    info.puntate_giro = puntate_giro;
    info.somma_tot = (await db.get_bets_sum(tavolo))[0]["SUM(somma)"];

    info.carte = await get_hand_cards(tavolo,mano.giro) //[{id,valore,seme,path}]
    info.players = await get_players_by_table(tavolo);
    info.in_gioco = await db.get_players_in_hand(tavolo);
    return info; 
};



// CARTE

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

const get_players_cards = async(tavolo) => {
    let all_cards = {};
    await Promise.all((await get_players_by_table(tavolo)).map(async(player) => {
        let carte = await get_player_cards(await db.get_socket(player.username));
        all_cards[player.ordine] = carte;
    }));
    return all_cards;      //{ordine : [ {id,valore,seme,path} , {id,valore,seme,path} ], x n}
};



// PUNTI E VINCITORI

const calcola_punti_player = async(tavolo,carte,ordine) => {
    /*
    {scala_reale:1, scala_colore:13-6, poker:14-2, full:[14-2,14-2], colore:1, scala:14-6, tris:14-2, d_coppia:[14-2,14-2], coppia:14-2, c_alta:14-2}
    */
    let punti = {ordine:ordine,    scala_reale:0,scala_colore:0,poker:0,full:[0,0],colore:0,scala:0,tris:0,d_coppia:[0,0],coppia:0,c_alta:0};

    punti.c_alta = Math.max(...carte.map(carta => carta.valore));

    for (let i = 1; i<6 ; i++) {
        carte.push(await db.get_hand_card(tavolo,i));
    };
    carte = carte.sort((a, b) => b.valore - a.valore);  //ordine decrescente

    for (let seme=1;seme<=4;seme++) {
        let ripet = (carte.filter(carta=> carta.valore == seme)).length;        //colore
        if (ripet >= 5) {
            punti.colore = 1;
            break;
        };
    };

    for (let val = 2; val<=carte[0].valore;val++) {                            //poker, full, tris, doppiacoppia, coppia
        let ripet = (carte.filter(carta=> carta.valore == val)).length;
        switch (ripet) {
            case 2:
                punti.full[1] = val;
                punti.d_coppia[1] = val;
                punti.d_coppia = (punti.d_coppia.sort()).reverse();
                punti.coppia = val;
                break;
            case 3:
                punti.full[0] = val;
                punti.tris = val;
                break;
            case 4:
                punti.poker = val;
                break;
        };
    };

    const len_scala = 5;

    for (let i=(carte.length-len_scala);i>0;i--) {      //scala reale, scala colore, scala
        let scala = true;
        let colore = true;
        for (let j=0;j<len_scala;j++) {
            if (carte[i+j].valore != carte[i].valore - j) {
                scala = false;
                break;
            };
            if (carte[i+j].seme != carte[i].seme) {
                colore = false;
            };
        };
        if (scala) {
            if (colore) {
                if (carte[i].valore == 14) {
                    punti.scala_reale = 1;
                } else {
                    punti.scala_colore = carte[i].valore;
                };
                break;
            } else {
                punti.scala = carte[i].valore;
            };
        };
    };
    return punti;
};

const calcola_vincitori = async(tavolo,players) => {
    let vincitori = [];
    let punti = await Promise.all(players.map(async(player) => {
        return await calcola_punti_player(tavolo,await get_player_cards(player.socket),player.ordine);    //push del punteggio del giocatore
    }));

    let doppie = ["full","d_coppia"]
    let categorie = ["scala_reale","scala_colore","poker","full","colore","scala","tris","d_coppia","coppia","c_alta"];

    for (const cat of categorie) {
        if (doppie.includes(cat)) {
            vincitori = punti.filter(punteggio => punteggio[cat].every(Boolean));
            if (vincitori.length) {
                let max = Math.max(...vincitori.map(punt => punt[cat][0]));
                vincitori = vincitori.filter(punt=> punt[cat][0] == max);
                if (vincitori.length > 1) {
                    max = Math.max(...vincitori.map(punt => punt[cat][1]));
                    vincitori = vincitori.filter(punt=> punt[cat][1] == max);
                };
                
            };
        } else {
            //{scala_reale:1, scala_colore:13-6, poker:14-2, full:[14-2,14-2], colore:1, 
            // scala:14-6, tris:14-2, d_coppia:[14-2,14-2], coppia:14-2, c_alta:14-2}
            vincitori = punti.filter(punteggio => punteggio[cat]);
            if (vincitori.length) {
                let max = Math.max(...vincitori.map(punt => punt[cat]));
                vincitori = vincitori.filter(punt=> punt[cat] == max);
            };
        };
        if (vincitori.length) {
            if (vincitori.length == 1) {
                break;
            } else {
                punti = vincitori;
            };
        };
    };

    vincitori = vincitori.map((vinc) => vinc.ordine);
    return vincitori;
};



// GESTIONE TAVOLO E MANI

const scala_ordine = async(tavolo) => {
    const lunghezza = (await io.in(tavolo).fetchSockets()).length;
    const ordini = await db.get_orders(tavolo);
    let dealer = (await db.get_table(tavolo))[0].dealer;
    let max = 0;
    for (let i=0;i<lunghezza;i++){
        if (ordini[i].ordine < dealer) {
            max = Math.max(max,ordini[i].ordine-(i+1));
        };
        await db.update_player_order_by_order(tavolo,ordini[i].ordine,i+1);
    };
    for (let i=0;i<max;i++) {
        if (dealer == 1) {
            await db.update_table_dealer(tavolo,lunghezza);
        } else {
            await db.decrement_table_dealer(tavolo);
            dealer--;
        };
    };
};

const start_hand = async(tavolo) => {
    await db.delete_invites_table(tavolo);  //delete all invites to table
    const sockets = await io.in(tavolo).fetchSockets(); //get all sockets in table
    await db.create_hand(tavolo,1,2);    //create mano con turno=2 e giro=1

    let carte = await db.get_n_cards((sockets.length*2)+5);   //carte
    carte = await Promise.all(carte.map((carta) => carta.id));
    await db.update_hand_cards(tavolo,carte.splice(0,5));
    
    await Promise.all(sockets.map(async(socket) => {
        await db.update_ready(socket.id,"False");    // unready everyone
        await db.update_player_cards(socket.id,carte.splice(0,2));
    }));

    io.to(tavolo).emit("start hand",await get_hand_info(tavolo));    
    io.to((await db.get_player_by_order(tavolo,2)).socket).emit("turn",{giro:1,turno:2});  //inizia il giocatore 2 del giro 1, lo small blind
};

const end_hand = async(tavolo,vincitori) => {
    console.log("VINCITORIIIII")
    io.to(tavolo).emit("all cards",await get_players_cards(tavolo));
    io.to(tavolo).emit("end hand",{vincitori:vincitori});
    await Promise.all(vincitori.map(async(vincitore) => {    //vincitore = ordine del player
        let somma = (await db.get_bets_sum(tavolo))[0]["SUM(somma)"];
        let player = await db.get_player_by_order(tavolo,vincitore);
        console.log("vincitore: ",(await db.get_username(player.socket))[0].username);
        await db.update_fiches(player.socket, "fiches + " + Math.floor(somma/vincitori.length));
        player = await db.get_player_by_order(tavolo,vincitore);
    }));
    await db.delete_hand(tavolo);                   //delete mano
    await db.delete_all_player_cards(tavolo);       //delete player cards
    if ((await db.get_table(tavolo))[0].dealer == (await io.in(tavolo).fetchSockets()).length) {
        await db.update_table_dealer(tavolo,1);     //update dealer del tavolo se è l'ultimo
    } else {
        await db.increment_table_dealer(tavolo);   //update dealer del tavolo 
    };

    await db.increment_table_hand(tavolo);   //update n_mano  del tavolo 
    await db.delete_placeholders(tavolo);
    await scala_ordine(tavolo);
    await db.revisit_elimated(tavolo);
    io.to(tavolo).emit("players",await get_players_by_table(tavolo));
};

/* DESCRIZIONE MESSAGGI CHE MANDA IL SERVER
    "request"       manda tutte le richieste di amicizia mandate o ricevute dal client
    "invite"        manda tutti gli inviti al tavolo mandati o ricevuti dal client
    "friends"       manda tutti gli username e stati online degli amici del client

    "players"       manda le informazioni generali dei giocatori del tavolo: pronto, fiches, ordine(per disegnarli in lobby)

    "start hand"    manda le informazioni generali della mano: piatto, dealer, small blind, turno,(comprende "players")

    "your cards"    manda le carte del client con id e immagine
    "hand"          manda le informazioni generali della mano: piatto, dealer, small blind, turno, giro, carte presenti,(comprende "players")
    "turn"          dice al client che è il suo turno e manda il turno per verificare
    "move"          manda le informazioni della mossa fatta: tipo e puntata

    "all cards"     manda tutte le carte dei giocatori in gioco
    "end hand"      manda il vincitore e dice al client che la mano è finita
    "error"         manda una stringa con l'errore
*/

const io = new Server(server);

io.of("/").adapter.on("join-room", async (room, socket_id) => {     //room=tavolo
    if (room != socket_id) {
        console.log("join "+room);
        await db.update_player_order(socket_id,((await io.in(room).fetchSockets()).length));
        await db.update_fiches(socket_id,STARTING_FICHES);
        io.to(room).emit("players",await get_players_by_table(room));
    };
});

io.of("/").adapter.on("leave-room", async (room, socket_id) => {    //room=tavolo
    if (room != socket_id) {
        console.log("left "+room);
        const player = await db.get_player(socket_id);
        let in_gioco = await db.get_players_in_hand(room);      //lista dei giocatori ancora in gioco in ordine [{socket,ordine,fiches},]

        await db.update_player_table(socket_id,"NULL");         //tavolo
        await db.update_ready(socket_id,"False");               //pronto
        await db.update_eliminated(socket_id,"False");          //eliminato
        await db.update_fiches(socket_id,"NULL");               //fiches
        await db.update_player_order(socket_id,"NULL");         //ordine
        await db.update_player_cards(socket_id,["NULL","NULL"]);   //carte

        if (!((await io.in(room).fetchSockets()).length)) {     //se non rimane nessuno
            await db.delete_table(room);
        } else {
            await db.delete_invites_player(socket_id);              //inviti
            if ((await db.get_hand(room)).length) { //non spostare      //se si è in una mano, crea un placeholder
                if ((await io.in(room).fetchSockets()).length == 1) {   //se ne rimane 1
                    try {
                        in_gioco = await db.get_players_in_hand(room);
                    await end_hand(room,[in_gioco[0].ordine]);      //end_hand
                    } catch {};
                } else {
                    await db.create_placeholder(socket_id,room,player.ordine,"True");       //socket,tavolo,ordine,eliminato
                    let mano = (await db.get_hand(room))[0];         //turno = indice+1 di in_gioco
                    console.log(in_gioco[mano.turno-1].ordine , player.ordine);
                    
                    if (in_gioco[mano.turno-1].ordine == player.ordine) {  //se era il turno di chi ha abbandonato
                        in_gioco = await db.get_players_in_hand(room);      //lista dei giocatori ancora in gioco [{socket,ordine,fiches},]
                        io.to(room).emit("hand",await get_hand_info(room));     //hand
                        mano.turno = mano.turno == 1 ? in_gioco.length : mano.turno-1;   //se il turno è dell'ultimo, ritorna al primo, altrimenti aumenta di 1
                        io.to(in_gioco[mano.turno-1].socket).emit("turn",{turno:mano.turno,giro:mano.giro}); ///awdawawdadawdawaww       //manda turno e giro per conferma
                    } else if (in_gioco[mano.turno-1].ordine > player.ordine) {
                        await db.update_hand_turn(room,"turno - 1");     //turno scala
                        io.to(room).emit("hand",await get_hand_info(room));     //hand
                    } else{
                        io.to(room).emit("hand",await get_hand_info(room));     //hand
                    };
                };
            } else {
                await scala_ordine(room);
                io.to(room).emit("players",await get_players_by_table(room));
            };
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
            try {
                await db.delete_player((await db.get_socket(username))[0].socket);
            } catch {};
        };
        console.log("socket logged: " + socket.id);
        await db.create_player(socket.id,username);
        const friends_list = await get_friends(username);

        socket.emit("friends",friends_list);
        socket.emit("request",await get_requests(username));
        await Promise.all(friends_list.map(async(friend) => {
            if (friend.online) {
                try {
                    io.to((await db.get_socket(friend.username))[0].socket).emit("friends",await get_friends(friend.username));
                } catch {};
            };
        }));

        
    });

    socket.on("logout", async () => {
        logout(socket.id);        
    });



    /* INVITI AL TAVOLO */

    socket.on("invite", async (m) => {
        if ([...socket.rooms].length > 1) {
            const username2 = m.username;
            const socket2 = (await db.get_socket(username2))[0].socket;

            await db.create_invite(socket.id,socket2,[...socket.rooms][1]);
                
            io.to(socket.id).emit("invite",await get_invites(socket.id));
            io.to(socket2).emit("invite",await get_invites(socket2));
        };
    });

    socket.on("accept_invite", async (m) => {
        const username1 = m.username;
        const socket1 = (await db.get_socket(username1))[0].socket;
        const tavolo = (await db.get_player(socket1)).tavolo;

        await db.delete_invite(socket1,socket.id);
        await db.update_player_table(socket.id, tavolo);
        io.in(socket.id).socketsJoin(tavolo);

        if (io.sockets.adapter.rooms.get(tavolo).size >= MAXPLAYERS) {
            await db.delete_invites_table(tavolo);
        };

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
            if (username1 != username2) {
                if (!((await db.get_request_or_friend(username1,username2)).length
                || (await db.get_request_or_friend(username2,username1)).length)) {
                    if (await db.check_username(username2)) {
                        await db.create_request(username1,username2);
                        io.to(socket.id).emit("request",await get_requests(username1));
                        if ((await db.get_socket(username2)).length) {
                            const socket2 = (await db.get_socket(username2))[0].socket;
                            io.to(socket2).emit("request",await get_requests(username2));
                        };
                    };
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
        const username2 = (await db.get_username(socket.id))[0].username;

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
            console.log("ricaric")
            io.to(socketx).emit("request",await get_requests(usernamex));
            io.to(socketx).emit("friends",await get_friends(usernamex));
        };
        io.to(socket.id).emit("request",await get_requests(usernamey));
        io.to(socket.id).emit("friends",await get_friends(usernamey));
    });



    /* GIOCO */

    socket.on("ready", async () => {
        await db.update_ready(socket.id,"True");
        let all_ready = await db.check_ready([...socket.rooms][1]);
        all_ready = await Promise.all(all_ready.map((pronto) => pronto.pronto));
        io.to([...socket.rooms][1]).emit("players",await get_players_by_table([...socket.rooms][1]));
        if (all_ready.length>=2 && all_ready.every(Boolean)) {
            await db.delete_invites_table([...socket.rooms][1]);  //delete all invites to table
            start_hand([...socket.rooms][1])
        };
    });

    socket.on("unready", async () => {
        await db.update_ready(socket.id,"False");
        io.to([...socket.rooms][1]).emit("players",await get_players_by_table([...socket.rooms][1]));
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
        const tipo = m.tipo;
        let giro = parseInt(m.giro);
        const fiches_puntate = parseInt(m.somma);
        const tavolo = [...socket.rooms][1];
        let turno = parseInt(m.turno); //turno mandato dal giocatore "non vero"
        turno = (await db.get_hand(tavolo))[0].turno;       //turno nel database affidabile

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
            turno--;
        };

        io.to(tavolo).emit("move",{tipo:tipo,puntata:(await db.get_bet(socket.id,tavolo,giro))[0]});    //{tipo,puntata}
        
        const in_gioco = await db.get_players_in_hand(tavolo);      //lista dei giocatori ancora in gioco [{socket,ordine,fiches},]

        let vinto = false;
        if (in_gioco.length === 1) {                            //if unico in gioco
            await end_hand(tavolo,[in_gioco[0].ordine]);              //await end_hand(tavolo,ordine_vincitore)
            vinto = true;
        } else {
            // se tutti hanno puntato e se tutte le puntate non all-in, raggiungono la puntata più alta del giro
            const condizione = ((await db.get_round_bets_not_eliminated(tavolo,giro)).length == in_gioco.length) && !(await db.check_bets(tavolo,giro));
            console.log(condizione);
            if (condizione) {              //numero di i giocatori che devono raggiungere la puntata o sono in all in
                if (giro==4 || await db.check_allin(tavolo)) {          //check if ultimo giro(4) or all in
                    if (await db.check_allin(tavolo)) {                                 //else if all in
                        await db.update_hand_round(tavolo,4)
                    };
                    io.to(tavolo).emit("hand",await get_hand_info(tavolo));        //aggiunge a hand le nuove carte, cambiando il giro a 4
                    let vincitori = await calcola_vincitori(tavolo,in_gioco);       //calcolo vincitore,tra le sockets in gioco ,restituisce l'ordine dei vincitori
                    await end_hand(tavolo,vincitori);    //await end_hand(tavolo,ordine_vincitori)
                    vinto = true;
                } else {
                    giro += 1;
                    turno = 2;
                    await db.update_hand_round(tavolo,giro);      //prossimo giro
                    await db.update_hand_turn(tavolo,2);     //turno = 2(small blind)     
                };
            } else {
                //turno = indice+1 della lista "in_gioco"(giocatori ancora in gioco)
                turno = turno == in_gioco.length ? 1 : turno+1;   //se il turno è dell'ultimo, ritorna al primo, altrimenti aumenta di 1
                await db.update_hand_turn(tavolo,turno);       
            };
        };
        
        if (giro <= 4 && !vinto) {
            console.log("giro ",giro);
            console.log("turno ",turno);
            if (tipo === "big-blind") {
                await Promise.all(in_gioco.map(async(player) => {
                    io.to(player.socket).emit("your cards",await get_player_cards(player.socket));
                }));
            };
            /*{n_mano:,small_blind:,dealer:,giro:,turno:,puntate_giro:,somma_tot:,carte:[{id,valore,seme,path}],
               players:[{username,pronto,ordine,fiches,eliminato}],in_gioco:[{username,socket,ordine,fiches}]}*/
            io.to(tavolo).emit("hand",await get_hand_info(tavolo));
            console.log(in_gioco)
            io.to(in_gioco[turno-1].socket).emit("turn",{turno:turno,giro:giro});       //manda turno e giro per conferma
        };
    });



    /* USCITA */

    socket.on("quit_table", async () => {
        if ([...socket.rooms].length > 1){
            io.in(socket.id).socketsLeave([...socket.rooms][1]);
        };
    });

    socket.on("disconnect", async () => {
        io.in(socket.id).socketsLeave([...socket.rooms][1]);         
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

// listen for INT signal e.g. Ctrl-C
process.on ('SIGINT', async () => {
    await db.delete_all_players();
    process.exit(0);
}); 

process.on('exit', async () => {
    await db.delete_all_players();
}); 
