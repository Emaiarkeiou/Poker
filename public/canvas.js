import { getCookie } from "./cookies.js";

const draw_lobby = (ctx,width,height,step) => {
    ctx.clearRect(0,0,width,height);
    const grad=ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2,height/2); 	//center,center,innerradius,center,center,outerradius
    grad.addColorStop(0, "#0a1711");
    grad.addColorStop(1, "#030806");
    ctx.fillStyle = grad;
    ctx.fillRect(0,0, width,height);
};

const draw_table = (ctx,width,height,step) => {
    ctx.beginPath();
    ctx.fillStyle = "#652c55";
    ctx.ellipse(width/2,(height/2)+step/2, width/5,height/8, 0, 0,2*Math.PI);
    ctx.fill();

    //ctx.shadowColor = "fuchsia";
    //ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.fillStyle = "#723e57";
    ctx.ellipse(width/2,(height/2), width/5,height/8, 0, 0,2*Math.PI);
    ctx.fill();


    ctx.beginPath();
    ctx.fillStyle = "#7d425e";
    ctx.ellipse(width/2,height/2-step/2, width/5,height/8, 0, 0,2*Math.PI);	//center,center,Mradius,mradius,rotation, start angle, end angle
    ctx.fill();


    ctx.beginPath();
    ctx.fillStyle = "#28625b";
    ctx.ellipse(width/2,height/2-step/2, (width/5)-step,(height/8)-step, 0, 0,2*Math.PI);	//center,center,Mradius,mradius,rotation, start angle, end angle
    ctx.fill();
}

const draw_players = (ctx,width,height,step,players) => {   //username,pronto,ordine,fiches,eliminato
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

        let y_offset = height/3.9 * Math.sin(angle*player.ordine+Math.PI/2-offset);
        let x_offset = width/3.8 * Math.cos(angle*player.ordine+Math.PI/2-offset);

        c.x += x_offset;
        c.y += y_offset;

        ctx.beginPath();

        ctx.arc(c.x, c.y+r+ctx.lineWidth-step,   r, Math.PI, 0);

        ctx.lineTo(c.x-r-step/6, c.y+r+ctx.lineWidth-step);

        ctx.fill();
        if (player.pronto) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#7df9ff";
            ctx.stroke();
        };

        ctx.beginPath();
        ctx.arc(c.x, c.y-r/2-step,   r-step, 0, 2*Math.PI);
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

export { draw_lobby,draw_table,draw_players };