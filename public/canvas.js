import { getCookie } from "./cookies.js";

const draw_lobby = (ctx,width,height,step) => {
    ctx.clearRect(0,0,width,height);
    const grad=ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2,height/2); 	//center,center,innerradius,center,center,outerradius
    grad.addColorStop(0, "#0a1711");
    grad.addColorStop(1, "#030806");
    ctx.fillStyle = grad;
    ctx.fillRect(0,0, width,height);
};

const draw_table = (ctx,width,height,step,scalex,scaley) => {
    let c = {x:width/2,y:height/2};     //centro del canvas
    ctx.beginPath();
    ctx.fillStyle = "#652c55";
    ctx.ellipse(c.x,(c.y)+step/2, (width/5)*scalex,(height/8)*scaley, 0, 0,2*Math.PI);
    ctx.fill();

    //ctx.shadowColor = "fuchsia";
    //ctx.shadowBlur = 15;

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

const draw_players = (ctx,width,height,step,players,scalex,scaley) => {   //username,pronto,ordine,fiches,eliminato
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

const transition = async (canvas_container,canvas,ctx,width,height,step,players,navbar,div_friends,div_invites,info) => {
    const frames = 360;
    const interval = 60/1000; //ms
    let j = 0;
    const i = setInterval( () =>{
        j++;
        ctx.clearRect(0,0,width,height);
        draw_table(ctx,width,height,step,  1+(j/frames)*3, 1+(j/frames)*8);
        draw_players(ctx,width,height,step,players,  (j/frames)*4, (j/frames)*5);
        if (j >= frames) {
            clearInterval(i);
            ctx.fillStyle = "#28625b";
            ctx.fillRect(0,0, width,height);
            canvas_container.classList.add("full-screen")
            navbar.classList.add("dis-none");
	        div_friends.classList.add("dis-none");
	        div_invites.classList.add("dis-none");
            setTimeout(() => {
                canvas.style.width ="100%";
                canvas.style.height="100%";
                canvas.width  = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
                draw_hand(ctx,canvas.width,canvas.height,step,info);
            }, 500);
        };
    },interval);
};



const draw_hand = async (ctx,width,height,step,info) => {     //{carte:[{id,valore,seme,path}], dealer:1, giro:1, n_mano:1, puntate_giro:[], small_blind:1, somma_tot:null, turno:2}
    let c = {x:width/2,y:height/2};     //centro del canvas
    console.log(window.innerWidth,window.innerHeight)
    console.log(width,height,c.x,c.y)

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
    ctx.strokeStyle = "#37877f";

    const total_width = cardwidth*7 + step*15;
    const total_height = cardwidth*3 + step*3;
    ctx.beginPath();    
    ctx.roundRect(c.x-total_width/2, c.y-total_height/2,    width-2*(c.x-total_width/2),height-2*(c.y-total_height/2)     ,step/2); 
    ctx.stroke();


    ctx.beginPath();    
    ctx.roundRect(2*cardwidth-3*step,2*cardwidth-3*step,    width-2*(2*cardwidth-3*step),height-2*(2*cardwidth-3*step)     ,step/2); 
    ctx.stroke();

    for (let i=0;i<6;i++) {
        ctx.beginPath();
        if (i == 5) {
            ctx.roundRect(  (c.x-total_width/2+step) + i*(cardwidth+2*step), 
                        c.y-(step+cardwidth*3)/2,          
                        cardwidth*3+step,
                        cardwidth*3+step,
                        step/3
        ); 
        } else {
            ctx.roundRect(  (c.x-total_width/2+step) + i*(cardwidth+2*step), 
                        c.y-(cardheight+step)/2,          
                        cardwidth+step,
                        cardheight+step,
                        step/3
        ); 
        }

        ctx.stroke();
    };

    const draw = (images,i) => {
        if (images.length > i) {
            images[i].onload = () => {
                ctx.drawImage(images[i],i*100,0)
                images[i+1].onload = draw(images,i+1)
            }
        }
    }
    

    ///cards/logo.png
    let i = 0
    let images = [];
    info.carte.forEach((carta) => {
        images.push(new Image());
        images[i].src = carta.path;
        console.log(images[i]);
        i++;
    });

    draw(images,0);
    /*
    images.forEach((image) => { //l'ordine di visualizzazione è casuale
        image.onload = () => {
            ctx.drawImage(image,images.indexOf(image)*100,0)
        }
    })*/
    

    ctx.lineWidth = step/3;
};



export { draw_lobby,draw_table,draw_players,transition,draw_hand};