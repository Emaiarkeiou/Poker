const chat = document.getElementById("chat");
const input_mess = document.getElementById("input");
const sendButton = document.getElementById("sendButton");
const div_chat = document.getElementById("div_chat");

const input_user = document.getElementById("in_user");
const joinButton = document.getElementById("joinButton");
const div_nome = document.getElementById("div_nome");

const template =
  '<li class="list-group-item"><sub>%NAME</sub><br>%MESSAGE &nbsp; <sub>%DATE</sub></li>';
const template_self =
  '<li class="list-group-item text-end">%MESSAGE &nbsp; <sub>%DATE</sub></li>';
const template_serv = '<li class="list-group-item text-center">%MESSAGE</li>';
const messages = [];
let username = "";
const socket = io();

input_mess.onkeydown = (event) => {
  if (event.keyCode === 13) {
    event.preventDefault();
    sendButton.click();
  }
};

input_user.onkeydown = (event) => {
  if (event.keyCode === 13) {
    event.preventDefault();
    joinButton.click();
  }
};

joinButton.onclick = () => {
  username = input_user.value;
  div_nome.classList.remove("d-block");
  div_chat.classList.remove("d-none");
  div_nome.classList.add("d-none");
  div_chat.classList.add("d-block");
};

sendButton.onclick = () => {
  socket.emit("message", { name: username, message: input_mess.value });
  input_mess.value = "";
};

socket.on("chat", (message) => {
  console.log(message);
  messages.push(message);
  render();
});

const render = () => {
  let html = "";
  messages.forEach((message) => {
    let row = "";
    if (message.socketid === socket.id) {
      row = template_self
        .replace("%MESSAGE", message.message)
        .replace("%DATE", message.date);
    } else if (message.date !== "") {
      row = template
        .replace("%NAME", message.name)
        .replace("%MESSAGE", message.message)
        .replace("%DATE", message.date);
    } else {
      row = template_serv.replace("%MESSAGE", message.message);
    }
    html += row;
  });
  chat.innerHTML = html;
  window.scrollTo(0, document.body.scrollHeight);
};
