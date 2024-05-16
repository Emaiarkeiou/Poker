import { create_table } from "./remote.js";
import { getCookie,checkLogin,deleteLogin } from "./cookies.js";
import { draw_lobby,draw_table,draw_players,transition,draw_hand,draw_your_cards } from "./canvas.js";
import { render_requests,render_friends,render_invites  } from "./render.js";
import { bind_friends, bind_requests, bind_invites } from "./bind.js";

if (!(await checkLogin())) {
	window.location.href = "./index.html";
};
document.getElementById("navbar_username").innerText = getCookie("username");

let v_players = [];
let in_game = false;
let giro_turno = {};
let inf = {};
let last_move = {};
let vincitori = [];
let all_cards = {};

const navbar = document.getElementById("navbar");
const div_friends = document.getElementById("div_friends");
const div_invites = document.getElementById("div_invites");
const div_bottom = document.getElementById("div_bottom");
const div_moves = document.getElementById("div_moves");

const requests_ul = document.getElementById("requests_ul");
const friends_ul = document.getElementById("friends_ul");
const invites_ul = document.getElementById("invites_ul");
const invites_container = document.getElementById("invites_container");

const check_b = document.getElementById("check_b");
const fold_b = document.getElementById("fold_b");
const bet_b = document.getElementById("bet_b");
const bet_in = document.getElementById("bet_in");

bet_in.onchange = () => {
	if (parseInt(bet_in.value) < parseInt(bet_in.min)) {
		bet_in.value = bet_in.min;
	};
};

const logout_b = document.getElementById("logout_b");

const canvas_container = document.getElementById("canvas_container");

const canvas = document.getElementById("canvas");
const canvas_cards = document.getElementById("canvas_ur_cards");
const canvas_fiches = document.getElementById("canvas_ur_fiches");

canvas.style.width ="100%";
canvas.style.height="100%";
canvas_cards.style.width ="100%";
canvas_cards.style.height="100%";
canvas_fiches.style.width ="100%";
//canvas_fiches.style.height="100%";
canvas.width  = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;
canvas_cards.width  = canvas_cards.offsetWidth;
canvas_cards.height = canvas_cards.offsetHeight;
canvas_fiches.width  = canvas_fiches.offsetWidth;
//canvas_fiches.height = canvas_fiches.offsetHeight;

let height = canvas.height;
const step=(height/50);
draw_lobby(canvas,step);






//CREAZIONE TAVOLO

const create_table_b = document.getElementById("create_table_b");
const quit_b = document.getElementById("quit_b");
const ready_b = document.getElementById("ready_b");
const ready_check = document.getElementById("ready_check");

create_table_b.onclick = async() => {
	await create_table(getCookie("username"),getCookie("password"));
};

// ESCI

