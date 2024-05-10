import { create_table } from "./remote.js";
import { getCookie,checkLogin,deleteLogin } from "./cookies.js";
import { draw_lobby,draw_table,draw_players } from "./canvas.js";
import { render_requests,render_friends,render_invites  } from "./render.js";
import { bind_friends, bind_requests, bind_invites } from "./bind.js";

if (!(await checkLogin())) {
	window.location.href = "./index.html";
};
const username = getCookie("username");
const requests_ul = document.getElementById("requests_ul");
const friends_ul = document.getElementById("friends_ul");
const invites_ul = document.getElementById("invites_ul");

const logout_b = document.getElementById("logout_b");

const canvas = document.getElementById("tableCanvas");
canvas.style.width ="100%";
canvas.style.height="100%";
canvas.width  = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;

let width = canvas.width, height = canvas.height;
const step=(height/50);
const ctx = canvas.getContext("2d");
draw_lobby(ctx,width,height,step);



//CREAZIONE TAVOLO

const create_table_b = document.getElementById("create_table_b");
create_table_b.onclick = async() => {
	if (await create_table(getCookie("username"),getCookie("password"))) {
		
	};
};



//AGGIUNGI AMICI

const add_friend = document.getElementById("add_friend");
const add_friend_b = document.getElementById("add_friend_b");
add_friend.onkeydown = (event) => {
	if (event.keyCode === 13) {
		event.preventDefault();
		add_friend_b.click();
	};
};
add_friend_b.onclick = async () => {
	if (add_friend.value) {
		socket.emit("request", { username: add_friend.value });
		add_friend.value = "";
	};
};



//WEBSOCKET

const socket = io();
socket.emit("login", { username: username });

socket.on("request", async(requests) => {
	console.log("requests",requests)
	await render_requests(requests_ul,requests);
	await bind_requests(socket,requests);
});

socket.on("friends", async(friends) => {
	console.log("friends",friends)
	await render_friends(friends_ul,friends);
	await bind_friends(socket,friends);
});

socket.on("invite", async(invites) => {
	console.log("invites",invites)
	await render_invites(invites_ul,invites);
	await bind_invites(socket,invites);
});

socket.on("players", async(players) => { //informazioni generali dei giocatori del tavolo: username,pronto,ordine,fiches,eliminato
	console.log("players",players)
	/*
	
	GESTIRE PULSANTE INVITI, non mostrarlo se è già nel tavolo
	mostrarlo se si è in un tavolo NON pieno
	
	*/
	//if not in game
		create_table_b.classList.add("d-none");
		draw_table(ctx,width,height,step);
		draw_players(ctx,width,height,step,players);
	//if game
		//draw canvas game
});





//LOGOUT

logout_b.onclick = async () => {
	socket.emit("logout");
	deleteLogin();
	window.location.href = "./index.html";
};


socket.on("error", (error) => {
	console.log(error);
});


window.onpageshow = (event) => {
	if (event.persisted) {
		console.log("awg")
	  	window.location.reload();
	}
};