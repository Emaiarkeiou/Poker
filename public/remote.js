const login = async (username, password) => {
    let response = await fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            username: username,
            password: password,
        }),
    });
    // restituisce true solo se lo stato della risposta è diverso da Unauthorized (401)
    // restituisce false se lo stato è Unauthorized (401)
    return response.status === 401 ? false : true;
};

const signup = async (username, password) => {
    let response = await fetch("/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            username: username,
            password: password,
        }),
    });
    // restituisce true solo se lo stato della risposta è diverso da not acceptable (406)
    // restituisce false se lo stato è not acceptable (406)
    return response.status === 406 ? false : true;
};

const create_table = async (username, password) => {
    let response = await fetch("/create_table", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            username: username,
            password: password,
        }),
    });
    // restituisce true solo se lo stato della risposta è diverso da Unauthorized (401)
    // restituisce false se lo stato è Unauthorized (401)
    return response.status === 401 ? false : true;
};

export { login,signup,create_table };