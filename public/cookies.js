import { login } from "./registration.js";

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


const setLogin = (username,password) => {
    document.cookie = `username=${username};password=${password};`
};

const checkLogin = () => {
    return login(getCookie("username"),getCookie("password"))
};

const deleteLogin = () => {
    deleteCookie("username");
}

export { setCookie,deleteCookie,getCookie,setLogin,checkLogin,deleteLogin };