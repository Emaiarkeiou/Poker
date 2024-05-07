const setCookie = (name,value) => {   
    document.cookie = name+'='+value;  
};

const deleteCookie = (name) => {   
    document.cookie = name+'=; Max-Age=0;';  
};

const getCookie = (name) => {
    return document.cookie.split(';').some(c => {
        return c.trim().startsWith(name + '=');
    });
};


const setLogin = () => {
    document.cookie = "logged=true;"
};

const checkLogin = () => {
    return getCookie("logged") ? true : false
};

export { setCookie,deleteCookie,getCookie,setLogin,checkLogin };