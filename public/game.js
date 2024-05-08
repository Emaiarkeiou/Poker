import { login,signup } from "./registration.js";
import {getCookie,setLogin,checkLogin,deleteLogin} from "./cookies.js";
import {draw_lobby} from "./canvas.js";

if (!(await checkLogin())) {
	window.location.href = "./index.html";
};
const username = getCookie("username");

const canvas = document.getElementById("tableCanvas");
canvas.style.width ="100%";
canvas.style.height="100%";
canvas.width  = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;

let width = canvas.width, height = canvas.height;
const step=(height/50);
const ctx = canvas.getContext("2d");
draw_lobby(ctx,width,height,step);


const logout_b = document.getElementById("logout_b");

const add_friend = document.getElementById("add_friend");
const add_friend_b = document.getElementById("add_friend_b");

logout_b.onclick = async () => {
	deleteLogin();
	window.location.href = "./index.html";
};

add_friend.onkeydown = (event) => {
	if (event.keyCode === 13) {
		event.preventDefault();
		add_friend_b.click();
	};
};
add_friend_b.onclick = async () => {
	if (add_friend.value) {
		socket.emit("request", { username: add_friend.value });
	};
};

const socket = io();
socket.emit("login", { username: username });

socket.on("request", (requests) => {
	console.log(requests);
});

socket.on("friends", (friends) => {
  	console.log(friends);
});



socket.on("error", (error) => {
	console.log(error);
});


window.onpageshow = (event) => {
	if (event.persisted) {
		console.log("awg")
	  	window.location.reload();
	}
};