// Вкладка 3 · «Стройка» — изометрические анимированные сцены зданий для карточек строительства.
// Каждая сцена — SVG 260×190: плита-основание 7×7 клеток, на ней здание с тремя гранями
// разной освещённости (свет слева-сверху). Движение — только CSS (вращение, качание, потоки),
// поэтому карточку достаточно построить один раз: 3-build.js не пересоздаёт картинку каждый
// тик, а лишь подставляет «живые» значения через CSS-переменные (--sun, --chg) и уровень жидкости.
// Акцентный цвет берётся из --tier-color карточки.
//
// Проекция: экран = (X + (x−y)·0.866·U, Y + (x+y)·0.5·U − z·U), U = 13 px на клетку.
// Порядок рисования — «от дальнего к ближнему» (по возрастанию x+y), вручную.

const IU=13, IOX=130, IOY=84;
let bartUid=0, _bp='';
function f1(n){ return (Math.round(n*10)/10).toString(); }
function ip(x,y,z){ return [IOX+(x-y)*IU*0.866, IOY+(x+y)*IU*0.5-(z||0)*IU]; }
function ipts(a){ return a.map(p=>{ const q=ip(p[0],p[1],p[2]); return f1(q[0])+','+f1(q[1]); }).join(' '); }
function dl(a,b){ const p=ip(a[0],a[1],a[2]), q=ip(b[0],b[1],b[2]); return [Math.round(q[0]-p[0]),Math.round(q[1]-p[1])]; }

// Материалы: [верх, левая грань, правая грань]
const MAT={
  steel:['#8794BA','#5B6893','#3D4772'],
  dark:['#4A5580','#333C63','#232A49'],
  concrete:['#A7AFC4','#7A839F','#59627F'],
  roof:['#59627F','#414A6B','#2F3755'],
  accent:['color-mix(in srgb,var(--tier-color) 80%,#fff)','var(--tier-color)','color-mix(in srgb,var(--tier-color) 55%,#000)'],
  wood:['#A3805A','#7C5E3D','#5A4229'],
  pipe:['#B5BFDB','#7E8BB2','#535F88'],
  water:['#9FDDFF','#3FA8DC','#24709A'],
  oil:['#B49A62','#6E5A33','#443619'],
  plate:['#26305A','#1C2445','#141A33'],
};
function bartBegin(){ _bp='b'+(++bartUid)+'-'; }
function matDefs(){
  let s='<defs><radialGradient id="'+_bp+'glow" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:color-mix(in srgb,var(--tier-color) 38%,transparent)"/><stop offset="1" style="stop-color:transparent"/></radialGradient>';
  Object.keys(MAT).forEach(k=>{
    const m=MAT[k];
    ['t','l','r'].forEach((fc,i)=>{
      s+='<linearGradient id="'+_bp+k+fc+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:'+m[i]+'"/><stop offset="1" style="stop-color:color-mix(in srgb,'+m[i]+' '+(fc==='t'?88:70)+'%,#000)"/></linearGradient>';
    });
    s+='<linearGradient id="'+_bp+k+'c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:'+m[0]+'"/><stop offset=".35" style="stop-color:'+m[1]+'"/><stop offset="1" style="stop-color:'+m[2]+'"/></linearGradient>';
  });
  return s+'</defs>';
}
function ipoly(a,fill,stroke,extra){
  return '<polygon points="'+ipts(a)+'" style="fill:'+fill+';stroke:'+(stroke||'rgba(0,0,0,.35)')+';stroke-width:.6;stroke-linejoin:round"'+(extra?' '+extra:'')+'/>';
}
function ibox(x,y,z,w,d,h,mat,o){
  o=o||{};
  const g=fc=>'url(#'+_bp+mat+fc+')';
  return ipoly([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]],g('l'))+
    ipoly([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]],g('r'))+
    (o.nt?'':ipoly([[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]],g('t'),'rgba(255,255,255,.25)'));
}
function icyl(cx,cy,z,r,h,mat){
  const p=ip(cx,cy,z), rx=r*IU*1.2247, ry=r*IU*0.7071, H=h*IU;
  return '<path d="M'+f1(p[0]-rx)+' '+f1(p[1]-H)+' V'+f1(p[1])+' A'+f1(rx)+' '+f1(ry)+' 0 0 0 '+f1(p[0]+rx)+' '+f1(p[1])+' V'+f1(p[1]-H)+' Z" style="fill:url(#'+_bp+mat+'c);stroke:rgba(0,0,0,.3);stroke-width:.6"/>'+
    '<ellipse cx="'+f1(p[0])+'" cy="'+f1(p[1]-H)+'" rx="'+f1(rx)+'" ry="'+f1(ry)+'" style="fill:url(#'+_bp+mat+'t);stroke:rgba(255,255,255,.25);stroke-width:.6"/>';
}
function iln(a,b,stroke,w,extra){
  const p=ip(a[0],a[1],a[2]), q=ip(b[0],b[1],b[2]);
  return '<line x1="'+f1(p[0])+'" y1="'+f1(p[1])+'" x2="'+f1(q[0])+'" y2="'+f1(q[1])+'" style="stroke:'+stroke+';stroke-width:'+w+';stroke-linecap:round"'+(extra?' '+extra:'')+'/>';
}
function iquadY(y,x0,x1,z0,z1,fill,cls){ return ipoly([[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1]],fill,'rgba(0,0,0,.4)',cls?'class="'+cls+'"':''); }
function iquadX(x,y0,y1,z0,z1,fill,cls){ return ipoly([[x,y0,z0],[x,y1,z0],[x,y1,z1],[x,y0,z1]],fill,'rgba(0,0,0,.4)',cls?'class="'+cls+'"':''); }
// Группа в плоскости стены y=const (грань, обращённая влево-вниз): u — вдоль x, v — вниз от z.
function gWallY(y,x0,zTop,inner){ const p=ip(x0,y,zTop); return '<g transform="matrix(.866 .5 0 1 '+f1(p[0])+' '+f1(p[1])+')">'+inner+'</g>'; }
// Группа в плоскости стены x=const (грань, обращённая вправо-вниз): u — вдоль y.
function gWallX(x,y0,zTop,inner){ const p=ip(x,y0,zTop); return '<g transform="matrix(-.866 .5 0 1 '+f1(p[0])+' '+f1(p[1])+')">'+inner+'</g>'; }
// Группа-«пол»: круг, лежащий на горизонтальной плоскости (вращение внутри — ba-spin).
function gFloor(x,y,z,inner){ const p=ip(x,y,z); return '<g transform="translate('+f1(p[0])+' '+f1(p[1])+') scale(1 .577)">'+inner+'</g>'; }

