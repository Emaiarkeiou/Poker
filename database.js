const mysql = require("mysql2");
const conf = require("./conf.js");
const connection = mysql.createConnection(conf);

const executeQuery = (sql) => {
    return new Promise((resolve, reject) => {
      connection.query(sql, function (err, result) {
        if (err) {
          console.error(err);
          reject();
        }
        resolve(result);
      });
    });
  };

const createTables = async () => {
    // creazione tabelle se non esistono

    await executeQuery(`
        CREATE TABLE IF NOT EXISTS Tavolo ( 
            id INT PRIMARY KEY AUTO_INCREMENT,
            n_mano INT NOT NULL,
            small_blind INT NOT NULL
        )
    `); //n_mano corrisponde al dealer perchè gira
        //small blind è la quantità che deve puntare

    await executeQuery(`
        CREATE TABLE IF NOT EXISTS Carta (
            id INT PRIMARY KEY AUTO_INCREMENT,
            valore INT NOT NULL,
            seme INT NOT NULL,
            path VARCHAR(255) NOT NULL,
            UNIQUE (valore,seme)
        )
    `);

    await executeQuery(`
        CREATE TABLE IF NOT EXISTS Utente (
            username VARCHAR(255) NOT NULL PRIMARY KEY, 
            password VARCHAR(255) NOT NULL
        )
    `);

    await executeQuery(`
        CREATE TABLE IF NOT EXISTS Giocatore (
            socket VARCHAR(255) NOT NULL,
            username VARCHAR(255) NOT NULL,
            tavolo INT,
            ordine INT,
            pronto BOOLEAN,
            eliminato BOOLEAN,
            fiches INT,
            carta1 INT,
            carta2 INT,
            PRIMARY KEY (socket,username),
            FOREIGN KEY (username) REFERENCES Utente(username) ON DELETE CASCADE,
            FOREIGN KEY (tavolo) REFERENCES Tavolo(id) ON DELETE CASCADE,
            FOREIGN KEY (carta1) REFERENCES Carta(id),
            FOREIGN KEY (carta2) REFERENCES Carta(id)
        )
    `);

    await executeQuery(`
        CREATE TABLE IF NOT EXISTS Mano (
            tavolo INT PRIMARY KEY,
            giro INT NOT NULL,
            turno INT NOT NULL,
            carta1 INT,
            carta2 INT,
            carta3 INT,
            carta4 INT,
            carta5 INT,
            FOREIGN KEY (tavolo) REFERENCES Tavolo(id) ON DELETE CASCADE,
            FOREIGN KEY (carta1) REFERENCES Carta(id),
            FOREIGN KEY (carta2) REFERENCES Carta(id),
            FOREIGN KEY (carta3) REFERENCES Carta(id),
            FOREIGN KEY (carta4) REFERENCES Carta(id),
            FOREIGN KEY (carta5) REFERENCES Carta(id)
        )
    `); // il turno indica il numero del giocatore che deve giocare, corrisponde all'attributo ordine del giocatore
        // il giro indica a quale giro di puntate si è (small e big blind compresi nel giro 1)

    await executeQuery(`
        CREATE TABLE IF NOT EXISTS Puntata (
            giocatore VARCHAR(255) NOT NULL, 
            mano INT NOT NULL,
            giro INT NOT NULL,
            somma INT,
            PRIMARY KEY (giocatore, mano, giro),
            FOREIGN KEY (giocatore) REFERENCES Giocatore(socket) ON DELETE CASCADE,
            FOREIGN KEY (mano) REFERENCES Mano(tavolo) ON DELETE CASCADE
        )
    `);

    await executeQuery(`
        CREATE TABLE IF NOT EXISTS Amicizia (
            utente1 VARCHAR(255) NOT NULL, 
            utente2 VARCHAR(255) NOT NULL,
            accettata BOOLEAN,
            PRIMARY KEY (utente1, utente2),
            FOREIGN KEY (utente1) REFERENCES Utente(username) ON DELETE CASCADE,
            FOREIGN KEY (utente1) REFERENCES Utente(username) ON DELETE CASCADE
        )
    `);

    await executeQuery(`
        CREATE TABLE IF NOT EXISTS Invito (
            giocatore1 VARCHAR(255) NOT NULL, 
            giocatore2 VARCHAR(255) NOT NULL,
            tavolo INT NOT NULL,
            PRIMARY KEY (giocatore1, giocatore2, tavolo),
            FOREIGN KEY (giocatore1) REFERENCES Giocatore(socket) ON DELETE CASCADE,
            FOREIGN KEY (giocatore2) REFERENCES Giocatore(socket) ON DELETE CASCADE,
            FOREIGN KEY (tavolo) REFERENCES Tavolo(id) ON DELETE CASCADE
        )
    `); 
}

