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
            stato VARCHAR(255) NOT NULL
        )
    `);

    await executeQuery(`
        CREATE TABLE IF NOT EXISTS Carta (
            id INT PRIMARY KEY AUTO_INCREMENT,
            valore INT NOT NULL,
            seme INT NOT NULL,
            path VARCHAR(255) NOT NULL
        )
    `);

    await executeQuery(`
        CREATE TABLE IF NOT EXISTS Utente (
            username VARCHAR(255) NOT NULL PRIMARY KEY, 
            password VARCHAR(255) NOT NULL
        )
    `);

    await executeQuery(`
        CREATE TABLE IF NOT EXISTS Istanza (
            socket VARCHAR(255) NOT NULL,
            username VARCHAR(255) NOT NULL,
            tavolo INT,
            pronto BOOLEAN,
            PRIMARY KEY (username),
            FOREIGN KEY (username) REFERENCES Utente(username) ON DELETE CASCADE,
            FOREIGN KEY (tavolo) REFERENCES Tavolo(id) ON DELETE CASCADE
        )
    `);

    await executeQuery(`
        CREATE TABLE IF NOT EXISTS Giocatore (
            username VARCHAR(255) NOT NULL,
            ordine INT NOT NULL,
            fiches INT,
            carta1 INT,
            carta2 INT,
            PRIMARY KEY (username),
            FOREIGN KEY (username) REFERENCES Istanza(username) ON DELETE CASCADE,
            FOREIGN KEY (carta1) REFERENCES Carta(id),
            FOREIGN KEY (carta2) REFERENCES Carta(id)
        )
    `);

    await executeQuery(`
        CREATE TABLE IF NOT EXISTS Mano (
            id INT PRIMARY KEY AUTO_INCREMENT,
            tavolo INT NOT NULL,
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
    `);

    await executeQuery(`
        CREATE TABLE IF NOT EXISTS Puntata (
            giocatore VARCHAR(255) NOT NULL, 
            mano INT NOT NULL,
            somma INT,
            PRIMARY KEY (giocatore, mano),
            FOREIGN KEY (giocatore) REFERENCES Giocatore(username) ON DELETE CASCADE,
            FOREIGN KEY (mano) REFERENCES Mano(id) ON DELETE CASCADE
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
            username1 VARCHAR(255) NOT NULL, 
            username2 VARCHAR(255) NOT NULL,
            tavolo INT NOT NULL,
            PRIMARY KEY (username1, username2, tavolo),
            FOREIGN KEY (username1) REFERENCES Istanza(username) ON DELETE CASCADE,
            FOREIGN KEY (username2) REFERENCES Istanza(username) ON DELETE CASCADE,
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



/* ISTANZA */

const create_instance = async(socket,username) => {
    await executeQuery(`
        INSERT INTO Istanza (username, socket)
        VALUES ('${username}','${socket}')
    `);
};

const delete_instance = async(username) => {
    await executeQuery(`
        DELETE FROM Istanza
        WHERE username = '${username}'
    `);
};

const ready = async(username) => {
    await executeQuery(`
        UPDATE Istanza
        SET pronto = True
        WHERE username = '${username}'
    `);
};

const unready = async(username) => {
    await executeQuery(`
        UPDATE Istanza
        SET pronto = False
        WHERE username = '${username}'
    `);
};

const join_table = async(username, tavolo) => {
    await executeQuery(`
        UPDATE Istanza
        SET tavolo = ${tavolo}
        WHERE username = '${username}'
    `);
};

const leave_table = async(username) => {
    await executeQuery(`
        UPDATE Istanza
        SET tavolo = NULL
        WHERE username = '${username}'
    `);
};

const get_username = async(socket) => {
    return await executeQuery(`
        SELECT username FROM Istanza
        WHERE socket = '${socket}'
    `);
};

const get_socket = async(username) => {
    return await executeQuery(`
        SELECT socket FROM Istanza
        WHERE username = '${username}'
    `);
};



/* TAVOLO */

const create_table = async(username) => {
    await executeQuery(`
        INSERT INTO Tavolo () VALUES ()
    `);
    return select_last_insert_id();
};

const delete_table = async(tavolo) => {
    await executeQuery(`
        DELETE FROM Tavolo
        WHERE id = ${tavolo}
    `);
};

const get_table = async(username) => {
    return await executeQuery(`
        SELECT tavolo FROM Utente
        WHERE username = '${username}'
    `);
};

const check_ready = async(tavolo) => {
    return await executeQuery(`
        SELECT pronto FROM Utente
        WHERE tavolo = ${tavolo}
    `);
};



/* INVITO */

const create_invite = async(username1,username2,tavolo) => {
    await executeQuery(`
        INSERT INTO Invito (utente1,utente2,tavolo)
        VALUES ('${username1}','${username2}',${tavolo})
    `);
};

const delete_invite = async(username1,username2) => {
    await executeQuery(`
        DELETE FROM Invito
        WHERE utente1 = '${username1}'
            AND utente2 = '${username2}'
    `);
};

const delete_invites_table = async(tavolo) => {
    await executeQuery(`
        DELETE FROM Invito
        WHERE tavolo = ${tavolo}
    `);
};

const get_invites = async(username) => {
    return await executeQuery(`
        SELECT * FROM Invito
        WHERE accettata = False
            AND (utente1 = '${username}' OR utente2 = '${username}')
    `);
}



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

module.exports = {
    executeQuery: executeQuery,
    createTables: createTables,

    login: login,
    signup: signup,
    check_username: check_username, //might not need it

    create_instance: create_instance,
    delete_instance: delete_instance,
    ready: ready,
    unready: unready,
    join_table: join_table,
    leave_table: leave_table,
    get_username: get_username,     //get username by socket
    get_socket: get_socket,         //get socket by username

    create_table: create_table,
    delete_table: delete_table,
    get_table: get_table,           //get table by username
    check_ready: check_ready,

    create_invite: create_invite,
    delete_invite: delete_invite,
    delete_invites_table: delete_invites_table,     //delete all invites linked to a table
    get_invites: get_invites,

    create_request: create_request,
    accept_request: accept_request,
    delete_request: delete_friendship,
    delete_friendship: delete_friendship,
    get_requests: get_requests,
    get_friendships: get_friendships,
  };
  