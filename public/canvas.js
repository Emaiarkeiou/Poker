import { getCookie } from "./cookies.js";

const draw_lobby = (canvas,step) => {
    const ctx = canvas.getContext("2d");
    let width = canvas.width, height = canvas.height;

    ctx.clearRect(0,0,width,height);
    const grad=ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2,height/2); 	//center,center,innerradius,center,center,outerradius
    grad.addColorStop(0, "#0a1711");
    grad.addColorStop(1, "#030806");
    ctx.fillStyle = grad;
    ctx.fillRect(0,0, width,height);
};

const draw_table = (canvas,step,scalex,scaley) => {
    const ctx = canvas.getContext("2d");
    let width = canvas.width, height = canvas.height;

    let c = {x:width/2,y:height/2};     //centro del canvas
    ctx.beginPath();
    ctx.fillStyle = "#652c55";
    ctx.ellipse(c.x,(c.y)+step/2, (width/5)*scalex,(height/8)*scaley, 0, 0,2*Math.PI);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = "#723e57";
    ctx.ellipse(c.x,(c.y), (width/5)*scalex,(height/8)*scaley, 0, 0,2*Math.PI);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = "#7d425e";
    ctx.ellipse(c.x,c.y-step/2, (width/5)*scalex,(height/8)*scaley, 0, 0,2*Math.PI);	//center,center,Mradius,mradius,rotation, start angle, end angle
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = "#28625b";
    ctx.ellipse(c.x,c.y-step/2, ((width/5)-step)*scalex,((height/8)-step)*scaley, 0, 0,2*Math.PI);	//center,center,Mradius,mradius,rotation, start angle, end angle
    ctx.fill();
};

const draw_players = (canvas,step,players,scalex,scaley) => {   //username,pronto,ordine,fiches,eliminato
    const ctx = canvas.getContext("2d");
    let width = canvas.width, height = canvas.height;

    ctx.strokeStyle = "#7df9ff";
    ctx.lineWidth = step/3;

    const r = width/25;     //raggio omino
    const username = getCookie("username");
    const you = players.find((player) => player.username == username);
    const angle = ((2*Math.PI)/players.length);
    const offset = you.ordine * angle;

    players.forEach(player => {
        if (player.username == username) {
            ctx.fillStyle = "#00a86b";
        } else if (player.eliminato ){
            ctx.fillStyle = "#0a1711";
        } else {
            ctx.fillStyle = "#123524";
        };
        let c = {x:width/2,y:height/2}; //centro del canvas

        let y_offset = height/(3.9-scaley) * Math.sin(angle*player.ordine+Math.PI/2-offset);
        let x_offset = width/(3.8-scalex) * Math.cos(angle*player.ordine+Math.PI/2-offset);

        c.x += x_offset;
        c.y += y_offset;

        ctx.beginPath();

        ctx.arc(c.x, c.y+(r+ctx.lineWidth-step),   r, Math.PI, 0);

        ctx.lineTo(c.x-r-step/6, c.y+r+ctx.lineWidth-step);

        ctx.fill();
        if (player.pronto) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#7df9ff";
            ctx.stroke();
        };

        ctx.beginPath();
        ctx.arc(c.x, c.y-(r/2+step),   (r-step), 0, 2*Math.PI);
        ctx.fill();
        if (player.pronto) {
            ctx.stroke();
        };

        ctx.fillStyle = "#7df9ff";
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.font = "bold 1rem Helvetica";
        ctx.textBaseline = "top";
        ctx.textAlign = "center";
        ctx.fillText(player.username, c.x, c.y+r-ctx.lineWidth ,r*3);
        ctx.fillText(player.fiches, c.x, c.y+r/4 ,r*3);

    }); 
};