const select_last_insert_id = async () => {
    // ritorna l'ultimo id auto-generato
    return (await executeQuery("SELECT LAST_INSERT_ID()"))[0]["LAST_INSERT_ID()"];
  };

const login = async(username, password) => {
    // check nel database delle credenziali
    // ritorna 0 o 1
    return (await executeQuery(`
        SELECT COUNT(*) FROM Utente
        WHERE username = '${username}'
        AND password = '${password}'
    `)).length;
};

const signup = async(username, password) => {
    await executeQuery(`
        INSERT IGNORE INTO Utente (username, password)
        VALUES ('${username}','${password}')
    `);
};

const check_username = async(username) => {
    // check nel database dello username
    // ritorna 0 o 1
    return (await executeQuery(`
        SELECT COUNT(*) FROM Utente
        WHERE username = '${username}'
    `)).length;
};



/* GIOCATORE */

const create_player = async(socket,username) => {   //CREATE socket,username
    await executeQuery(`
        INSERT IGNORE INTO Giocatore (username, socket, eliminato)
        VALUES ('${username}','${socket}', False)
    `);
};

const create_placeholder = async(socket,tavolo,ordine,eliminato) => {
    await executeQuery(`
        INSERT IGNORE INTO Giocatore (username,socket,tavolo,ordine,eliminato)
        VALUES ('','${socket}',${tavolo},${ordine},${eliminato})
    `);
}

const delete_player = async(socket) => {          //DELETE
    await executeQuery(`
        DELETE FROM Giocatore
        WHERE socket = '${socket}'
            AND username != ''
    `);
};

const delete_placeholders = async(tavolo) => {          //DELETE
    await executeQuery(`
        DELETE FROM Giocatore
        WHERE username = ''
            AND tavolo = ${tavolo}
    `);
};

const update_ready = async(socket,pronto) => {      //UPDATE pronto ("True" o "False")
    await executeQuery(`
        UPDATE Giocatore
        SET pronto = ${pronto}
        WHERE socket = '${socket}'
            AND username != ''
    `);
};

const update_player_table = async(socket, tavolo) => {      //UPDATE tavolo (INT o "NULL")
    await executeQuery(`
        UPDATE Giocatore
        SET tavolo = ${tavolo}
        WHERE socket = '${socket}'
            AND username != ''
    `);
};

const update_fiches = async(socket,fiches) => {              //UPDATE fiches (INT o "NULL")
    await executeQuery(`
        UPDATE Giocatore
        SET fiches = ${fiches}
        WHERE socket = '${socket}'
            AND username != ''
    `);
};

const update_player_order = async(socket,ordine) => {              //UPDATE ordine (INT o "NULL")
    await executeQuery(`
        UPDATE Giocatore
        SET ordine = ${ordine}
        WHERE socket = '${socket}'
            AND username != ''
    `);
};

const update_player_order_by_order = async(tavolo,ordine1,ordine2) => {              //UPDATE ordine (INT o "NULL")
    await executeQuery(`
        UPDATE Giocatore
        SET ordine = ${ordine2}
        WHERE tavolo = ${tavolo}
            AND ordine = ${ordine1}
            AND username != ''
    `);
};

const update_eliminated = async(socket,eliminato) => {              //UPDATE eliminato ("True" o "False")
    await executeQuery(`
        UPDATE Giocatore
        SET eliminato = ${eliminato}
        WHERE socket = '${socket}'
            AND username != ''
    `);
};

const revisit_elimated = async(tavolo) => {                 //UPDATE eliminato ("True" o "False")
    await executeQuery(`
        UPDATE Giocatore
        SET eliminato = True
        WHERE tavolo = ${tavolo}
            AND fiches <= 0
    `);
    await executeQuery(`
        UPDATE Giocatore
        SET eliminato = False
        WHERE tavolo = ${tavolo}
            AND fiches > 0
    `);
};

const get_username = async(socket) => {
    return await executeQuery(`
        SELECT username FROM Giocatore
        WHERE socket = '${socket}'
            AND username != ''
    `);
};

