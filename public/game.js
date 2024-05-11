import { create_table } from "./remote.js";
import { getCookie,checkLogin,deleteLogin } from "./cookies.js";
import { draw_lobby,draw_table,draw_players,transition,draw_hand } from "./canvas.js";
import { render_requests,render_friends,render_invites  } from "./render.js";
import { bind_friends, bind_requests, bind_invites } from "./bind.js";

if (!(await checkLogin())) {
	window.location.href = "./index.html";
};
document.getElementById("navbar_username").innerText = getCookie("username");

let in_game = false;
const navbar = document.getElementById("navbar");
const div_friends = document.getElementById("div_friends");
const div_invites = document.getElementById("div_invites");
const div_moves = document.getElementById("div_moves");

const requests_ul = document.getElementById("requests_ul");
const friends_ul = document.getElementById("friends_ul");
const invites_ul = document.getElementById("invites_ul");
const invites_container = document.getElementById("invites_container");

const logout_b = document.getElementById("logout_b");

const canvas_container = document.getElementById("canvas_container");
const canvas = document.getElementById("canvas");
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
const quit_b = document.getElementById("quit_b");
const ready_b = document.getElementById("ready_b");
const ready_check = document.getElementById("ready_check");

create_table_b.onclick = async() => {
	await create_table(getCookie("username"),getCookie("password"));
	//create_table_b.classList.add("d-none");
	//ready_b.classList.remove("d-none");
	//quit_b.classList.remove("d-none");
};

// ESCI

quit_b.onclick = async () => {
	socket.emit("quit_table");
	ctx.clearRect(0,0,width,height);
	draw_lobby(ctx,width,height,step);
	create_table_b.classList.remove("d-none");
	invites_container.classList.remove("d-none");
	ready_b.classList.add("d-none");
	quit_b.classList.add("d-none");
	ready_b.classList.remove("ready");
};

// PRONTO

ready_b.onclick = async () => {
	ready_check.checked=!ready_check.checked;
	if (ready_check.checked) {
		ready_b.classList.add("ready");
		socket.emit("ready");
	} else {
		socket.emit("unready");
		ready_b.classList.remove("ready");
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

const username = getCookie("username");
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

let v_players = [];

socket.on("players", async(players) => { //informazioni generali dei giocatori del tavolo: username,pronto,ordine,fiches,eliminato
	console.log("players",players)
	v_players = players;
	/*
	
	GESTIRE PULSANTE INVITI, non mostrarlo se è già nel tavolo
	mostrarlo se si è in un tavolo NON pieno
	non mostrare gli inviti se si è già in un tavolo
	
	*/
	if (!in_game){
		create_table_b.classList.add("d-none");
		invites_container.classList.add("d-none");
		ready_b.classList.remove("d-none");
		quit_b.classList.remove("d-none");
		draw_lobby(ctx,width,height,step);
		draw_table(ctx,width,height,step,1,1);
		draw_players(ctx,width,height,step,players,0,0);
	} else {
		//draw canvas game
	};
});


socket.on("start hand", async(info) => {	//{carte:[], dealer:1, giro:1, n_mano:1, puntate_giro:[], small_blind:1, somma_tot:null, turno:2}
	in_game = true;
	ready_b.classList.add("d-none");
	quit_b.classList.add("d-none");
	ready_b.classList.remove("ready");
	await transition(canvas_container,canvas,ctx,width,height,step,v_players,navbar,div_friends,div_invites,info);
	//{n_mano:,small_blind:,dealer:,giro:,turno:,puntate_giro:,somma_tot:,carte:[{id,valore,seme,path}]}
	//RICORDARE DI TOGLIERE DA SOMMA TOT, LE PUNTATE DEL GIRO CORRENTE
});



socket.on("turn", async(turn) => { //{giro:1,turno:2}
	console.log(turn)
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
	};
};



//{carte:[], dealer:1, giro:1, n_mano:1, puntate_giro:[], small_blind:1, somma_tot:null, turno:2}
create_table_b.classList.add("d-none");
invites_container.classList.add("d-none");
canvas_container.classList.add("full-screen")
navbar.classList.add("dis-none");
div_friends.classList.add("dis-none");
div_invites.classList.add("dis-none");
div_moves.classList.remove("d-none");
canvas.style.width ="100%";
canvas.style.height="100%";
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;
let infor = {carte:[], 
			dealer:1, giro:1, n_mano:1, puntate_giro:[], small_blind:1, somma_tot:null, turno:2}
setTimeout(() => {
	canvas.style.width ="100%";
	canvas.style.height="100%";
	canvas.width  = canvas.offsetWidth;
	canvas.height = canvas.offsetHeight;
	draw_hand(ctx,canvas.width,canvas.height,step,infor);
}, 500);