const transition = async (canvas,canvas_fiches,canvas_cards,step,info) => {
    const ctx = canvas.getContext("2d");
    let width = canvas.width, height = canvas.height;

    const frames = 360;
    const interval = 60/1000; //ms
    let j = 0;
    const i = setInterval( () =>{
        j++;
        ctx.clearRect(0,0,width,height);
        draw_table(canvas,step,  1+(j/frames)*3, 1+(j/frames)*8);
        draw_players(canvas,step,info.players,  (j/frames)*4, (j/frames)*5);
        if (j >= frames) {
            clearInterval(i);
            ctx.fillStyle = "#28625b";
            ctx.fillRect(0,0, width,height);
            document.getElementById("canvas_container").classList.add("full-screen")
            document.getElementById("navbar").classList.add("dis-none");
	        document.getElementById("div_friends").classList.add("dis-none");
	        document.getElementById("div_invites").classList.add("dis-none");
            document.getElementById("div_bottom").classList.remove("d-none");
            setTimeout(() => {
                canvas.width  = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
                canvas_fiches.width  = canvas_fiches.offsetWidth;
                canvas_cards.width  = canvas_cards.offsetWidth;
                canvas_cards.height = canvas_cards.offsetHeight;
                draw_hand(canvas,canvas_fiches,step,info);
                draw_your_cards(canvas_cards,step,[]);
            }, 500);
        };
    },interval);
};