const get_socket = async(username) => {
    return await executeQuery(`
        SELECT socket FROM Giocatore
        WHERE username = '${username}'
    `);
};

const get_player_by_order = async(tavolo,ordine) => {
    return await executeQuery(`
        SELECT socket,pronto,fiches,eliminato FROM Giocatore
        WHERE tavolo = ${tavolo}
            AND ordine = ${ordine}
    `);
};

const get_player = async(socket) => {
    return await executeQuery(`
        SELECT pronto,ordine,fiches,eliminato FROM Giocatore
        WHERE socket = ${socket}
            AND username != ''
    `);
};

const get_players_by_table = async(tavolo) => {
    return await executeQuery(`
        SELECT socket,pronto,ordine,fiches,eliminato FROM Giocatore
        WHERE tavolo = ${tavolo}
            AND username != ''
    `);
};

const get_players_in_hand = async(tavolo) => {
    return await executeQuery(`
        SELECT socket,ordine,fiches FROM Giocatore
        WHERE tavolo = ${tavolo}
            AND eliminato = False
        ORDER BY ordine
    `);
};

const get_orders = async(tavolo) => {
    return await executeQuery(`
        SELECT socket,ordine FROM Giocatore
        WHERE tavolo = ${tavolo}
        ORDER BY ordine
    `);
};

const check_fiches = async(socket,fiches) => {
    // check nel database delle fiches del giocatore
    // ritorna 0 o 1
    return (await executeQuery(`
        SELECT COUNT(*) FROM Giocatore
        WHERE socket = '${socket}'
            AND fiches >= ${fiches}
    `)).length;
};



/* INVITO */

const create_invite = async(socket1,socket2,tavolo) => {
    await executeQuery(`
        INSERT IGNORE INTO Invito (giocatore1,giocatore2,tavolo)
        VALUES ('${socket1}','${socket2}',${tavolo})
    `);
};

const delete_invite = async(socket1,socket2) => {
    await executeQuery(`
        DELETE FROM Invito
        WHERE utente1 = '${socket1}'
            AND utente2 = '${socket2}'
    `);
};

const delete_invites_table = async(tavolo) => {
    await executeQuery(`
        DELETE FROM Invito
        WHERE tavolo = ${tavolo}
    `);
};

const delete_invites_player = async(socket) => {
    await executeQuery(`
        DELETE FROM Invito
        WHERE giocatore1 = ${socket}
    `);
};

const get_invites = async(socket) => {
    return await executeQuery(`
        SELECT * FROM Invito
        WHERE accettata = False
            AND (giocatore1 = '${socket}' OR giocatore2 = '${socket}')
    `);
};



/* RICHIESTA */

const create_request = async(username1,username2) => {
    await executeQuery(`
        INSERT IGNORE INTO Amicizia (utente1, utente2, accettata)
        VALUES ('${username1}','${username2}', False)
    `);
};

const accept_request = async(username1,username2) => {
    await executeQuery(`
        UPDATE Amicizia
        SET accettata = True
        WHERE utente1 = '${username1}'
            AND utente2 = '${username2}'
    `);
};

const delete_friendship = async(username1,username2) => {
    await executeQuery(`
        DELETE FROM Amicizia
        WHERE utente1 = '${username1}'
            AND utente2 = '${username2}'
    `);
};

const get_requests = async(username) => {
    return await executeQuery(`
        SELECT * FROM Amicizia
        WHERE accettata = False
            AND (utente1 = '${username}' OR utente2 = '${username}')
    `);
};

const get_friendships = async(username) => {
    return await executeQuery(`
        SELECT utente1,utente2 FROM Amicizia
        WHERE accettata = True
            AND (utente1 = '${username}' OR utente2 = '${username}')
    `);
};


/* TAVOLO */

const create_table = async() => {
    await executeQuery(`
        INSERT INTO Tavolo (n_mano,small_blind) VALUES (1,1)
    `);
    return select_last_insert_id();
};

const delete_table = async(tavolo) => {
    await executeQuery(`
        DELETE FROM Tavolo
        WHERE id = ${tavolo}
    `);
};

const increment_table_hand = async(tavolo) => {
    await executeQuery(`
        UPDATE Tavolo
        SET n_mano = n_mano + 1
        WHERE id = ${tavolo}
    `);
};

