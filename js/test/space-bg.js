// Космический фон для тестовых страниц в духе SAGE: туманность, звёзды, край планеты с
// атмосферой и огромная станция-мегаструктура в дымке. Рисуется на <canvas> один раз
// (и при изменении размера окна), сид фиксированный — картинка одинаковая при каждом заходе.
(function(){
  const cv=document.createElement('canvas');
  cv.className='space-bg'; cv.setAttribute('aria-hidden','true');
  document.body.prepend(cv);
  const ctx=cv.getContext('2d');

  function rng(seed){ return ()=>{ seed=(seed*16807)%2147483647; return (seed-1)/2147483646; }; }

  function nebula(w,h,R){
    const blobs=[
      [0.72,0.22,0.55,'70,110,175',0.30],[0.88,0.55,0.40,'40,90,150',0.22],
      [0.30,0.10,0.45,'60,80,140',0.18],[0.10,0.70,0.50,'30,90,120',0.16],
      [0.55,0.75,0.35,'90,70,140',0.10],
    ];
    blobs.forEach(([x,y,r,c,a])=>{
      const g=ctx.createRadialGradient(x*w,y*h,0,x*w,y*h,r*Math.max(w,h));
      g.addColorStop(0,'rgba('+c+','+a+')'); g.addColorStop(1,'rgba('+c+',0)');
      ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    });
    // Рваные облака: много мягких пятен вдоль диагональной «реки» туманности.
    for(let i=0;i<70;i++){
      const t=R(), x=(0.15+t*0.95)*w, y=(0.65-t*0.55+(R()-0.5)*0.25)*h, r=(0.04+R()*0.12)*w;
      const g=ctx.createRadialGradient(x,y,0,x,y,r);
      const c=R()<0.7?'110,150,210':'150,120,200';
      g.addColorStop(0,'rgba('+c+','+(0.025+R()*0.04)+')'); g.addColorStop(1,'rgba('+c+',0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill();
    }
  }

  function stars(w,h,R){
    const n=Math.round(w*h/2600);
    for(let i=0;i<n;i++){
      const x=R()*w, y=R()*h, big=R()<0.04, r=big?1+R()*0.8:0.3+R()*0.6;
      const tint=R(); const c=tint<0.15?'255,226,180':tint<0.35?'200,220,255':'255,255,255';
      ctx.fillStyle='rgba('+c+','+(0.25+R()*0.6)+')';
      ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill();
      if(big){
        const g=ctx.createRadialGradient(x,y,0,x,y,r*6);
        g.addColorStop(0,'rgba('+c+',.25)'); g.addColorStop(1,'rgba('+c+',0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r*6,0,7); ctx.fill();
      }
    }
  }

  function planet(w,h){
    const r=Math.max(w,h)*0.62, cx=-r*0.18, cy=h+r*0.62;
    const body=ctx.createRadialGradient(cx+r*0.35,cy-r*0.55,r*0.1,cx,cy,r);
    body.addColorStop(0,'#1E3550'); body.addColorStop(0.55,'#0F1D30'); body.addColorStop(1,'#070D18');
    ctx.fillStyle=body; ctx.beginPath(); ctx.arc(cx,cy,r,0,7); ctx.fill();
    // Полосы облаков на диске.
    ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,7); ctx.clip();
    for(let i=0;i<14;i++){
      ctx.strokeStyle='rgba(120,170,220,'+(0.02+0.03*Math.sin(i))+')';
      ctx.lineWidth=r*0.012*(1+i%3);
      ctx.beginPath(); ctx.ellipse(cx,cy,r*(0.5+i*0.035),r*(0.5+i*0.035)*0.92,-0.35,3.6,5.6); ctx.stroke();
    }
    ctx.restore();
    // Атмосфера: светящийся край.
    const atm=ctx.createRadialGradient(cx,cy,r*0.97,cx,cy,r*1.07);
    atm.addColorStop(0,'rgba(90,200,240,0)'); atm.addColorStop(0.35,'rgba(90,200,240,.55)'); atm.addColorStop(1,'rgba(90,200,240,0)');
    ctx.fillStyle=atm; ctx.beginPath(); ctx.arc(cx,cy,r*1.07,0,7); ctx.fill();
  }

  // Станция: объёмные модули (лицевая, верхняя и боковая грани), кольцо в перспективе —
  // задняя половина рисуется до корпуса, передняя после. Всё полупрозрачное: она далеко.
  function station(w,h,R){
    const s=Math.min(w*0.62,h*0.68), cx=w*0.68, cy=h*0.46;
    // Корпус непрозрачный: l — освещённость грани (0 тень … 1 свет), a не влияет на прозрачность.
    const col=(l,a)=>'rgb('+Math.round(20+l*62)+','+Math.round(31+l*72)+','+Math.round(50+l*88)+')';
    function box(x,y,bw,bh,d,a){
      // d — глубина: верх и правый бок смещены вверх-вправо (свет сверху слева).
      ctx.fillStyle=col(0.55,a); ctx.fillRect(x,y,bw,bh);
      ctx.fillStyle=col(0.9,a*1.1); ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+d,y-d*0.6); ctx.lineTo(x+bw+d,y-d*0.6); ctx.lineTo(x+bw,y); ctx.fill();
      ctx.fillStyle=col(0.2,a*0.9); ctx.beginPath(); ctx.moveTo(x+bw,y); ctx.lineTo(x+bw+d,y-d*0.6); ctx.lineTo(x+bw+d,y+bh-d*0.6); ctx.lineTo(x+bw,y+bh); ctx.fill();
      // Ряды окон.
      if(bw>s*0.03 && bh>s*0.012){
        ctx.fillStyle='rgba(170,215,255,.55)';
        for(let yy=y+bh*0.3;yy<y+bh*0.8;yy+=Math.max(2,bh*0.3)) for(let xx=x+2;xx<x+bw-2;xx+=4) if(R()<0.55) ctx.fillRect(xx,yy,1.4,1);
      }
    }
    const RX=s*0.52, RY=s*0.12, TILT=-0.06;
    const ringPt=(t,k)=>[cx+Math.cos(t)*RX*k, cy+Math.sin(t)*RY*k+Math.cos(t)*RX*k*TILT];
    function ringHalf(from,to,a){
      for(let i=0;i<=60;i++){
        const t=from+(to-from)*i/60, [x,y]=ringPt(t,1), depth=(Math.sin(t)+1)/2; // 0 — дальний край, 1 — ближний
        const sz=s*(0.012+depth*0.016);
        ctx.fillStyle=col(0.35+depth*0.4,a*(0.5+depth*0.6));
        ctx.fillRect(x-sz/2,y-sz*0.7,sz,sz*1.4);
      }
      ctx.strokeStyle=col(0.6,a*0.7); ctx.lineWidth=s*0.004;
      ctx.beginPath(); for(let i=0;i<=80;i++){ const [x,y]=ringPt(from+(to-from)*i/80,0.985); i?ctx.lineTo(x,y):ctx.moveTo(x,y); } ctx.stroke();
    }
    ctx.save();
    ctx.filter='blur(0.4px)';
    // Дальняя половина кольца и спицы.
    ringHalf(Math.PI,Math.PI*2,0.16);
    ctx.strokeStyle=col(0.5,0.08); ctx.lineWidth=s*0.005;
    [3.6,4.6,5.6].forEach(t=>{ const [x,y]=ringPt(t,1); ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(x,y); ctx.stroke(); });
    // Хребет: сужается к концам, с поперечными рёбрами.
    const top=cy-s*0.62, bot=cy+s*0.58;
    const sg=ctx.createLinearGradient(cx-s*0.035,0,cx+s*0.035,0);
    sg.addColorStop(0,col(0.85,0.22)); sg.addColorStop(0.45,col(0.55,0.2)); sg.addColorStop(1,col(0.15,0.16));
    ctx.fillStyle=sg; ctx.beginPath();
    ctx.moveTo(cx-s*0.012,top); ctx.lineTo(cx+s*0.012,top); ctx.lineTo(cx+s*0.034,cy-s*0.2); ctx.lineTo(cx+s*0.034,cy+s*0.25); ctx.lineTo(cx+s*0.014,bot); ctx.lineTo(cx-s*0.014,bot); ctx.lineTo(cx-s*0.034,cy+s*0.25); ctx.lineTo(cx-s*0.034,cy-s*0.2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle=col(0.2,0.25); ctx.lineWidth=1;
    for(let y=top+s*0.03;y<bot;y+=s*0.022){ ctx.beginPath(); ctx.moveTo(cx-s*0.03,y); ctx.lineTo(cx+s*0.03,y); ctx.stroke(); }
    // Модули-блоки вдоль хребта.
    for(let i=0;i<26;i++){
      const y=top+s*0.06+i*s*0.042+R()*s*0.012, bw=s*(0.035+R()*0.09), bh=s*(0.014+R()*0.028), side=R()<0.5?-1:1;
      box(side<0?cx-s*0.03-bw:cx+s*0.03,y,bw,bh,s*0.012,0.13+R()*0.07);
    }
    // Ядро: многоярусный хаб.
    box(cx-s*0.11,cy-s*0.045,s*0.22,s*0.09,s*0.03,0.2);
    box(cx-s*0.07,cy-s*0.09,s*0.14,s*0.045,s*0.025,0.22);
    box(cx-s*0.035,cy-s*0.125,s*0.07,s*0.035,s*0.018,0.24);
    // Солнечные крылья с сеткой.
    [-1,1].forEach(side=>{
      for(let j=0;j<4;j++){
        const pw=s*0.06, x=cx+side*(s*0.07+j*s*0.066)-(side<0?pw:0), y=top+s*0.1;
        ctx.fillStyle=col(0.3,0.14); ctx.fillRect(x,y,pw,s*0.17);
        ctx.strokeStyle=col(0.75,0.08); ctx.lineWidth=1;
        for(let k=1;k<7;k++){ ctx.beginPath(); ctx.moveTo(x,y+k*s*0.024); ctx.lineTo(x+pw,y+k*s*0.024); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(x+pw/2,y); ctx.lineTo(x+pw/2,y+s*0.17); ctx.stroke();
      }
    });
    // Шпиль и док-фермы.
    ctx.strokeStyle=col(0.7,0.2); ctx.lineWidth=s*0.004;
    ctx.beginPath(); ctx.moveTo(cx,top); ctx.lineTo(cx,top-s*0.16); ctx.stroke();
    ctx.lineWidth=s*0.0025;
    for(let i=0;i<5;i++){ const y=cy+s*(0.14+i*0.08), d=s*(0.13+R()*0.1)*(i%2?1:-1);
      ctx.beginPath(); ctx.moveTo(cx,y); ctx.lineTo(cx+d,y+s*0.015); ctx.lineTo(cx+d,y+s*0.04); ctx.stroke();
      box(cx+d-(d<0?s*0.04:0),y+s*0.04,s*0.04,s*0.016,s*0.008,0.16); }
    // Ближняя половина кольца — поверх корпуса.
    ringHalf(0,Math.PI,0.2);
    ctx.strokeStyle=col(0.55,0.12); ctx.lineWidth=s*0.006;
    [0.6,1.6,2.6].forEach(t=>{ const [x,y]=ringPt(t,1); ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(x,y); ctx.stroke(); });
    ctx.filter='none';
    // Огни: янтарные и голубые, с ореолом у крупных.
    for(let i=0;i<120;i++){
      const onRing=R()<0.4, t=R()*Math.PI*2;
      const [x,y]=onRing?ringPt(t,1):[cx+(R()-0.5)*s*0.26,top+R()*(bot-top)];
      const c=R()<0.35?'255,180,90':'150,225,255', r=0.5+R()*1.1;
      ctx.fillStyle='rgba('+c+','+(0.4+R()*0.5)+')'; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill();
      if(r>1.3){ const g=ctx.createRadialGradient(x,y,0,x,y,r*5); g.addColorStop(0,'rgba('+c+',.3)'); g.addColorStop(1,'rgba('+c+',0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r*5,0,7); ctx.fill(); }
    }
    // Маяк на шпиле.
    const g=ctx.createRadialGradient(cx,top-s*0.16,0,cx,top-s*0.16,s*0.02);
    g.addColorStop(0,'rgba(255,90,90,.9)'); g.addColorStop(1,'rgba(255,90,90,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,top-s*0.16,s*0.02,0,7); ctx.fill();
    ctx.restore();
    // Дымка расстояния поверх станции.
    const haze=ctx.createRadialGradient(cx,cy,s*0.05,cx,cy,s*1.0);
    haze.addColorStop(0,'rgba(60,95,150,.22)'); haze.addColorStop(1,'rgba(14,24,42,.12)');
    ctx.fillStyle=haze; ctx.fillRect(0,0,w,h);
  }

  function draw(){
    const dpr=Math.min(2,window.devicePixelRatio||1), w=window.innerWidth, h=window.innerHeight;
    cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const R=rng(424242);
    const bg=ctx.createLinearGradient(0,0,0,h);
    bg.addColorStop(0,'#13213A'); bg.addColorStop(0.5,'#0B1424'); bg.addColorStop(1,'#060A12');
    ctx.fillStyle=bg; ctx.fillRect(0,0,w,h);
    nebula(w,h,R); stars(w,h,R); station(w,h,R); planet(w,h);
    // Виньетка, чтобы интерфейс читался по краям.
    const v=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*0.3,w/2,h/2,Math.max(w,h)*0.8);
    v.addColorStop(0,'rgba(4,7,12,0)'); v.addColorStop(1,'rgba(4,7,12,.65)');
    ctx.fillStyle=v; ctx.fillRect(0,0,w,h);
  }
  let t=0;
  window.addEventListener('resize',()=>{ clearTimeout(t); t=setTimeout(draw,150); });
  draw();
})();