// Частица, бегущая по прямой (dx,dy) в экранных пикселях; переменные анимации вливаются в style.
function bartFlow(cls,shape,dx,dy,dur,delay,extra){
  const vars='--tx:'+dx+'px;--ty:'+dy+'px;--dur:'+dur+'s;animation-delay:-'+delay+'s;'+(extra||'');
  const s=shape.replace(/\/>$/,' class="'+cls+'"/>');
  if(/style="/.test(s)) return s.replace('style="','style="'+vars);
  return s.replace(/\/>$/,' style="'+vars+'"/>');
}
function smoke(x,y,z,n){
  const p=ip(x,y,z); let s='';
  for(let i=0;i<n;i++) s+=bartFlow('ba-flow ba-smoke','<circle cx="'+f1(p[0])+'" cy="'+f1(p[1])+'" r="3" style="fill:#C9D2EE"/>',6,-24,3.6,i*3.6/n);
  return s;
}

// Плита-основание 7×7 с сеткой и уголками акцентного цвета.
function ibase(){
  let g='';
  for(let i=1;i<7;i++) g+=iln([i,0,0.02],[i,7,0.02],'rgba(120,160,220,.13)',.6)+iln([0,i,0.02],[7,i,0.02],'rgba(120,160,220,.13)',.6);
  let c='';
  [[0,0,1,1],[7,0,-1,1],[0,7,1,-1],[7,7,-1,-1]].forEach(([x,y,dx,dy])=>{
    c+='<polyline points="'+ipts([[x+dx*0.9,y,0.03],[x,y,0.03],[x,y+dy*0.9,0.03]])+'" style="fill:none;stroke:var(--tier-color);stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round"/>';
  });
  return '<ellipse cx="130" cy="150" rx="122" ry="46" style="fill:url(#'+_bp+'glow)"/>'+
    ibox(-0.4,-0.4,-0.6,7.8,7.8,0.6,'dark',{nt:true})+
    ipoly([[-0.4,-0.4,0],[7.4,-0.4,0],[7.4,7.4,0],[-0.4,7.4,0]],'url(#'+_bp+'darkt)','rgba(255,255,255,.2)')+
    ipoly([[0,0,0.01],[7,0,0.01],[7,7,0.01],[0,7,0.01]],'url(#'+_bp+'platet)','rgba(0,0,0,.4)')+g+c;
}
function bartFrame(inner){
  return '<svg class="bart-svg" viewBox="18 4 224 184" aria-hidden="true">'+matDefs()+ibase()+inner+'</svg>';
}
// Ферма-опора: башня с четырьмя ногами и перекладинами.
function itower(cx,cy,r0,r1,z0,z1,levels,leg,brace){
  const at=(sx,sy,z)=>{ const t=(z-z0)/(z1-z0), r=r0+(r1-r0)*t; return [cx+sx*r,cy+sy*r,z]; };
  let br='';
  levels.forEach(z=>{
    const a=at(-1,-1,z),b=at(1,-1,z),c=at(1,1,z),d=at(-1,1,z);
    br+='<polyline points="'+ipts([a,b,c,d,a])+'" style="fill:none;stroke:'+brace+';stroke-width:1.3"/>';
  });
  for(let i=0;i<levels.length-1;i++){
    const za=levels[i], zb=levels[i+1], flip=i%2;
    [[[-1,1],[1,1]],[[1,1],[1,-1]],[[-1,-1],[1,-1]],[[-1,-1],[-1,1]]].forEach(([p,q],k)=>{
      const A=at(p[0],p[1],flip?zb:za), B=at(q[0],q[1],flip?za:zb);
      br+=iln(A,B,brace,1.1,k>1?'opacity=".55"':'');
    });
  }
  const legs=[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sy])=>iln(at(sx,sy,z0),at(sx,sy,z1),leg,2.6));
  return {back:legs[0]+br, mid:legs[1]+legs[2], front:legs[3]};
}
function isoPlant(P,kind,delay,s){
  const leaf='#4E8A3A', leaf2='#3B6D2E'; let b='';
  if(kind==='wheat'){
    b='<path d="M-3 0 Q-3 -10 -4 -17 M0 0 V-20 M3 0 Q3 -10 4 -16" stroke="'+leaf+'" stroke-width="1.5" fill="none"/>'+
      '<ellipse cx="-4" cy="-19" rx="1.9" ry="4.5" style="fill:var(--wheat)"/><ellipse cx="0" cy="-22" rx="2" ry="5" style="fill:var(--wheat)"/><ellipse cx="4" cy="-18" rx="1.9" ry="4.5" style="fill:var(--wheat)"/>';
  }else if(kind==='potato'){
    b='<circle cx="-4" cy="-4" r="4.2" fill="'+leaf+'"/><circle cx="4" cy="-5" r="4.6" fill="'+leaf2+'"/><circle cx="0" cy="-9" r="4.2" fill="'+leaf+'"/><circle cx="1" cy="-11" r="1.3" fill="#E9ECF7"/><circle cx="-4" cy="-7" r="1.1" fill="#E9ECF7"/>';
  }else if(kind==='corn'){
    b='<path d="M0 0 V-27" stroke="'+leaf+'" stroke-width="2"/><path d="M0 -6 Q-9 -10 -11 -18 M0 -14 Q9 -18 10 -26" stroke="'+leaf+'" stroke-width="1.8" fill="none"/>'+
      '<ellipse cx="3" cy="-14" rx="2.6" ry="6" style="fill:var(--corn)"/><path d="M0 -27 L-3 -32 M0 -27 L3 -32" stroke="var(--wheat)" stroke-width="1"/>';
  }else{
    b='<circle cx="-5" cy="-5" r="4.5" fill="'+leaf2+'"/><circle cx="5" cy="-8" r="4.5" fill="'+leaf+'"/><circle cx="0" cy="-12" r="4.2" fill="'+leaf2+'"/>'+
      '<circle cx="-4" cy="-2" r="2.6" style="fill:var(--tomato)"/><circle cx="5" cy="-6" r="2.5" style="fill:var(--tomato)"/><circle cx="1" cy="-10" r="2.2" style="fill:var(--tomato)"/>';
  }
  return '<g transform="translate('+f1(P[0])+' '+f1(P[1])+') scale('+(s||1)+')"><g class="ba-sway" style="animation-delay:-'+delay+'s">'+b+'</g></g>';
}

