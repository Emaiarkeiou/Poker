import { login } from "./registration.js";

const setCookie = (name,value) => {   
    document.cookie = name+'='+value;  
};

const deleteCookie = (name) => {   
    document.cookie = name+'=; Max-Age=0';  
};

const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
};


const setLogin = (username,password) => {
    document.cookie = `username=${username};`;
    document.cookie = `password=${password};`;
};

const checkLogin = async () => {
    console.log(getCookie("username"),getCookie("password"))
    return await login(getCookie("username"),getCookie("password"));
};

const deleteLogin = () => {
    deleteCookie("username");
    deleteCookie("password");
}

export { setCookie,deleteCookie,getCookie,setLogin,checkLogin,deleteLogin };