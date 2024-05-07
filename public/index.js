import { login,signup } from "./registration.js";
import {setLogin,checkLogin} from "./cookies.js";

const div_login = document.getElementById("div_login");
const div_signup = document.getElementById("div_signup");

const inUserLogin = document.getElementById("inUserLogin");
const inPassLogin = document.getElementById("inPassLogin");
const switchLogin = document.getElementById("switchLogin");

const inUserSignup = document.getElementById("inUserSignup");
const inPassSignup = document.getElementById("inPassSignup");
const switchSignup = document.getElementById("switchSignup");

const login_b = document.getElementById("login_b");
const signup_b = document.getElementById("signup_b");

const errorLogin = document.getElementById("errorLogin");
const errorSignup = document.getElementById("errorSignup");

inPassLogin.onkeydown = (event) => {
	if (event.keyCode === 13) {
		event.preventDefault();
		switchLogin.click();
	};
};
inPassSignup.onkeydown = (event) => {
	if (event.keyCode === 13) {
		event.preventDefault();
		switchSignup.click();
	};
};

switchLogin.onclick = () => {
	div_login.classList.remove("d-block");
	div_login.classList.add("d-none");
	div_signup.classList.remove("d-none");
	div_signup.classList.add("d-block");
};

switchSignup.onclick = () => {
	div_signup.classList.remove("d-block");
	div_signup.classList.add("d-none");
	div_login.classList.remove("d-none");
	div_login.classList.add("d-block");
};

login_b.onclick = async () => {
	if (await login(inUserLogin.value,inPassLogin.value)) {
		errorLogin.innerHTML = "&nbsp;";
		//setLogin();
		window.location.href = "./lobby.html";
	} else {
		errorLogin.innerText = "Credenziali errate";
		inPassLogin.value = "";
	};
};

signup_b.onclick = async () => {
	if (await signup(inUserSignup.value,inPassSignup.value)) {
		errorSignup.innerHTML = "&nbsp;";
		await login(inUserSignup.value,inPassSignup.value);
		//setLogin();
		window.location.href = "./lobby.html";
	} else {
		errorSignup.innerText = inUserSignup.value + " esiste già";
		inUserSignup.value = "", inPassSignup.value = "";
	};
};




const socket = io();

/*
sendButton.onclick = () => {
  	socket.emit("message", { name: username, message: input_mess.value });
  	input_mess.value = "";
};

socket.on("chat", (message) => {
  	console.log(message);
  	messages.push(message);
  	render();
});
*/