// ---------- Горнодобывающая установка: копёр над стволом, подъёмная машина, конвейер, отвал ----------
function bartMiner(){
  bartBegin();
  const ores=['iron','copper','coal','stone'];
  let s='';
  // Машинное здание
  s+=ibox(0.5,0.5,0,2.1,2.3,1.5,'concrete');
  s+=ibox(0.35,0.35,1.5,2.4,2.6,0.28,'roof');
  s+=iquadY(2.8,0.85,1.5,0.55,1.15,'var(--tier-color)','ba-win');
  s+=iquadY(2.8,1.85,2.3,0,1.0,'#161B30');
  s+=iquadX(2.6,0.9,1.5,0.55,1.15,'var(--tier-color)','ba-win');
  s+=ibox(0.75,0.7,1.78,0.4,0.4,0.9,'dark');
  s+=smoke(0.95,0.9,2.7,3);
  // Устье ствола
  s+=ibox(3.0,2.5,0,2.4,2.4,0.4,'concrete');
  s+=ipoly([[3.3,2.8,0.4],[5.1,2.8,0.4],[5.1,4.6,0.4],[3.3,4.6,0.4]],'#04060D','rgba(0,0,0,.7)');
  // Конвейер: лента поднимается от устья к бункеру над отвалом
  const bx0=5.4,bx1=6.7,by0=3.3,by1=3.85,bz0=0.5,bz1=1.9;
  s+=iln([5.9,by1,0],[5.9,by1,0.9],'#4A5580',1.6)+iln([6.35,by1,0],[6.35,by1,1.35],'#4A5580',1.6);
  s+=ipoly([[bx0,by1,bz0-0.3],[bx1,by1,bz1-0.3],[bx1,by1,bz1],[bx0,by1,bz0]],'url(#'+_bp+'steell)');
  s+=ipoly([[bx0,by0,bz0],[bx1,by0,bz1],[bx1,by1,bz1],[bx0,by1,bz0]],'#232B4E','rgba(255,255,255,.2)');
  s+=ipoly([[bx1,by0,bz1-0.3],[bx1,by1,bz1-0.3],[bx1,by1,bz1],[bx1,by0,bz1]],'url(#'+_bp+'steelr)');
  const cs=ip(bx0,(by0+by1)/2,bz0), cd=dl([bx0,0,bz0],[bx1,0,bz1]);
  for(let i=0;i<5;i++) s+=bartFlow('ba-flow','<rect x="'+f1(cs[0]-2.5)+'" y="'+f1(cs[1]-5)+'" width="5" height="4" rx="1.3" style="fill:var(--'+ores[i%4]+')"/>',cd[0],cd[1],4,i*0.8);
  // Отвал руды под концом ленты
  const pp=ip(6.2,4.7,0), pr=17;
  s+='<path d="M'+f1(pp[0]-pr)+' '+f1(pp[1])+' Q'+f1(pp[0]-pr*0.45)+' '+f1(pp[1]-22)+' '+f1(pp[0])+' '+f1(pp[1]-24)+' Q'+f1(pp[0]+pr*0.45)+' '+f1(pp[1]-22)+' '+f1(pp[0]+pr)+' '+f1(pp[1])+' A'+pr+' 9.5 0 0 1 '+f1(pp[0]-pr)+' '+f1(pp[1])+' Z" style="fill:color-mix(in srgb,var(--tier-color) 25%,#222A4A);stroke:rgba(0,0,0,.4);stroke-width:.6"/>';
  [[-8,-3,'iron'],[0,-8,'copper'],[8,-3,'coal'],[-2,1,'stone'],[5,3,'iron'],[-9,2,'copper'],[2,-15,'coal'],[-4,-13,'stone']]
    .forEach(([dx,dy,c])=>{ s+='<circle cx="'+f1(pp[0]+dx)+'" cy="'+f1(pp[1]+dy)+'" r="3.4" style="fill:var(--'+c+');stroke:rgba(0,0,0,.35);stroke-width:.5"/>'; });
  const pe=ip(bx1,(by0+by1)/2,bz1);
  for(let i=0;i<3;i++) s+=bartFlow('ba-flow','<rect x="'+f1(pe[0]-2)+'" y="'+f1(pe[1])+'" width="4" height="4" rx="1" style="fill:var(--'+ores[i]+')"/>',3,Math.round(pp[1]-pe[1]-20),1.2,i*0.4);
  // Копёр: ноги, распорки, шкив, клеть
  const T=itower(4.2,3.7,0.9,0.2,0.4,6.2,[0.4,2.3,4.2,6.2],'#8794BA','#5B6893');
  s+=T.back+T.mid;
  s+=iln([4.2,3.7,6.2],[4.2,3.7,0.4],'rgba(180,190,220,.5)',1);
  s+='<g class="ba-skip" style="--tr:-46px">'+ibox(4.05,3.55,0.6,0.3,0.3,0.55,'accent')+'</g>';
  const w=ip(4.2,3.7,6.6);
  s+='<g transform="matrix(.866 .5 0 1 '+f1(w[0])+' '+f1(w[1])+')"><g class="ba-spin" style="--spd:3s"><circle r="10" fill="#1A2142" stroke="#8794BA" stroke-width="2.6"/><path d="M-10 0H10M0 -10V10M-7 -7L7 7M7 -7L-7 7" stroke="#B5BFDB" stroke-width="1.3"/></g><circle r="2.6" fill="#B5BFDB"/></g>';
  s+=T.front;
  s+=ibox(3.85,3.35,6.2,0.7,0.7,0.2,'dark');
  const bc=ip(4.2,3.7,7.5);
  s+='<line x1="'+f1(bc[0])+'" y1="'+f1(bc[1]+10)+'" x2="'+f1(bc[0])+'" y2="'+f1(bc[1]+2)+'" style="stroke:#8794BA;stroke-width:1.6"/><circle class="ba-beacon" cx="'+f1(bc[0])+'" cy="'+f1(bc[1])+'" r="2.6"/>';
  // Ящики и прожектор
  s+=ibox(0.7,5.5,0,0.8,0.8,0.7,'wood')+ibox(1.7,5.9,0,0.7,0.7,0.5,'wood');
  const lp=ip(6.5,6.5,0);
  s+='<line x1="'+f1(lp[0])+'" y1="'+f1(lp[1])+'" x2="'+f1(lp[0])+'" y2="'+f1(lp[1]-40)+'" style="stroke:#8794BA;stroke-width:2"/><rect class="ba-win" x="'+f1(lp[0]-6)+'" y="'+f1(lp[1]-46)+'" width="12" height="6" rx="2" style="fill:var(--tier-color)"/>';
  return bartFrame(s);
}

