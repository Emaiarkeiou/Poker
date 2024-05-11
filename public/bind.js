import { getCookie } from "./cookies.js";

const bind_requests = async (socket,requests) => { //[{utente1:nome,utente2:nome,accettata: 0/1},]
    //remove_%USERNAME
    //accept_%USERNAME
    //reject_%USERNAME
    requests.forEach((request) => {
        if (request.utente1 == getCookie("username")){              //se la richiesta è mandata
            document.getElementById(`remove_${request.utente2}`).onclick = () => {
                socket.emit("remove_friendship",{username: request.utente2})
            };
        } else if (request.utente2 == getCookie("username")) {      //se la richiesta è arrivata
            document.getElementById(`accept_${request.utente1}`).onclick = () => {
                socket.emit("accept_request",{username: request.utente1})
            };
            document.getElementById(`reject_${request.utente1}`).onclick = () => {
                socket.emit("reject_request",{username: request.utente1})
            };
        };
    });
};

const bind_friends = async (socket,friends) => {   //[{username:username,online:0/1},]
    //remove_%USERNAME
    //invite_%USERNAME
    friends.forEach((friend) => {
        document.getElementById(`remove_${friend.username}`).onclick = () => {
            socket.emit("remove_friendship",{username: friend.username})
        };
        if (friend.online) {
            document.getElementById(`invite_${friend.username}`).onclick = () => {
                socket.emit("invite",{username: friend.username})
            };
        } else {};
    });
};

const bind_invites = async (socket,invites) => {   //[{username:username,online:0/1},]
    //accept_invite_%USERNAME
    //reject_invite_%USERNAME
    invites.forEach((invite) => {
        if (invite.username2 == getCookie("username")){
            document.getElementById(`accept_invite_${invite.username1}`).onclick = () => {
                socket.emit("quit_table");
                socket.emit("accept_invite",{username: invite.username1})
            };
            document.getElementById(`reject_invite_${invite.username1}`).onclick = () => {
                socket.emit("reject_invite",{username: invite.username1})
            };
        };
    });
};


export { bind_requests,bind_friends,bind_invites };