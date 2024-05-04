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
    `);//n_mano corrisponde al dealer

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
            ordine INT NOT NULL,
            pronto BOOLEAN,
            fiches INT,
            carta1 INT,
            carta2 INT,
            PRIMARY KEY (socket),
            FOREIGN KEY (username) REFERENCES Utente(username) ON DELETE CASCADE,
            FOREIGN KEY (tavolo) REFERENCES Tavolo(id) ON DELETE CASCADE,
            FOREIGN KEY (carta1) REFERENCES Carta(id),
            FOREIGN KEY (carta2) REFERENCES Carta(id)
        )
    `);

    await executeQuery(`
        CREATE TABLE IF NOT EXISTS Mano (
            tavolo INT NOT NULL,
            carta1 INT,
            carta2 INT,
            carta3 INT,
            carta4 INT,
            carta5 INT,
            PRIMARY KEY (tavolo),
            FOREIGN KEY (tavolo) REFERENCES Tavolo(id) ON DELETE CASCADE,
            FOREIGN KEY (carta1) REFERENCES Carta(id),
            FOREIGN KEY (carta2) REFERENCES Carta(id),
            FOREIGN KEY (carta3) REFERENCES Carta(id),
            FOREIGN KEY (carta4) REFERENCES Carta(id),
            FOREIGN KEY (carta5) REFERENCES Carta(id)
        )
    `);

    await executeQuery(`
        CREATE TABLE IF NOT EXISTS Puntata (
            giocatore VARCHAR(255) NOT NULL, 
            mano INT NOT NULL,
            somma INT,
            PRIMARY KEY (giocatore, mano),
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
    return await executeQuery(`
        SELECT * FROM Utente
        WHERE username = '${username}'
        AND password = '${password}'
    `).length;
};

const signup = async(username, password) => {
    await executeQuery(`
        INSERT INTO Utente (username, password)
        VALUES ('${username}','${password}')
    `);
};

const check_username = async(username) => {
    // check nel database dello username
    // ritorna 0 o 1
    return await executeQuery(`
        SELECT * FROM Utente
        WHERE username = '${username}'
    `).length;
};



/* GIOCATORE */

const create_player = async(socket,username) => {   //CREATE socket,username
    await executeQuery(`
        INSERT INTO Giocatore (username, socket)
        VALUES ('${username}','${socket}')
    `);
};

const delete_player = async(socket) => {          //DELETE
    await executeQuery(`
        DELETE FROM Giocatore
        WHERE socket = '${socket}'
    `);
};

const update_ready = async(socket,pronto) => {      //UPDATE pronto ("True" o "False")
    await executeQuery(`
        UPDATE Giocatore
        SET pronto = ${pronto}
        WHERE socket = '${socket}'
    `);
};

const update_player_table = async(socket, tavolo) => {      //UPDATE tavolo (INT o "NULL")
    await executeQuery(`
        UPDATE Giocatore
        SET tavolo = ${tavolo}
        WHERE socket = '${socket}'
    `);
};

const update_player_cards = async(socket,c1,c2) => {        //UPDATE carte (INT o "NULL")
    await executeQuery(`
        UPDATE Giocatore
        SET carta1 = ${c1}, carta2 = ${c2}
        WHERE socket = '${socket}'
    `);
};

const update_order = async(socket,ordine) => {              //UPDATE ordine (INT o "NULL")
    await executeQuery(`
        UPDATE Giocatore
        SET ordine = ${ordine}
        WHERE socket = '${socket}'
    `);
};

const update_fiches = async(socket,fiches) => {              //UPDATE fiches (INT o "NULL")
    await executeQuery(`
        UPDATE Giocatore
        SET fiches = ${fiches}
        WHERE socket = '${socket}'
    `);
};

const get_username = async(socket) => {
    return await executeQuery(`
        SELECT username FROM Giocatore
        WHERE socket = '${socket}'
    `);
};

const get_socket = async(username) => {
    return await executeQuery(`
        SELECT socket FROM Giocatore
        WHERE username = '${username}'
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

const check_ready = async(tavolo) => {
    return await executeQuery(`
        SELECT pronto FROM Giocatore
        WHERE tavolo = ${tavolo}
    `);
};



/* INVITO */

const create_invite = async(socket1,socket2,tavolo) => {
    await executeQuery(`
        INSERT INTO Invito (giocatore1,giocatore2,tavolo)
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
        INSERT INTO Amicizia (utente1, utente2, accettata)
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
        SELECT * FROM Amicizia
        WHERE accettata = True
            AND (utente1 = '${username}' OR utente2 = '${username}')
    `);//includere stato utente attraverso socket
};



/* MANO */

const create_hand = async(tavolo) => {
    await executeQuery(`
        INSERT INTO Mano (tavolo)
        VALUES (${tavolo})
    `);
};

const delete_hand = async(tavolo) => {
    await executeQuery(`
        DELETE FROM Mano
        WHERE tavolo = ${tavolo}
    `);
};

const add_hand_cards = async(tavolo,c1,c2,c3,c4,c5) => {
    await executeQuery(`
        UPDATE Mano
        SET carta1 = ${c1}, carta2 = ${c2}, carta3 = ${c3}, carta4 = ${c4}, carta5 = ${c5}
        WHERE tavolo = ${tavolo}
    `);
};

const get_hand_card = async(tavolo,n) => {
    await executeQuery(`
        SELECT carta${n} FROM Mano
        WHERE tavolo = ${tavolo}
    `);
};



/* PUNTATA */

const create_bet = async(username, tavolo) => {
    await executeQuery(`
        INSERT INTO PUNTATA (giocatore, tavolo, somma)
        VALUES ('${username}',${tavolo},0)
    `);
};

const add_to_bet = async(username, tavolo, somma) => {
    await executeQuery(`
        UPDATE Mano
        SET carta1 = ${c1}, carta2 = ${c2}, carta3 = ${c3}, carta4 = ${c4}, carta5 = ${c5}
        WHERE tavolo = ${tavolo}
    `);
};



/* CARTE */

const create_card = async(valore,seme,path) => {
    await executeQuery(`
        INSERT INTO Carta (valore,seme,path)
        VALUES (${valore},${seme},'${path}')
    `);
};

const get_n_cards = async(n) => {
    return await executeQuery(`
        SELECT * FROM Carta
        ORDER BY RAND()
        LIMIT ${n}
    `);
};


module.exports = {
    executeQuery: executeQuery,
    createTables: createTables,

    login: login,
    signup: signup,
    check_username: check_username, //might not need it

    create_player: create_player,   //CREATE socket, username
    delete_player: delete_player,                               //using socket
    update_ready: update_ready,                                 //using socket     
    update_player_table: update_player_table,                   //using socket
    update_player_cards:update_player_cards,                    //using socket
    update_order:update_order,                                  //using socket
    update_fiches:update_fiches,                                //using socket
    get_username: get_username,     //get username              //using socket
    get_socket: get_socket,         //get socket                //using username

    create_table: create_table,     //CREATE n_mano, piccolo_buio
    delete_table: delete_table,     //using id
    check_ready: check_ready,       //check if every1 is ready  //using tavolo

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

    create_hand:create_hand,

    create_card: create_card,
    get_n_cards: get_n_cards
  };
  