const draw_hand = async (canvas,canvas_fiches,step,info) => {    
    const ctx = canvas.getContext("2d");
    let width = canvas.width, height = canvas.height;
    //{small_blind:,dealer:,giro:,turno:,puntate_giro:[{username,giocatore,mano,giro,somma}],somma_tot:,players:[{username,ordine,fiches,eliminato}]}

    /*
	{n_mano:,small_blind:,dealer:,giro:,turno:,puntate_giro:[{username,giocatore,mano,giro,somma}],
	somma_tot:, carte:[{id,valore,seme,path}],players:[{username,pronto,ordine,fiches,eliminato}]}
	*/
    let c = {x:width/2,y:height/2};     //centro del canvas

    ctx.clearRect(0,0, width,height);
    // TAVOLO
    const grad=ctx.createLinearGradient(0, 0, width,height); 	//center,center,innerradius,center,center,outerradius
    grad.addColorStop(0, "#28625b");
    grad.addColorStop(0.2, "#2a6c65");
    grad.addColorStop(0.4, "#28625b");
    grad.addColorStop(0.6, "#2a6c65");
    grad.addColorStop(0.8, "#28625b");
    grad.addColorStop(1, "#2a6c65");

    ctx.fillStyle = grad;
    ctx.fillRect(0,0, width,height);
    
    const cardwidth = (1.8*step*4);
    const cardheight = (2.5*step*4);

    const total_width = cardwidth*7 + step*15;
    const total_height = cardwidth*3 + step*3;
    ctx.beginPath();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#37877f";
    ctx.lineWidth = 1;
    ctx.roundRect(c.x-total_width/2, c.y-total_height/2,width-2*(c.x-total_width/2),height-2*(c.y-total_height/2),step/2); 
    ctx.stroke();

    // PLACEHOLDER / BORDI CARTE E PUNTATE
    for (let i=0;i<6;i++) {
        ctx.shadowColor = "#7df9ff";
        ctx.beginPath();
        if (i == 5) {
            ctx.shadowBlur = 0;
            ctx.strokeStyle = "#37877f";
            ctx.lineWidth = 1;
            ctx.roundRect((c.x-total_width/2+step) + i*(cardwidth+2*step), c.y-(step+cardwidth*3)/2,cardwidth*2+step*3,cardwidth*3+step,step/3); 
            ctx.stroke();

            ctx.beginPath();
            ctx.shadowBlur = 13;
            ctx.strokeStyle = "#7df9ff";
            ctx.lineWidth = step/4;
            ctx.roundRect((c.x-total_width/2+2*step) + i*(cardwidth+2*step), c.y-(cardwidth*3-step)/2,cardwidth*2+step,cardwidth*3-step,step/3);
            ctx.stroke();

        } else {
            ctx.shadowBlur = 0;
            ctx.strokeStyle = "#37877f";
            ctx.lineWidth = 1;
            ctx.roundRect(c.x-((7/2)*cardwidth+6.5*step) + i*(cardwidth+2*step), c.y-(cardheight+step)/2,cardwidth+step,cardheight+step,step/3); 
            ctx.stroke();

            ctx.beginPath();
            ctx.shadowBlur = 13;
            ctx.strokeStyle = "#7df9ff";
            ctx.lineWidth = step/4;
            ctx.roundRect(c.x-((7/2)*cardwidth+5.5*step) + i*(2*step+cardwidth), c.y-(cardheight-step)/2,cardwidth-step,cardheight-step,step/3); 
            ctx.stroke();
        };
    };



    // CARTE IN TAVOLO
    let i = 0
    let images = [];
    info.carte.forEach((carta) => {
        images.push(new Image());
        images[i].src = carta.path;
        console.log(images[i]);
        i++;
    });

    images.forEach((image) => { //l'ordine di visualizzazione è casuale???
        image.onload = () => {
            ctx.drawImage(image,c.x-((7/2)*cardwidth+6*step)+images.indexOf(image)*(2*step+cardwidth),c.y-cardheight/2,cardwidth,cardheight);
        };
    });
    
  
    // PLAYER

    // YOU
    const ctx_fiches = canvas_fiches.getContext("2d");
    let widthf = canvas_fiches.width, heightf = canvas_fiches.height;
    ctx_fiches.clearRect(0,0,widthf,heightf);
    let c_f = {x:widthf/2, y:heightf/2}
    let player = info.players.find((player) => player.username == getCookie("username"));

    const space = step/4;

    const percentage = player.fiches/(250 * info.players.length); //percentuale di fiche che si hanno
    let colore = "";
    if (percentage < 0.1) {
        colore = "#ff0000";
    } else if (percentage < 0.3) {
        colore = "#ff7700";
    } else {
        colore = "#00ff00";
    }
    ctx_fiches.fillStyle = colore;
    ctx_fiches.strokeStyle = colore;
    ctx_fiches.shadowColor = colore;
    ctx_fiches.shadowBlur = 13;
    
    ctx_fiches.beginPath();
    ctx_fiches.lineWidth = space;
    ctx_fiches.roundRect(step/2,step/2,widthf-step,heightf-step,step/3); 
    ctx_fiches.stroke();

    ctx_fiches.shadowBlur = 0;

    const y = step/2 + space*2;

    ctx_fiches.globalCompositeOperation = "xor";
    ctx_fiches.beginPath();
    ctx_fiches.roundRect(y,y, (widthf - 2*y)*percentage,heightf - 2*y,space);
    ctx_fiches.fill();

    ctx_fiches.font = "bold 4rem Helvetica";
    ctx_fiches.textBaseline = "middle";
    ctx_fiches.textAlign = "center";
    ctx_fiches.fillText(player.fiches, c_f.x, c_f.y);
    ctx_fiches.globalCompositeOperation = "source-over";
    


    // OTHER PLAYERS

    ctx.shadowBlur = 0;

    const angle = ((2*Math.PI)/info.players.length);
    let ordine = player.ordine;

    const card_width = step * 14;
    const card_height = step * 10;

    const card_grad = ctx.createLinearGradient(0,0,width,height);
    card_grad.addColorStop(0, "rgba(40,98,91,1)");
    card_grad.addColorStop(0.2, "rgba(18,53,36,0.5)");
    card_grad.addColorStop(0.4, "rgba(40,98,91,1)");
    card_grad.addColorStop(0.6, "rgba(18,53,36,0.5)");
    card_grad.addColorStop(0.8, "rgba(40,98,91,1)");
    card_grad.addColorStop(1, "rgba(18,53,36,0.5)");
    for (let i=0;i<info.players.length;i++) {
        if (ordine != player.ordine) {
            let y_offset = height/1.7 * Math.sin(angle*i+Math.PI/2);
            let x_offset = width/1.7 * Math.cos(angle*i+Math.PI/2);

            let centrox = c.x + x_offset;
            centrox = centrox < card_width/2 ? card_width/2:centrox;
            centrox = centrox > width-card_width/2? width-card_width/2:centrox;

            let centroy = c.y + y_offset;
            centroy = centroy< card_height/2 ? card_height/2:centroy;
            centroy = centroy> height-card_height/2 ? height-card_height/2:centroy;

            const corner_x = centrox-card_width/2;
            const corner_y = centroy-card_height/2;
            
            ctx.fillStyle = card_grad;

            ctx.beginPath();
            ctx.roundRect(corner_x,corner_y,card_width,card_height,step/3);
            ctx.fill();

            ctx.font = "bold 1.5rem Helvetica";
            ctx.textBaseline = "top";
            ctx.textAlign = "start";

            ctx.beginPath();
            ctx.fillStyle = "#ffffff";
            ctx.fillText(info.players[ordine-1].username, corner_x+step, corner_y+step,card_width-2*step);

            const percentage = info.players[ordine-1].fiches/(250 * info.players.length); //percentuale di fiche che si hanno
            let colore = "";
            if (percentage < 0.1) {
                colore = "#ff0000";
            } else if (percentage < 0.3) {
                colore = "#ff7700";
            } else {
                colore = "#00ff00";
            }
            ctx.fillStyle = colore;
            ctx.strokeStyle = colore;
            ctx.shadowColor = colore;
            ctx.shadowBlur = 13;
            
            const space = step/4;
            ctx.beginPath();
            ctx.lineWidth = space;
            ctx.roundRect(corner_x+step,(corner_y+card_height)-7*step,  card_width-2*step,card_height-4*step,step/3); 
            ctx.stroke();

            ctx.shadowBlur = 0;

            const off = space*2;
            
            ctx.beginPath();
            ctx.roundRect(corner_x+step+off,(corner_y+card_height)-7*step+off,  (card_width - step - space*8)*percentage,card_height-4*step-2*off,space);
            ctx.fill();
            
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 3rem Helvetica";
            ctx.textBaseline = "middle";
            ctx.textAlign = "center";
            ctx.fillText(info.players[ordine-1].fiches, centrox, (corner_y+card_height)-4.5*step+off);
            

        };
        ordine = ordine == info.players.length ? 1 : ordine + 1;
    };
    ctx.shadowColor = "#7df9ff";
    ctx.shadowBlur = 13;
};