// ---------- Буровая установка: вышка, ротор, талевый блок, баки с водой и нефтью ----------
function bartDrill(){
  bartBegin();
  let s='';
  // Машинный дом с дымящей трубой
  s+=ibox(0.5,2.6,0,1.6,1.7,1.2,'steel');
  s+=ibox(0.4,2.5,1.2,1.8,1.9,0.2,'roof');
  s+=iquadY(4.3,0.8,1.4,0.5,0.95,'var(--tier-color)','ba-win');
  s+=ibox(1.55,2.7,1.4,0.3,0.3,1.3,'dark');
  s+=smoke(1.7,2.85,2.8,3);
  // Вышка
  s+=ibox(2.6,1.4,0,2.4,2.4,0.4,'concrete');
  const T=itower(3.8,2.6,1.0,0.28,0.4,7.2,[0.4,2.2,4.2,6.0,7.2],'#8794BA','#5B6893');
  s+=T.back+T.mid;
  // Ротор на полу вышки
  s+=gFloor(3.8,2.6,0.45,'<circle r="15" fill="#1A2142" stroke="#8794BA" stroke-width="2"/><g class="ba-spin" style="--spd:2s"><path d="M-14 0H14M0 -14V14M-10 -10L10 10M10 -10L-10 10" stroke="#B5BFDB" stroke-width="1.6"/></g><circle r="4" fill="#04060D"/>');
  // Бурильная колонна и талевый блок
  s+=iln([3.8,2.6,7.0],[3.8,2.6,0.5],'#B5BFDB',2.2);
  s+='<g class="ba-skip" style="--tr:-40px">'+ibox(3.55,2.35,1.6,0.5,0.5,0.6,'accent')+iln([3.8,2.6,2.2],[3.8,2.6,2.9],'#B5BFDB',1.4)+'</g>';
  const cb=ip(3.8,2.6,7.4);
  s+=T.front;
  s+=ibox(3.45,2.25,7.2,0.7,0.7,0.35,'dark');
  s+='<circle class="ba-beacon" cx="'+f1(cb[0])+'" cy="'+f1(cb[1]-14)+'" r="2.6"/>';
  // Баки: вода (справа-сзади) и нефть (справа-спереди), трубы с течением
  s+=ibox(4.9,2.4,0.2,1.7,0.22,0.22,'pipe')+ibox(3.6,3.8,0.2,0.22,1.7,0.22,'pipe')+ibox(3.6,5.3,0.2,2.0,0.22,0.22,'pipe');
  const wa=[4.9,2.5,0.31], wb=[6.1,2.5,0.31];
  const wd=dl(wa,wb), wp=ip(wa[0],wa[1],wa[2]);
  for(let i=0;i<4;i++) s+=bartFlow('ba-flow','<circle cx="'+f1(wp[0])+'" cy="'+f1(wp[1]-1)+'" r="2" style="fill:var(--water)"/>',wd[0],wd[1],2.2,i*0.55);
  const oa=[3.7,5.4,0.31], ob=[3.7,3.9,0.31];
  const od=dl(oa,ob), op=ip(oa[0],oa[1],oa[2]);
  for(let i=0;i<4;i++) s+=bartFlow('ba-flow','<circle cx="'+f1(op[0])+'" cy="'+f1(op[1]-1)+'" r="2" style="fill:#C4A66A"/>',od[0],od[1],2.2,i*0.55);
  s+=icyl(6.0,2.5,0,0.85,2.3,'water');
  s+=icyl(5.2,5.5,0,1.0,1.7,'oil');
  s+=iln([6.0,3.1,0.2],[6.0,3.1,1.9],'rgba(255,255,255,.3)',1.6)+iln([5.2,6.1,0.2],[5.2,6.1,1.4],'rgba(255,255,255,.22)',1.6);
  const vl=ip(6.0,2.5,2.3);
  s+='<circle class="ba-led" cx="'+f1(vl[0])+'" cy="'+f1(vl[1]-2)+'" r="2.2"/>';
  return bartFrame(s);
}

