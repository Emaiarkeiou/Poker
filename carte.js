const carte = [
    {valore: 2, seme: 1, path:""},
    {valore: 3, seme: 1, path:""},
    {valore: 4, seme: 1, path:""},
    {valore: 5, seme: 1, path:""},
    {valore: 6, seme: 1, path:""},
    {valore: 7, seme: 1, path:""},
    {valore: 8, seme: 1, path:""},
    {valore: 9, seme: 1, path:""},
    {valore: 10, seme: 1, path:""},
    {valore: 11, seme: 1, path:""},
    {valore: 12, seme: 1, path:""},
    {valore: 13, seme: 1, path:""},
    {valore: 14, seme: 1, path:""},
    {valore: 2, seme: 2, path:""},
    {valore: 3, seme: 2, path:""},
    {valore: 4, seme: 2, path:""},
    {valore: 5, seme: 2, path:""},
    {valore: 6, seme: 2, path:""},
    {valore: 7, seme: 2, path:""},
    {valore: 8, seme: 2, path:""},
    {valore: 9, seme: 2, path:""},
    {valore: 10, seme: 2, path:""},
    {valore: 11, seme: 2, path:""},
    {valore: 12, seme: 2, path:""},
    {valore: 13, seme: 2, path:""},
    {valore: 14, seme: 2, path:""},
    {valore: 2, seme: 3, path:""},
    {valore: 3, seme: 3, path:""},
    {valore: 4, seme: 3, path:""},
    {valore: 5, seme: 3, path:""},
    {valore: 6, seme: 3, path:""},
    {valore: 7, seme: 3, path:""},
    {valore: 8, seme: 3, path:""},
    {valore: 9, seme: 3, path:""},
    {valore: 10, seme: 3, path:""},
    {valore: 11, seme: 3, path:""},
    {valore: 12, seme: 3, path:""},
    {valore: 13, seme: 3, path:""},
    {valore: 14, seme: 3, path:""},
    {valore: 2, seme: 4, path:""},
    {valore: 3, seme: 4, path:""},
    {valore: 4, seme: 4, path:""},
    {valore: 5, seme: 4, path:""},
    {valore: 6, seme: 4, path:""},
    {valore: 7, seme: 4, path:""},
    {valore: 8, seme: 4, path:""},
    {valore: 9, seme: 4, path:""},
    {valore: 10, seme: 4, path:""},
    {valore: 11, seme: 4, path:""},
    {valore: 12, seme: 4, path:""},
    {valore: 13, seme: 4, path:""},
    {valore: 14, seme: 4, path:""},
];
const a = async()=>{
const db = require("./database.js");
carte.forEach( async (carta) => {
    try {
        await db.create_card(carta.valore,carta.seme,carta.path);
    } finally {};
});

console.log(await db.get_n_cards(10))
};

a();