const draw_your_cards = (canvas,step,cards) => {
    const ctx = canvas.getContext("2d");
    let width = canvas.width, height = canvas.height;

    let c = {x:width/2,y:height/2};     //centro del canvas

    // PLACEHOLDER CARTE
    const cardwidth = (1.8*step*4.5);
    const cardheight = (2.5*step*4.5);
    ctx.strokeStyle = "#37877f";
    ctx.shadowColor = "#7df9ff";
    for (let i=0;i<2;i++) {
        ctx.beginPath();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#37877f";
        ctx.lineWidth = 1;
        ctx.roundRect(c.x-(cardwidth+3*step/2) + i*(cardwidth+2*step),c.y-(cardheight+step)/2,cardwidth+step,cardheight+step,step/3); 
        ctx.stroke();

        ctx.beginPath();
        ctx.shadowBlur = 13;
        ctx.strokeStyle = "#7df9ff";
        ctx.lineWidth = step/4;
        ctx.roundRect(c.x-(cardwidth+step/2) + i*(2*step+cardwidth),c.y-(cardheight-step)/2,cardwidth-step,cardheight-step,step/3); 
        ctx.stroke();
    };

    // CARTE
    let i = 0
    let images = [];
    cards.forEach((carta) => {
        images.push(new Image());
        images[i].src = carta.path;
        i++;
    });
    images.forEach((image) => { //l'ordine di visualizzazione è casuale???
        image.onload = () => {
            ctx.drawImage(image,c.x-(cardwidth+step)+images.indexOf(image)*(2*step+cardwidth),c.y-cardheight/2,cardwidth,cardheight);
        };
    });
};


export { draw_lobby,draw_table,draw_players,transition,draw_hand,draw_your_cards};