const check_ready = async(tavolo) => {
    return await executeQuery(`
        SELECT pronto FROM Giocatore
        WHERE tavolo = ${tavolo}
            AND eliminato = False
    `);
};



/* MANO */

//è salvata solo una mano per tavolo
//si potrebbe aggiungere il numero di mano per salvarle tutte
const create_hand = async(tavolo,giro,turno) => {
    await executeQuery(`
        INSERT IGNORE INTO Mano (tavolo,giro,turno)
        VALUES (${tavolo},1,2)
    `); //giro = 1
        //turno = 2 per lo small blind
};

const delete_hand = async(tavolo) => {
    await executeQuery(`
        DELETE FROM Mano
        WHERE tavolo = ${tavolo}
    `);
};

const update_hand_round = async(tavolo,giro) => {
    await executeQuery(`
        UPDATE Mano
        SET giro = ${giro}
        WHERE tavolo = ${tavolo}
    `);
};

const update_hand_turn = async(tavolo,turno) => {
    await executeQuery(`
        UPDATE Mano
        SET turno = ${turno}
        WHERE tavolo = ${tavolo}
    `);
};

const get_hand_turn_round = async(tavolo) => {
    return await executeQuery(`
        SELECT turno,giro FROM Mano
        WHERE tavolo = ${tavolo}
    `);
};

/* PUNTATA */

const create_bet = async(socket, tavolo, giro, somma) => {
    await executeQuery(`
        INSERT INTO PUNTATA (giocatore, mano, giro, somma)
        VALUES ('${socket}',${tavolo},${giro},${somma})
    `); //non IGNORE per controllare se esiste la puntata
};

const add_to_bet = async(socket,tavolo,giro,somma) => {
    await executeQuery(`
        UPDATE Puntata
        SET somma = somma + ${somma}
        WHERE giocatore = '${socket}'
            AND mano = ${tavolo}
            AND giro = ${giro}
    `);
};

const get_bet = async(socket,tavolo,giro) => {
    return await executeQuery(`
        SELECT * FROM Puntata
        WHERE giocatore = '${socket}'
            AND mano = ${tavolo}
            AND giro = ${giro}
    `);
};

const get_bets_sum = async(tavolo) => {
    return await executeQuery(`
        SELECT SUM(somma) FROM Puntata
        WHERE mano = ${tavolo}
    `);
};

const check_bets = async(tavolo,giro) => {
    // check dei giocatori che devono ancora puntare
    // ritorna il numero dei giocatori
    return (await executeQuery(`
        SELECT COUNT(Giocatore.socket) FROM Puntata, Giocatore
        WHERE Puntata.giocatore = Giocatore.socket
            AND Puntata.mano = ${tavolo}
            AND Puntato.giro = ${giro}
            AND Giocatore.eliminato = False
            AND Puntata.somma < (SELECT MAX(somma) FROM Puntata WHERE giro = ${giro} AND Puntata.mano = ${tavolo}) 
            AND Giocatore.fiches > 0
    `)).length;  //controllo se la puntata del giocatore in un giro è minore di quella massima del giro
};              //non conto chi è in all-in(fiches<0)

const check_allin = async(tavolo) => {
    // check che qualcuno abbia fatto all in
    // ritorna il numero di giocatori
    return (await executeQuery(`
        SELECT COUNT(*) FROM Giocatore
        WHERE tavolo = ${tavolo}
            AND eliminato = False
            AND fiches <= 0
    `)).length;
};



/* CARTE */

const create_card = async(valore,seme,path) => {
    await executeQuery(`
        INSERT IGNORE INTO Carta (valore,seme,path)
        VALUES (${valore},${seme},'${path}')
    `);
};

const get_n_cards = async(n) => {
    return await executeQuery(`
        SELECT id FROM Carta
        ORDER BY RAND()
        LIMIT ${n}
    `);
};


const update_player_cards = async(socket,carte) => {
    await executeQuery(`
        UPDATE Giocatore
        SET carta1 = ${carte[0]}, carta2 = ${carte[1]}
        WHERE socket = '${socket}'
            AND username != ''
    `);
};

const update_hand_cards = async(tavolo,carte) => {
    await executeQuery(`
        UPDATE Mano
        SET carta1 = ${carte[0]}, carta2 = ${carte[1]}, 
            carta3 = ${carte[2]}, carta4 = ${carte[3]}, 
            carta5 = ${carte[4]}
        WHERE tavolo = ${tavolo}
    `);
};