// ---------- Солнечная панель: два ряда панелей на стойках, инвертор, солнце/луна по игровому времени ----------
function bartSolar(){
  bartBegin();
  let s='';
  s+='<g class="ba-moon"><circle cx="216" cy="34" r="11" fill="#C9D2EE"/><circle cx="221" cy="30" r="10" fill="#0A0D18"/></g>';
  [[24,18],[60,10],[102,24],[150,8],[80,42],[20,50],[176,44]].forEach(([x,y])=>{ s+='<circle class="ba-star" cx="'+x+'" cy="'+y+'" r="1.1"/>'; });
  s+='<g class="ba-sunwrap"><circle cx="216" cy="34" r="22" style="fill:var(--energy);opacity:.18"/><g class="ba-spin" style="--spd:24s">'+
    [0,45,90,135,180,225,270,315].map(a=>{ const r=a*Math.PI/180; return '<path d="M'+f1(216+15*Math.cos(r))+' '+f1(34+15*Math.sin(r))+' L'+f1(216+21*Math.cos(r))+' '+f1(34+21*Math.sin(r))+'" stroke="var(--energy)" stroke-width="2.4" stroke-linecap="round"/>'; }).join('')+
    '</g><circle cx="216" cy="34" r="11" style="fill:var(--energy)"/></g>';
  const panel=(x,y0,w,d,zb,zf)=>{
    let g='';
    g+=iln([x+0.2,y0+0.1,0],[x+0.2,y0+0.1,zb],'#4A5580',2)+iln([x+w-0.2,y0+0.1,0],[x+w-0.2,y0+0.1,zb],'#4A5580',2);
    g+=iln([x+0.2,y0+d-0.1,0],[x+0.2,y0+d-0.1,zf],'#4A5580',2)+iln([x+w-0.2,y0+d-0.1,0],[x+w-0.2,y0+d-0.1,zf],'#4A5580',2);
    const A=[x,y0,zb],B=[x+w,y0,zb],C=[x+w,y0+d,zf],D=[x,y0+d,zf];
    g+=ipoly([[x,y0+d,zf-0.12],[x+w,y0+d,zf-0.12],C,D],'url(#'+_bp+'steell)');
    g+=ipoly([A,B,C,D],'#1B3070','#9AA5C6');
    for(let i=1;i<4;i++){ const t=i/4; g+=iln([x+w*t,y0,zb],[x+w*t,y0+d,zf],'#2F4690',.8); }
    for(let i=1;i<3;i++){ const t=i/3, z=zb+(zf-zb)*t; g+=iln([x,y0+d*t,z],[x+w,y0+d*t,z],'#2F4690',.8); }
    g+=ipoly([A,B,C,D],'var(--energy)','none','class="ba-glare"');
    return g;
  };
  s+=panel(0.4,0.6,2.0,1.7,1.9,1.0)+panel(2.5,0.6,2.0,1.7,1.9,1.0)+panel(4.6,0.6,2.0,1.7,1.9,1.0);
  s+=panel(0.4,3.0,2.0,1.7,1.9,1.0)+panel(2.5,3.0,2.0,1.7,1.9,1.0)+panel(4.6,3.0,2.0,1.7,1.9,1.0);
  // Кабель и импульсы
  const c0=[0.15,2.5,0.05], c1=[0.15,5.6,0.05];
  s+=iln(c0,c1,'#3A4468',2.4)+iln([0.15,0.9,0.05],c0,'#3A4468',2.4);
  const cd=dl(c0,c1), cp=ip(c0[0],c0[1],c0[2]);
  for(let i=0;i<4;i++) s+=bartFlow('ba-flow ba-sunonly','<circle cx="'+f1(cp[0])+'" cy="'+f1(cp[1])+'" r="2" style="fill:var(--energy)"/>',cd[0],cd[1],2.6,i*0.65);
  // Инвертор
  s+=ibox(0.5,5.4,0,1.5,1.2,1.4,'steel');
  s+=iquadY(6.6,0.7,1.8,0.85,1.2,'#0B1022');
  const lp=ip(0.9,6.6,1.0);
  s+='<circle class="ba-led" cx="'+f1(lp[0])+'" cy="'+f1(lp[1])+'" r="2" style="fill:var(--energy)"/>';
  return bartFrame(s);
}

