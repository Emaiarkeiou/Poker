const draw_lobby = (ctx,width,height,step) => {
    const grad=ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2,height/2); 	//center,center,innerradius,center,center,outerradius
    grad.addColorStop(0, "#0a1711");
    grad.addColorStop(1, "#030806");
    ctx.fillStyle = grad;
    ctx.fillRect(0,0, width,height);
};

const draw_table = (ctx,width,height,step) => {
    ctx.beginPath();
    ctx.fillStyle = "#3f1d35";
    ctx.ellipse(width/2,height/2+width/6+step/2, width/10,height/16, 0, 0,2*Math.PI);
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.fillStyle = "#4c2340";
    ctx.ellipse(width/2,height/2+width/6, width/10,height/16, 0, 0,2*Math.PI);	//center,center,Mradius,mradius,rotation, start angle, end angle
    ctx.fill();
    ctx.closePath();

    ctx.fillStyle = "#5a284c";
    ctx.fillRect(width/2-step,height/2-step, step*2,width/6+step);

    ctx.beginPath();
    ctx.ellipse(width/2,height/2+width/6, step,step/2, 0, 0,2*Math.PI);
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.fillStyle = "#652c55";
    ctx.ellipse(width/2,(height/2)+step/2, width/5,height/8, 0, 0,2*Math.PI);
    ctx.fill();
    ctx.closePath();

    //ctx.shadowColor = "fuchsia";
    //ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.fillStyle = "#723e57";
    ctx.ellipse(width/2,(height/2), width/5,height/8, 0, 0,2*Math.PI);
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.fillStyle = "#7d425e";
    ctx.ellipse(width/2,height/2-step/2, width/5,height/8, 0, 0,2*Math.PI);	//center,center,Mradius,mradius,rotation, start angle, end angle
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.fillStyle = "#28625b";
    ctx.ellipse(width/2,height/2-step/2, (width/5)-step,(height/8)-step, 0, 0,2*Math.PI);	//center,center,Mradius,mradius,rotation, start angle, end angle
    ctx.fill();
    ctx.closePath();
}

const draw_players = (ctx,width,height,step,players) => {
    const grad=ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2,height/2); 	//center,center,innerradius,center,center,outerradius
    grad.addColorStop(0, "#0a1711");
    grad.addColorStop(1, "#030806");
    ctx.fillStyle = grad;
    ctx.fillRect(0,0, width,height);
};

export { draw_lobby,draw_table,draw_players };