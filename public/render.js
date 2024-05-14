import { getCookie } from "./cookies.js";


const sent_request_templ = `
<li class="friend-li d-flex col-12 row m-0 mt-2 p-0">
    <div class="d-flex justify-content-left align-items-center col-8 p-2 ps-3 m-0 overflow-hidden">
        <b>%USERNAME</b>
    </div>
    <div class="d-flex justify-content-center align-items-center col-2 py-2 m-0">
        <button type="button" class="friend-b m-0 p-0 px-2 btn text-light" disabled>
            Mandata
        </button>
    </div>
    <div class="d-flex justify-content-center col-2 py-2 m-0">
        <button id="remove_%USERNAME" type="button" class="remove-friend m-0 p-0 text-light">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
            </svg>
        </button>
    </div>
</li>
`;

const got_request_templ = `
<li class="friend-li d-flex col-12 row m-0 mt-2 p-0">
        <div class="d-flex justify-content-left align-items-center col-8 p-2 ps-3 m-0 overflow-hidden">
            <b>%USERNAME</b>
        </div>
        <div class="d-flex justify-content-center align-items-center col-2 py-2 m-0">
        <button id="accept_%USERNAME" type="button" class="friend-b m-0 p-0 px-2 btn text-light">
            Accetta
        </button>
    </div>
    <div class="d-flex justify-content-center col-2 py-2 m-0">
        <button id="reject_%USERNAME" type="button" class="remove-friend m-0 p-0 text-light">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
            </svg>
        </button>
    </div>
</li>
`;

const online_friend_templ = `
<li class="onlinefriend-li d-flex col-12 row m-0 mt-2 p-0">
    <div class="d-flex justify-content-left align-items-center col-8 p-3 m-0 overflow-hidden">
        <b>%USERNAME</b>
    </div>
    <div class="d-flex justify-content-center align-items-center col-2 py-3 m-0">
        <button id="invite_%USERNAME" type="button" class="friend-b m-0 p-0 px-2 btn text-light">
            Invita
        </button>
    </div>
    <div class="d-flex justify-content-center col-2 py-3 m-0">
        <button id="remove_%USERNAME" type="button" class="remove-friend m-0 p-0 text-light">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
            </svg>
        </button>
    </div>
</li>
`;

const offline_friend_templ = `
<li class="friend-li d-flex col-12 row m-0 mt-2 p-0">
    <div class="d-flex justify-content-left align-items-center col-8 p-3 m-0 overflow-hidden">
        <b>%USERNAME</b>
    </div>
    <div class="d-flex justify-content-center align-items-center col-2 py-3 m-0"></div>
    <div class="d-flex justify-content-center col-2 py-3 m-0">
        <button id="remove_%USERNAME" type="button" class="remove-friend m-0 p-0 text-light">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
            </svg>
        </button>
    </div>
</li>
`;

const invite_templ = `
<li class="invite-li d-flex col-12 row m-0 mt-2 p-0 py-2">
    <div class="d-flex justify-content-left align-items-center col-7 p-2 ps-3 m-0 overflow-hidden">
        <b>%USERNAME</b>
    </div>
    <div class="d-flex justify-content-center align-items-center col-3 py-2 m-0">
        <button id="accept_invite_%USERNAME" type="button" class="join-b m-0 p-0 px-2 btn text-light">
            Unisciti
        </button>
    </div>
    <div class="d-flex justify-content-center col-2 py-2 m-0">
        <button id="reject_invite_%USERNAME" type="button" class="remove-friend m-0 p-0 text-light">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
            </svg>
        </button>
    </div>
</li>
`;

const render_requests = async (ul,requests) => { //[{utente1:nome,utente2:nome,accettata: 0/1},]
    let to_render = "";
    requests.forEach((request) => {
        if (request.utente1 == getCookie("username")){				//se la richiesta è mandata
            to_render += sent_request_templ.replaceAll("%USERNAME",request.utente2);
        } else if (request.utente2 == getCookie("username")) {		//se la richiesta è arrivata
            to_render += got_request_templ.replaceAll("%USERNAME",request.utente1);
        };
    });
    ul.innerHTML = to_render;
};

const render_friends = async (ul,friends) => {  //[{username:username,online:0/1},]
	let to_render = "";
    let online_friends = friends.filter(friend => friend.online);
    let offline_friends = friends.filter(friend => !friend.online);
    online_friends.forEach((friend) => {
        to_render += online_friend_templ.replaceAll("%USERNAME",friend.username);
    });
    offline_friends.forEach((friend) => {
        to_render += offline_friend_templ.replaceAll("%USERNAME",friend.username);
    });
    
    ul.innerHTML = to_render;
};

const render_invites = async (ul,invites) => {  //[{giocatore1:socket,giocatore2:socket,username1:username,username2:username,tavolo},]
	let to_render = "";
    invites.forEach((invite) => {
        if (invite.username2 == getCookie("username")){
            to_render += invite_templ.replaceAll("%USERNAME",invite.username1);
        };
    });
    ul.innerHTML = to_render;
};

export { render_requests,render_friends,render_invites  };