// ---------- Ферма: теплица с грядками внутри, четыре грядки снаружи, водонапорный бак и полив ----------
function bartFarm(){
  bartBegin();
  let s='';
  const GL='rgba(150,220,255,.14)', GD='rgba(150,220,255,.08)';
  s+=ibox(0.2,0.2,0,4.7,3.4,0.25,'concrete');
  s+=ipoly([[0.35,0.35,0.26],[4.75,0.35,0.26],[4.75,3.45,0.26],[0.35,3.45,0.26]],'#3B2E20','rgba(0,0,0,.4)');
  s+=iquadY(0.3,0.3,4.7,0.25,1.6,GD)+iquadX(0.3,0.3,3.5,0.25,1.6,GD);
  const inner=[];
  [[0.8,'wheat'],[1.5,'potato'],[2.2,'corn'],[2.9,'tomato']].forEach(([y,k])=>{
    s+=ibox(0.6,y-0.2,0.25,4.0,0.4,0.12,'wood');
    for(let x=0.9;x<4.4;x+=0.75) inner.push([x+y,x,y,k]);
  });
  inner.sort((a,b)=>a[0]-b[0]).forEach(([,x,y,k],i)=>{ s+=isoPlant(ip(x,y,0.42),k,(i*0.6)%3,0.95); });
  s+=iquadY(3.5,0.3,4.7,0.25,1.6,GL);
  s+=ipoly([[4.7,0.3,0.25],[4.7,3.5,0.25],[4.7,3.5,1.6],[4.7,1.9,2.6],[4.7,0.3,1.6]],GL);
  s+=ipoly([[0.3,1.9,2.6],[4.7,1.9,2.6],[4.7,3.5,1.6],[0.3,3.5,1.6]],'rgba(150,220,255,.18)');
  let rib='';
  for(let x=0.3;x<=4.71;x+=1.1) rib+=iln([x,3.5,0.25],[x,3.5,1.6],'rgba(200,230,255,.55)',1)+iln([x,3.5,1.6],[x,1.9,2.6],'rgba(200,230,255,.55)',1);
  rib+=iln([4.7,3.5,0.25],[4.7,3.5,1.6],'rgba(220,240,255,.8)',1.4)+iln([4.7,0.3,1.6],[4.7,1.9,2.6],'rgba(220,240,255,.7)',1.2)+iln([4.7,1.9,2.6],[4.7,3.5,1.6],'rgba(220,240,255,.8)',1.4)+iln([4.7,3.5,1.6],[4.7,0.3,1.6],'rgba(220,240,255,.5)',1)+
    iln([0.3,1.9,2.6],[4.7,1.9,2.6],'rgba(220,240,255,.9)',1.6)+iln([0.3,3.5,1.6],[4.7,3.5,1.6],'rgba(220,240,255,.8)',1.4)+iln([0.3,3.5,0.25],[4.7,3.5,0.25],'rgba(220,240,255,.6)',1);
  s+=rib;
  // водонапорная башня
  s+=iln([5.5,0.7,0],[5.6,0.8,2.2],'#5B6893',2)+iln([6.3,0.7,0],[6.2,0.8,2.2],'#5B6893',2)+iln([5.5,1.5,0],[5.6,1.4,2.2],'#5B6893',2)+iln([6.3,1.5,0],[6.2,1.4,2.2],'#5B6893',2);
  s+=icyl(5.9,1.1,2.2,0.75,1.0,'water');
  const tp=ip(5.9,1.1,3.2);
  s+='<path d="M'+f1(tp[0]-9.2)+' '+f1(tp[1])+' L'+f1(tp[0])+' '+f1(tp[1]-9)+' L'+f1(tp[0]+9.2)+' '+f1(tp[1])+' Z" style="fill:#5B6893;stroke:rgba(0,0,0,.3);stroke-width:.6"/>';
  // труба и полив
  s+=ibox(6.5,1.0,0,0.2,3.3,0.2,'pipe')+ibox(6.5,4.0,0,0.2,0.2,2.6,'pipe');
  s+=ibox(0.4,4.0,2.5,6.3,0.16,0.16,'pipe');
  // грядки снаружи
  const beds=[[0.5,'wheat'],[1.95,'potato'],[3.4,'corn'],[4.85,'tomato']];
  beds.forEach(([x])=>{
    s+=ibox(x,4.4,0,1.3,2.3,0.3,'wood');
    s+=ipoly([[x+0.12,4.52,0.3],[x+1.18,4.52,0.3],[x+1.18,6.58,0.3],[x+0.12,6.58,0.3]],'#3B2E20','rgba(0,0,0,.4)');
  });
  const outp=[];
  beds.forEach(([x,k])=>{ [4.95,5.55,6.15].forEach(y=>[x+0.38,x+0.92].forEach(px=>outp.push([px+y,px,y,k]))); });
  outp.sort((a,b)=>a[0]-b[0]).forEach(([,x,y,k],i)=>{ s+=isoPlant(ip(x,y,0.3),k,(i*0.45)%3,1); });
  beds.forEach(([x],i)=>{
    const n=ip(x+0.65,4.08,2.5);
    for(let j=0;j<3;j++) s+=bartFlow('ba-flow ba-drop','<path d="M'+f1(n[0]+(j-1)*4)+' '+f1(n[1]+3)+' v4"/>',(j-1)*2,32,1.4,(i*0.35+j*0.47)%1.4);
  });
  return bartFrame(s);
}