const delete_all_player_cards = async(tavolo) => {
    await executeQuery(`
        UPDATE Giocatore
        SET carta1 = NULL, carta2 = NULL
        WHERE tavolo = ${tavolo}
    `);
};



const get_player_card = async(socket,n) => {
    return await executeQuery(`
        SELECT Carta.id, Carta.valore, Carta.seme, Carta.path
        FROM Carta, Giocatore
        WHERE Giocatore.carta${n} = Carta.id
            AND Giocatore.socket = ${socket}
            AND Giocatore.username != ''
    `);
};

const get_card = async(id) => {
    return await executeQuery(`
        SELECT * FROM Carta
        WHERE Carta.id = ${id}
    `);
};

const get_all_players_cards = async(socket) => {
    return await executeQuery(`
        SELECT Carta.id, Carta.valore, Carta.seme, Carta.path
        FROM Carta, Giocatore
        WHERE Giocatore.carta${n} = Carta.id
            AND Giocatore.socket = ${socket}
            AND Giocatore.username != ''
    `);
};


module.exports = {
    executeQuery: executeQuery,
    createTables: createTables,

    login: login,                                                                                   //length
    signup: signup,
    check_username: check_username,                                                                 //length

    create_player: create_player,   //CREATE socket, username
    delete_player: delete_player,                               //using socket
    update_ready: update_ready,                                 //using socket     
    update_player_table: update_player_table,                   //using socket
    update_fiches:update_fiches,                                //using socket
    update_player_order:update_player_order,                    //using socket
    update_player_order_by_order:update_player_order_by_order,  //using tavolo,ordine
    update_eliminated:update_eliminated,                        //using socket
    revisit_elimated:revisit_elimated,                          //using tavolo
    get_username: get_username,     //get username              //using socket
    get_socket: get_socket,         //get socket                //using username
    get_player_by_order:get_player_by_order,                    //using tavolo,ordine
    get_player: get_player,                                     //using socket
    get_players_by_table:get_players_by_table,                  //using tavolo
    get_players_in_hand:get_players_in_hand,                    //using tavolo
    get_orders:get_orders,                                      //using tavolo
    check_fiches:check_fiches,                                  //using socket,fiches               //length

    create_placeholder:create_placeholder,                      //using socket,tavolo,ordine,eliminato
    delete_placeholders:delete_placeholders,                    //using tavolo

    create_invite: create_invite,   //CREATE giocatore1-2       //using socket       
    delete_invite: delete_invite,                               //using socket
    delete_invites_table: delete_invites_table,                 //using tavolo
    delete_invites_player: delete_invites_player,//invites sent //using socket
    get_invites: get_invites,                                   //using socket

    create_request: create_request,                             //using username
    accept_request: accept_request,                             //using username
    delete_request: delete_friendship,                          //using username
    delete_friendship: delete_friendship,                       //using username
    get_requests: get_requests,                                 //using username
    get_friendships: get_friendships,                           //using username

    create_table: create_table,     //CREATE n_mano, piccolo_buio
    delete_table: delete_table,                                 //using tavolo                 
    increment_table_hand:increment_table_hand,                  //using tavolo
    check_ready: check_ready,       //check if every1 is ready  //using tavolo

    create_hand:create_hand,
    delete_hand:delete_hand,                                    //using tavolo
    update_hand_round:update_hand_round,                        //using tavolo,giro
    update_hand_turn:update_hand_turn,                          //using tavolo,turno
    get_hand_turn_round:get_hand_turn_round,                    //using tavolo

    create_bet:create_bet,                                      //using socket,tavolo,giro
    add_to_bet:add_to_bet,                                      //using socket,tavolo,giro
    get_bet:get_bet,                                            //using socket,tavolo,giro
    get_bets_sum:get_bets_sum,                                  //using tavolo
    check_bets:check_bets,                                      //using tavolo,giro                 //length
    check_allin:check_allin,                                    //using tavolo                      //length

    create_card: create_card,
    get_n_cards: get_n_cards,
    update_player_cards:update_player_cards,                    //using socket
    update_hand_cards:update_hand_cards,                        //using tavolo
    get_hand_card:get_hand_card,                                //using tavolo
    delete_all_player_cards:delete_all_player_cards,            //using tavolo
    get_card:get_card,                                          //using n
    get_player_card:get_player_card,                            //using socket,n
  };
  