quit_b.onclick = async () => {
	socket.emit("quit_table");
	draw_lobby(canvas,step);
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


socket.on("players", async(players) => { 
	//informazioni generali dei giocatori del tavolo: username,pronto,ordine,fiches,eliminato
	console.log("players",players)
	v_players = players;
	if (!in_game){
		create_table_b.classList.add("d-none");
		invites_container.classList.add("d-none");
		ready_b.classList.remove("d-none");
		quit_b.classList.remove("d-none");
		draw_lobby(canvas,step);
		draw_table(canvas,step,1,1);
		draw_players(canvas,step,players,0,0);
	};
});


socket.on("start hand", async(info) => {	
	console.log("start hand")
	in_game = true;
	inf = info;
	vincitori = [];
	all_cards = {};
	giro_turno = {};
	last_move = {};
	bet_in.value = null;
	bet_in.min = 0;
	ready_check.checked = false;
	ready_b.classList.add("d-none");
	quit_b.classList.add("d-none");
	ready_b.classList.remove("ready");
	console.log(info.players)
	await transition(canvas,canvas_fiches,canvas_cards,step,info);
});

socket.on("hand", async(info) => {	
	/*
	{n_mano:,small_blind:,dealer:,giro:,turno:,puntate_giro:[{username,giocatore,mano,giro,somma}],
	somma_tot:, carte:[{id,valore,seme,path}],players:[{username,pronto,ordine,fiches,eliminato}]}
	*/
	console.log("hand",inf.giro,info.giro)
	if (inf.giro != info.giro) {
		bet_in.min = 0;
	};
	inf = info;
	bet_in.readOnly = false;

	check_b.disabled = true;
	fold_b.disabled = true;
	bet_b.disabled = true;

	draw_hand(canvas,canvas_fiches,step,info,last_move,vincitori,all_cards);
});


socket.on("turn", async(turn) => { //{giro:1,turno:2}
	giro_turno = turn;
	bet_in.readOnly = false;
	if (turn.giro==1 && inf.puntate_giro.length==0) {
		bet_in.value = inf.small_blind;			//small blind
		bet_in.readOnly = true;
	} else if (turn.giro==1 && inf.puntate_giro.length==1) {
		bet_in.value = inf.small_blind*2;	//big blind
		bet_in.readOnly = true;
	} else {	//se non è small o big blind ABILITARE PIU DI UN RILANCIO, MOSTRARE DI CHI E IL TURNO
		let somme = inf.puntate_giro.map((puntata) => {return puntata.somma});
		let min = Math.max(0,...somme);
		let puntata = inf.puntate_giro.find((puntata) => puntata.username == getCookie("username"));
		if (puntata) {	//se ha già puntato non può rilanciare
			min = min>puntata.somma? min-puntata.somma:min;
			bet_in.readOnly = true;
		};
		bet_in.value = min;
		bet_in.min = min;
		check_b.disabled = min? true:false;
		fold_b.disabled = false;
	};
	bet_b.disabled = false;
});

check_b.onclick = async () => {
	let player = inf.players.find((player) => player.username == getCookie("username"));
	socket.emit("move",{tipo:"check",giro:giro_turno.giro,turno:giro_turno.turno,ordine:player.ordine,somma:0});
	check_b.disabled = true;
};

fold_b.onclick = async () => {
	let player = inf.players.find((player) => player.username == getCookie("username"));
	socket.emit("move",{tipo:"fold",giro:giro_turno.giro,turno:giro_turno.turno,ordine:player.ordine,somma:0});
	fold_b.disabled = true;
};

bet_b.onclick = async () => {
	let move = "call";
	let player = inf.players.find((player) => player.username == getCookie("username"));
	let somma = bet_in.value<bet_in.min? bet_in.min:bet_in.value;
	if (giro_turno.giro==1 && inf.puntate_giro.length==0) {
		move = "small-blind";
	} else if (giro_turno.giro==1 && inf.puntate_giro.length==1) {
		move = "big-blind";
	} else {
		if(somma == 0){
			move = "check";
		} else if (somma>=player.fiches) {
			somma = player.fiches;
			move = "all-in";
		} else if(somma > bet_in.min && inf.puntate_giro.length!=0) {
			move = "raise";
		};
	};
	bet_b.disabled = true;
	socket.emit("move",{tipo:move, giro:giro_turno.giro, turno:giro_turno.turno, ordine:player.ordine,somma:somma});
	bet_in.value = null;
};

socket.on("your cards", async(cards) => { //[{id,valore,seme,path} x2]
	draw_your_cards(canvas_cards,step,cards);
});

socket.on("move", async(move) => { //{ordine,tipo:,puntata:{giocatore:socket,mano:,giro:,somma:}}
	//draw messaggi sulla mossa
	last_move = move;
});

socket.on("all cards", async(carte) => { //{ordine : [ {id,valore,seme,path} , {id,valore,seme,path} ], x n}
	//draw tutte le carte sul canvas
	all_cards = carte;
});

socket.on("end hand", async(winners) => { //[ordine,ordine...]
	//draw vincitori e tasto per tornare al tavolo
	vincitori = winners;
	setTimeout(() => {
		console.log("end hand")
		socket.emit("unready");
		in_game = false;
		div_bottom.classList.add("d-none");
		div_invites.classList.remove("dis-none");
		div_friends.classList.remove("dis-none");
		navbar.classList.remove("dis-none");
		canvas_container.classList.remove("full-screen")
        canvas.width  = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
		draw_lobby(canvas,step);
		draw_table(canvas,step,1,1);
		draw_players(canvas,step,v_players,0,0);
		create_table_b.classList.add("d-none");
		invites_container.classList.add("d-none");
		ready_b.classList.remove("d-none");
		ready_b.classList.remove("ready");
		quit_b.classList.remove("d-none");
	}, 13000);
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
		console.log("a")
	  	window.location.reload();
	};
};

/*
//{n_mano:,small_blind:,dealer:,giro:,turno:,puntate_giro:,somma_tot:,carte:[{id,valore,seme,path}],players:[{username,pronto,ordine,fiches,eliminato}]}
create_table_b.classList.add("d-none");
invites_container.classList.add("d-none");
canvas_container.classList.add("full-screen")
navbar.classList.add("dis-none");
div_friends.classList.add("dis-none");
div_invites.classList.add("dis-none");
div_bottom.classList.remove("d-none");

let infor = {carte:[{path:"/cards/7-2.png"},{path:"/cards/7-2.png"},{path:"/cards/7-2.png"}], players:[],
			dealer:1, giro:1, n_mano:1, puntate_giro:[], small_blind:1, somma_tot:null, turno:2,
			players:[{username:"aa",ordine:1,fiches:250},{username:"prova",ordine:2,fiches:500},
			{username:"mirkomaralit",ordine:3,fiches:200},{username:"mirkomarawaw",ordine:3,fiches:10},
			{username:"prova",ordine:2,fiches:250}
		],in_gioco:[{username:"aa"},{username:"prova"},{username:"mirkomaralit"}]
		}

let cards = [{path:"/cards/14-2.png"},{path:"/cards/9-2.png"}]
setTimeout(() => {
	canvas.width  = canvas.offsetWidth;
	canvas.height = canvas.offsetHeight;
	canvas_fiches.width  = canvas_fiches.offsetWidth;
	draw_hand(canvas,canvas_fiches,step,infor);
	canvas_cards.width  = canvas_cards.offsetWidth;
	canvas_cards.height = canvas_cards.offsetHeight;
	draw_your_cards(canvas_cards,step,cards);
}, 500);
*/