// ---------- Аккумулятор: шкаф с четырьмя ячейками (заряд — живой, --chg), вентиляторы, ЛЭП ----------
function bartBattery(){
  bartBegin();
  let s='';
  const mast=[6.4,0.7];
  s+=iln([mast[0]-0.3,mast[1]-0.3,0],[mast[0],mast[1],5.2],'#6E7AA3',2)+iln([mast[0]+0.3,mast[1]-0.3,0],[mast[0],mast[1],5.2],'#6E7AA3',2)+
     iln([mast[0]-0.3,mast[1]+0.3,0],[mast[0],mast[1],5.2],'#6E7AA3',2)+iln([mast[0]+0.3,mast[1]+0.3,0],[mast[0],mast[1],5.2],'#6E7AA3',2);
  s+=iln([mast[0]-0.35,mast[1]-0.35,2.0],[mast[0]+0.35,mast[1]+0.35,2.0],'#5B6893',1.2)+iln([mast[0]-0.25,mast[1]-0.25,3.6],[mast[0]+0.25,mast[1]+0.25,3.6],'#5B6893',1.2);
  s+=iln([mast[0]-0.9,mast[1]-0.9,5.0],[mast[0]+0.9,mast[1]+0.9,5.0],'#B5BFDB',2.4);
  s+=iln([mast[0],mast[1],5.0],[6.1,2.3,1.4],'#3A4468',1.6);
  const cd=dl([mast[0],mast[1],5.0],[6.1,2.3,1.4]), cp=ip(mast[0],mast[1],5.0);
  for(let i=0;i<3;i++) s+=bartFlow('ba-flow','<circle cx="'+f1(cp[0])+'" cy="'+f1(cp[1])+'" r="2" style="fill:var(--energy)"/>',cd[0],cd[1],1.8,i*0.6);
  s+=ibox(5.5,2.3,0,1.2,1.1,1.4,'accent');
  [0.25,0.6,0.95].forEach(x=>{ s+=iln([5.5+x,3.4,0.2],[5.5+x,3.4,1.2],'rgba(0,0,0,.35)',1.4); });
  s+=iln([5.5,3.0,0.12],[4.9,3.0,0.12],'#3A4468',2.4);
  const g0=dl([5.5,3.0,0.12],[4.9,3.0,0.12]), gp=ip(5.5,3.0,0.12);
  for(let i=0;i<3;i++) s+=bartFlow('ba-flow','<circle cx="'+f1(gp[0])+'" cy="'+f1(gp[1])+'" r="1.8" style="fill:var(--energy)"/>',g0[0],g0[1],1.2,i*0.4);
  s+=ibox(0.3,1.1,0,4.7,3.1,0.25,'dark');
  s+=ibox(0.5,1.3,0.25,4.3,2.7,2.8,'steel');
  let win='<rect x="'+f1(0.3*IU)+'" y="'+f1(0.3*IU)+'" width="'+f1(3.7*IU)+'" height="'+f1(2.0*IU)+'" rx="2" fill="#0B1022" stroke="#232B4E" stroke-width="1.2"/>';
  for(let i=0;i<4;i++){
    const cx=(0.42+i*0.9)*IU;
    win+='<rect x="'+f1(cx)+'" y="'+f1(0.4*IU)+'" width="'+f1(0.78*IU)+'" height="'+f1(1.8*IU)+'" rx="1.5" fill="#141A33"/>'+
      '<rect class="ba-cell" x="'+f1(cx+1)+'" y="'+f1(0.4*IU+1)+'" width="'+f1(0.78*IU-2)+'" height="'+f1(1.8*IU-2)+'" rx="1"/>'+
      '<path d="M'+f1(cx)+' '+f1(0.85*IU)+'h'+f1(0.78*IU)+'M'+f1(cx)+' '+f1(1.3*IU)+'h'+f1(0.78*IU)+'M'+f1(cx)+' '+f1(1.75*IU)+'h'+f1(0.78*IU)+'" stroke="#0B1022" stroke-width="1.6"/>';
  }
  win+='<rect x="'+f1(0.3*IU)+'" y="'+f1(2.45*IU)+'" width="'+f1(1.2*IU)+'" height="'+f1(0.18*IU)+'" rx="1" style="fill:var(--tier-color)"/>';
  s+=gWallY(4.0,0.5,3.05,win);
  let rf='';
  for(let i=0;i<6;i++) rf+='<path d="M'+f1(0.25*IU)+' '+f1((0.35+i*0.28)*IU)+'h'+f1(1.0*IU)+'" stroke="#232B4E" stroke-width="1.6"/>';
  rf+='<path class="ba-bolt" d="M'+f1(1.9*IU)+' '+f1(0.35*IU)+' l'+f1(-0.4*IU)+' '+f1(0.75*IU)+' h'+f1(0.3*IU)+' l'+f1(-0.2*IU)+' '+f1(0.85*IU)+' l'+f1(0.6*IU)+' '+f1(-1.0*IU)+' h'+f1(-0.3*IU)+' l'+f1(0.2*IU)+' '+f1(-0.6*IU)+' Z"/>';
  rf+='<circle class="ba-led" cx="'+f1(2.4*IU)+'" cy="'+f1(2.3*IU)+'" r="2.2"/>';
  s+=gWallX(4.8,1.3,3.05,rf);
  [[1.7,2.65],[3.5,2.65]].forEach(([x,y])=>{
    const R=0.7*IU*1.2247, R2=R-2;
    s+=gFloor(x,y,3.05,'<circle r="'+f1(R)+'" fill="#0B1022" stroke="#B5BFDB" stroke-width="1.6"/><g class="ba-spin" style="--spd:.8s"><path d="M0 0 L0 -'+f1(R2)+' Q'+f1(R*0.5)+' -'+f1(R*0.8)+' 0 0 M0 0 L'+f1(R2)+' 0 Q'+f1(R*0.8)+' '+f1(R*0.5)+' 0 0 M0 0 L0 '+f1(R2)+' Q-'+f1(R*0.5)+' '+f1(R*0.8)+' 0 0 M0 0 L-'+f1(R2)+' 0 Q-'+f1(R*0.8)+' -'+f1(R*0.5)+' 0 0" fill="#6E7AA3"/></g><circle r="2.4" fill="#B5BFDB"/>');
  });
  s+=ibox(0.8,1.5,3.05,0.5,0.4,0.25,'dark')+ibox(4.1,1.5,3.05,0.5,0.4,0.25,'dark');
  return bartFrame(s);
}

