const db = require("./database.js");

const generate_cards = async() => {
    for (let seme=1; seme<5; seme++){
        for (let valore=2; valore<15; valore++) {
            await db.create_card(valore,seme,`/cards/${valore}-${seme}.png`)
        };
    };
};


module.exports = {
    generate_cards: generate_cards
};