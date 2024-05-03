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
            password VARCHAR(255) NOT NULL,
            pronto BOOLEAN,
            socket VARCHAR(255),
            tavolo INT,
            fiches INT,
            carta1 INT,
            carta2 INT,
            FOREIGN KEY (tavolo) REFERENCES Tavolo(id),
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
            utente VARCHAR(255) NOT NULL, 
            mano INT NOT NULL,
            somma INT,
            PRIMARY KEY (utente, mano),
            FOREIGN KEY (utente) REFERENCES Utente(username) ON DELETE CASCADE,
            FOREIGN KEY (mano) REFERENCES Mano(id) ON DELETE CASCADE
        )
    `);

    await executeQuery(`
        CREATE TABLE IF NOT EXISTS Amicizia (
            utente1 VARCHAR(255) NOT NULL, 
            utente2 INT NOT NULL,
            stato VARCHAR(255) NOT NULL,
            PRIMARY KEY (utente1, utente2),
            FOREIGN KEY (utente1) REFERENCES Utente(username) ON DELETE CASCADE,
            FOREIGN KEY (utente1) REFERENCES Utente(username) ON DELETE CASCADE
        )
    `);

    await executeQuery(`
        CREATE TABLE IF NOT EXISTS Invito (
            utente1 VARCHAR(255) NOT NULL, 
            utente2 INT NOT NULL,
            PRIMARY KEY (utente1, utente2),
            FOREIGN KEY (utente1) REFERENCES Utente(username) ON DELETE CASCADE,
            FOREIGN KEY (utente1) REFERENCES Utente(username) ON DELETE CASCADE
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
        WHERE Utente.username = '${username}'
        AND Utente.password = '${password}'
    `).length;
};

const bind_socket = async(socket,username) => {
    await executeQuery(`
        UPDATE Utente
        SET socket = ${socket}
        WHERE username = '${username}'
    `);
}

const get_username = async(socket) => {
    return await executeQuery(`
        SELECT username FROM Utente
        WHERE Utente.socket = '${socket}'
    `);
}

const get_socket = async(username) => {
    return await executeQuery(`
        SELECT socket FROM Utente
        WHERE Utente.username = '${username}'
    `);
}

const check_username = async(username) => {
    // check nel database dello username
    // ritorna 0 o 1
    return await executeQuery(`
        SELECT * FROM Utente
        WHERE Utente.username = '${username}'
    `).length;
};

const signup = async(username, password) => {
    await executeQuery(`
        INSERT INTO Utente (username, password)
        VALUES ('${username}','${password}')
    `);
};


const ready = async(username) => {
    await executeQuery(`
        UPDATE Utente
        SET pronto = True
        WHERE username = '${username}'
    `);
};

const unready = async(username) => {
    await executeQuery(`
        UPDATE Utente
        SET pronto = False
        WHERE username = '${username}'
    `);
};





const join_table = async(username, tavolo) => {
    await executeQuery(`
        UPDATE Utente
        SET tavolo = ${tavolo}
        WHERE username = '${username}'
    `);
}

const create_table = async(username) => {
    await executeQuery(`
        INSERT INTO Tavolo (stato)
        VALUES ('In Lobby')
    `);
    return select_last_insert_id();
};

const get_table = async(username) => {
    return await executeQuery(`
        SELECT tavolo FROM Utente
        WHERE Utente.username = '${username}'
    `);
}

const create_invite = async(username1,username2) => {
    await executeQuery(`
        INSERT INTO Invito (utente1,utente2)
        VALUES ('${username1}','${username2}')
    `);
};

const delete_invite = async(username1,username2) => {
    await executeQuery(`
        DELETE FROM Invito
        WHERE utente1 = '${username1}'
            AND utente2 = '${username2}'
    `);
};

const create_request = async(username1,username2) => {
    await executeQuery(`
        INSERT INTO Amicizia (utente1,utente2,stato)
        VALUES ('${username1}','${username2}','In Sospeso')
    `);
};

const accept_request = async(username1,username2) => {
    await executeQuery(`
        UPDATE Amicizia
        SET stato = 'Accettata'
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


module.exports = {
    executeQuery: executeQuery,
    createTables: createTables,

    login: login,
    signup: signup,
    bind_socket: bind_socket,

    check_username: check_username, //might not need it
    get_username: get_username,
    get_socket: get_socket,
    ready: ready,
    unready: unready,

    create_table: create_table,
    join_table: join_table,
    get_table: get_table,

    create_invite: create_invite,
    delete_invite: delete_invite,

    create_request: create_request,
    accept_request: accept_request,
    delete_request: delete_friendship,
    delete_friendship: delete_friendship,
  };
  