// ---------- Резервуар: стеклянная капсула (та же, что на складе) на опоре, трубы с течением ----------
function bartCapsule(resId,lvl,pct){
  if(typeof capsuleSvg==='function') return capsuleSvg(resId,lvl,pct,'b'+bartUid).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
  return '<rect x="40" y="10" width="60" height="140" rx="30" fill="rgba(150,220,255,.15)" stroke="var(--lqt)" stroke-width="3"/>';
}
function bartTank(resId,lvl,pct){
  bartBegin();
  let s='';
  s+=ibox(0,3.2,0.2,2.5,0.4,0.4,'pipe')+ibox(3.2,4.6,0.2,0.4,2.4,0.4,'pipe');
  const a=[0,3.4,0.6], b=[2.6,3.4,0.6];
  const d1=dl(a,b), p1=ip(a[0],a[1],a[2]);
  for(let i=0;i<4;i++) s+=bartFlow('ba-flow','<circle cx="'+f1(p1[0])+'" cy="'+f1(p1[1]-1)+'" r="2" style="fill:var(--lqt)"/>',d1[0],d1[1],2.4,i*0.6);
  const c=[3.4,4.6,0.6], e=[3.4,7,0.6];
  const d2=dl(c,e), p2=ip(c[0],c[1],c[2]);
  for(let i=0;i<4;i++) s+=bartFlow('ba-flow','<circle cx="'+f1(p2[0])+'" cy="'+f1(p2[1]-1)+'" r="2" style="fill:var(--lqt)"/>',d2[0],d2[1],2.4,i*0.6);
  s+=ibox(2.3,2.3,0,2.4,2.4,0.4,'steel');
  s+=iln([1.0,3.4,0.6],[1.0,3.4,1.2],'#8794BA',1.8);
  const v=ip(1.0,3.4,1.2);
  s+='<circle cx="'+f1(v[0])+'" cy="'+f1(v[1])+'" r="4" fill="none" stroke="#B5BFDB" stroke-width="2"/>';
  s+='<svg x="80" y="15" width="100" height="119" viewBox="0 0 140 166">'+bartCapsule(resId,lvl,pct)+'</svg>';
  return bartFrame(s);
}

// Сцена по ключу типа здания; неизвестный тип — крупная версия его обычной иконки на плите.
function buildArtFor(key,iconKey,colorVar){
  if(key==='miner') return bartMiner();
  if(key==='drill') return bartDrill();
  if(key==='solar') return bartSolar();
  if(key==='farm') return bartFarm();
  if(key==='battery') return bartBattery();
  bartBegin();
  const inner=(typeof ICONS!=='undefined' && ICONS[iconKey]) || '<circle cx="10" cy="10" r="7"/>';
  return bartFrame('<g transform="translate(94 40) scale(3.6)" style="color:var(--'+colorVar+')" fill="currentColor">'+inner+'</g>');
}
