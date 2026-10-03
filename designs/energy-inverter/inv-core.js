/* Общий демо-движок для пяти вариантов страницы «Энергия» (designs/energy-inverter/*).
 *
 * Механика один в один с js/pages/8-energy.js + js/core.js: солнце (sunFactor 06:00–20:00),
 * солнечные панели 150 кВт, угольная ТЭС ~602 кВт, аккумуляторы 2000 кВт·ч + базовые 150,
 * общий коэффициент обеспечения для всех потребителей, сброс излишка при полном заряде,
 * история в корзинах m1/m10/h1/h4 + live (те же поля, что в recordEnergyHistory), журнал из
 * 9 карточек со сравнением с прошлым периодом и окно графика по каждой карточке.
 * Варианты отличаются только разметкой и стилем — данные и поведение берут отсюда (window.INV).
 */
(function(root){
'use strict';

/* ---------------- единицы ---------------- */
var J_PER_KWH=3.6e6;
var POWER_SCALE=[[1e-3,'Вт'],[1,'кВт'],[1e3,'МВт'],[1e6,'ГВт']];
var JOULE_SCALE=[[1,'Дж'],[1e3,'кДж'],[1e6,'МДж'],[1e9,'ГДж'],[1e12,'ТДж']];
function pickUnitScale(sc,v){ var a=Math.abs(v),i=0; for(var k=0;k<sc.length;k++) if(a>=sc[k][0]) i=k; return i; }
function fmtByScale(sc,v){
  if(Math.abs(v)<1e-9) v=0;
  var i=pickUnitScale(sc,v), x=v/sc[i][0], d=Math.abs(x)>=100?0:Math.abs(x)>=10?1:2;
  return (v===0?'0':x.toFixed(d))+' '+sc[i][1];
}
function kw(v){ return v===0?'0 кВт':fmtByScale(POWER_SCALE,v); }
function J(kwh){ return kwh===0?'0 МДж':fmtByScale(JOULE_SCALE,kwh*J_PER_KWH); }
function kwh(v){
  var sc=[[1,'кВт·ч'],[1e3,'МВт·ч'],[1e6,'ГВт·ч']], a=Math.abs(v), i=0;
  sc.forEach(function(s,k){ if(a>=s[0]) i=k; });
  var x=v/sc[i][0], d=Math.abs(x)>=100?0:Math.abs(x)>=10?1:2;
  return (v===0?'0':x.toFixed(d))+' '+sc[i][1];
}
function dur(sec){
  sec=Math.max(0,Math.round(sec));
  var d=Math.floor(sec/86400), h=Math.floor(sec%86400/3600), m=Math.floor(sec%3600/60);
  if(d>0) return d+' д '+h+' ч'; if(h>0) return h+' ч '+m+' м'; if(m>0) return m+' м'; return sec+' с';
}
function plural(n,one,few,many){ var a=n%100,b=n%10; if(a>10&&a<20) return many; if(b===1) return one; if(b>=2&&b<=4) return few; return many; }
function splitVal(s){ var i=s.lastIndexOf(' '); return i<0?[s,'']:[s.slice(0,i),s.slice(i+1)]; }

/* ---------------- время суток ---------------- */
var DAY=86400, DAY_START=6*3600, DAY_END=20*3600;
function clockSec(t){ return ((t%DAY)+DAY)%DAY; }
function sunFactor(t){ var c=clockSec(t); if(c<DAY_START||c>DAY_END) return 0; return Math.sin((c-DAY_START)/(DAY_END-DAY_START)*Math.PI); }
function clockStr(t){ var c=clockSec(t), h=Math.floor(c/3600), m=Math.floor(c%3600/60); return (h<10?'0':'')+h+':'+(m<10?'0':'')+m; }

/* ---------------- постройки (цифры из js/core.js) ---------------- */
var GEN_DEFS=[
  {id:'solar',     type:'solar',title:'Солнечные панели',      kw:150,   color:'#FFDD57'},
  {id:'coal_power',type:'tpp',  title:'Сжигание угля',          kw:601.97,color:'#F2A93B'},
];
var CONS_DEFS=[
  {id:'iron_ore',  type:'miner',  name:'Железная руда',label:'Fe₂O₃',              kw:42.5, color:'#9FB0C8'},
  {id:'copper_ore',type:'miner',  name:'Медная руда',  label:'Cu₂S',               kw:49.7, color:'#E08A4B'},
  {id:'coal',      type:'miner',  name:'Уголь',        label:'C',                  kw:35.7, color:'#8B85A6'},
  {id:'stone',     type:'miner',  name:'Камень',       label:'CaCO₃',              kw:30.64,color:'#C2AD82'},
  {id:'water',     type:'drill',  name:'Вода',         label:'H₂O',                kw:20,   color:'#49B8F0'},
  {id:'oil',       type:'drill',  name:'Нефть',        label:'CxHy',               kw:44.24,color:'#B08D57'},
  {id:'wheat',     type:'farm',   name:'Пшеница',      label:'Triticum',           kw:12,   color:'#E8D078'},
  {id:'potato',    type:'farm',   name:'Картофель',    label:'Solanum tub.',       kw:12,   color:'#A9865B'},
  {id:'corn',      type:'farm',   name:'Кукуруза',     label:'Zea mays',           kw:12.1, color:'#F0B93D'},
  {id:'tomato',    type:'farm',   name:'Томаты',       label:'Solanum lyc.',       kw:12.14,color:'#E1503D'},
  {id:'ration_a',  type:'kitchen',name:'Паёк',         label:'Паёк «Хлеб и каша»', kw:26.69,color:'#C9A24B'},
  {id:'ration_b',  type:'kitchen',name:'Паёк',         label:'Паёк «Картофельный»',kw:26.43,color:'#C9A24B'},
];
var GROUPS=[
  {id:'miner',  name:'Горнодобыча',color:'#C9A227',what:'Сейчас добывается'},
  {id:'drill',  name:'Бурение',    color:'#49B8F0',what:'Сейчас бурится'},
  {id:'farm',   name:'Фермы',      color:'#8CAF52',what:'Сейчас выращивается'},
  {id:'kitchen',name:'Пищеблоки',  color:'#C9A24B',what:'Сейчас готовится'},
  {id:'other',  name:'Прочее',     color:'#F2A93B',what:'Сейчас работает'},
];
var BASE_CAP=150, BATTERY_KWH=2000;
var SCENARIOS={
  start:{label:'Старт',        hint:'3 панели, без ТЭС и аккумуляторов',
    b:{solar:3,iron_ore:1,copper_ore:1,water:1,stone:1}},
  mid:  {label:'Развитая база',hint:'14 панелей, ТЭС, 6 аккумуляторов',
    b:{solar:14,coal_power:1,battery:6,iron_ore:6,copper_ore:5,coal:3,stone:4,water:4,oil:2,wheat:3,potato:2,corn:2,tomato:2,ration_a:2,ration_b:1}},
  big:  {label:'Промышленная', hint:'110 панелей, 4 ТЭС, 40 аккумуляторов',
    b:{solar:110,coal_power:4,battery:40,iron_ore:40,copper_ore:34,coal:22,stone:26,water:24,oil:16,wheat:18,potato:14,corn:14,tomato:12,ration_a:12,ration_b:8}},
};

/* ---------------- состояние симуляции ---------------- */
var S={scenario:'mid', speed:60, play:0, stored:0, frac:1, last:null, hist:null, live:{open:null,rows:[]}};
var EH_TIERS=[{id:'m1',sec:60,keep:120},{id:'m10',sec:600,keep:288},{id:'h1',sec:3600,keep:336},{id:'h4',sec:14400,keep:1080}];
var EH_LIVE={id:'live',sec:5,keep:72};
function B(){ return SCENARIOS[S.scenario].b; }
function cnt(id){ return B()[id]||0; }
function capacity(){ return BASE_CAP+cnt('battery')*BATTERY_KWH; }
function hash(n){ var x=Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); }
function cloud(t){ var d=Math.floor(t/DAY), a=hash(d), b=hash(d+1), f=clockSec(t)/DAY; return 0.62+0.38*(a+(b-a)*f*f*(3-2*f)); }
function duty(i,t){ return 0.84+0.16*Math.sin(t/(3600*(2+i%5))+i*1.7); }
function tppUtil(i,t){ return 0.9+0.1*Math.sin(t/7200+i); }
// В прошлом база была меньше: построек становилось больше ступеньками (для сравнения периодов).
var growthNow=null;
function growth(t,kind){
  var age=Math.max(0,((growthNow!=null?growthNow:S.play)-t)/DAY), st=Math.floor(age/9)*9;
  return 1-(kind==='gen'?0.42:0.5)*Math.min(1,st/180);
}
function genNow(def,t){
  var n=cnt(def.id); if(!n) return 0;
  if(def.type==='solar') return n*def.kw*sunFactor(t)*cloud(t);
  return n*def.kw*tppUtil(0,t);
}
function consInst(def){ return cnt(def.id)*def.kw; }
function consWant(def,i,t){ return consInst(def)*duty(i,t); }

function ehAdd(tier,def,at,s){
  var t=Math.floor(at/def.sec), o=tier.open;
  if(o&&o[0]!==t){ tier.rows.push(o.slice()); if(tier.rows.length>def.keep) tier.rows.splice(0,tier.rows.length-def.keep); o=null; }
  if(!o) o=tier.open=[t,0,0,0,0,0,0,0,0,0,0];
  o[1]+=s.gen; o[2]+=s.demand; o[3]+=s.supply; o[4]+=s.curtail; o[5]=s.stored; o[6]=s.cap; o[7]+=s.deficit;
  if(s.pGen>o[8]) o[8]=s.pGen; if(s.pDem>o[9]) o[9]=s.pDem; o[10]+=s.dt;
}
function step(dt,record){
  var t=S.play, gg=record==='pre'?growth(t,'gen'):1, gd=record==='pre'?growth(t,'dem'):1;
  var gen=0, dem=0;
  GEN_DEFS.forEach(function(d){ gen+=genNow(d,t)*gg; });
  CONS_DEFS.forEach(function(d,i){ dem+=consWant(d,i,t)*gd; });
  var cap=capacity(), s=S.stored, net=gen-dem, curtail=0, frac=1, h=dt/3600;
  if(net>=0){ var room=(cap-s)/h, ch=Math.min(net,room); s+=ch*h; curtail=net-ch; }
  else{ var need=-net, avail=s/h; if(avail>=need) s-=need*h; else { frac=dem>0?(gen+avail)/dem:1; s=0; } }
  S.stored=Math.min(cap,Math.max(0,s)); S.frac=frac;
  var supply=dem*frac, rec={dt:dt,gen:gen*h,demand:dem*h,supply:supply*h,curtail:curtail*h,stored:S.stored,cap:cap,deficit:frac<0.999?dt:0,pGen:gen,pDem:dem};
  S.play+=dt;
  if(record){ var at=S.play-1e-6; EH_TIERS.forEach(function(td){ ehAdd(S.hist[td.id],td,at,rec); }); if(record==='live') ehAdd(S.live,EH_LIVE,at,rec); }
}
function reset(){
  S.hist={}; EH_TIERS.forEach(function(t){ S.hist[t.id]={open:null,rows:[]}; });
  S.live={open:null,rows:[]};
  var real=200*DAY+10*3600+30*60; // «сейчас» = 10:30: утро, аккумуляторы заряжаются
  S.play=real-180*DAY; S.stored=capacity()*0.4; growthNow=real;
  while(S.play<real-2*DAY) step(600,'pre');
  while(S.play<real) step(60,'pre');
  S.play=real; growthNow=null;
}
function advance(gameSec){
  while(gameSec>1e-9){ var d=Math.min(gameSec,S.speed<=1?1:Math.min(60,Math.max(1,S.speed/4))); step(d,'live'); gameSec-=d; }
}

/* ---------------- сводка «сейчас» ---------------- */
function gens(){
  var t=S.play;
  return GEN_DEFS.filter(function(d){ return cnt(d.id)>0; }).map(function(d){
    var n=cnt(d.id), np=n*d.kw, now=genNow(d,t);
    var daily=0; if(d.type==='solar') for(var h=0;h<24;h++) daily+=np*sunFactor(h*3600+1800);
    return {id:d.id, type:d.type, isSolar:d.type==='solar', title:d.title, color:d.color, count:n, nameplate:np, now:now, pct:np>0?Math.min(100,now/np*100):0, daily:daily};
  });
}
function groups(){
  var t=S.play, known=GROUPS.map(function(g){ return g.id; });
  return GROUPS.map(function(g){
    var list=[];
    CONS_DEFS.forEach(function(d,i){
      if(!cnt(d.id)) return; var gid=known.indexOf(d.type)>=0?d.type:'other'; if(gid!==g.id) return;
      var inst=consInst(d), now=consWant(d,i,t)*S.frac;
      list.push({id:d.id,name:d.name,label:d.label,color:d.color,count:cnt(d.id),inst:inst,now:now,load:inst>0?now/inst*100:0});
    });
    var sum=0,inst=0,units=0; list.forEach(function(r){ sum+=r.now; inst+=r.inst; units+=r.count; });
    return {id:g.id,name:g.name,color:g.color,what:g.what,list:list,sum:sum,inst:inst,units:units,kinds:list.length,load:inst>0?sum/inst*100:0};
  }).filter(function(g){ return g.list.length; });
}
function now(){
  var t=S.play, G=gens(), Gr=groups();
  var gen=0; G.forEach(function(g){ gen+=g.now; });
  var installed=0, supply=0; Gr.forEach(function(g){ installed+=g.inst; supply+=g.sum; });
  var frac=Math.max(0,Math.min(1,S.frac));
  var demand=frac>=0.999?supply:frac>0.001?supply/frac:installed;
  var stored=S.stored, cap=capacity(), full=cap>0&&stored>=cap-1e-6, net=gen-supply;
  var curtail=full&&net>0?net:0, flow=net-curtail;
  var nameplate=0; G.forEach(function(g){ nameplate+=g.nameplate; });
  var stateId=frac>=0.999?'ok':frac<0.02?'black':'sag';
  return {t:t, clock:clockStr(t), sun:sunFactor(t), day:sunFactor(t)>0.001, gens:G, groups:Gr, gen:gen, supply:supply, demand:demand, installed:installed,
    frac:frac, stored:stored, cap:cap, pct:cap>0?Math.min(100,stored/cap*100):0, curtail:curtail, flow:flow, nameplate:nameplate, batteries:cnt('battery'),
    state:stateId, stateLabel:{ok:'Норма',sag:'Просадка',black:'Блэкаут'}[stateId],
    autonomy:supply>0.01?dur(stored/supply*3600):'∞',
    flowTxt:Math.abs(flow)<0.01?'Без изменений':flow>0?'Заряд +'+kw(flow)+' · полон через '+dur((cap-stored)/flow*3600):'Разряд −'+kw(-flow)+' · пуст через '+dur(stored/-flow*3600),
    flowSigned:Math.abs(flow)<0.01?'0':(flow>0?'+':'−')+kw(Math.abs(flow))};
}
var PLANNED=[
  {id:'admin', title:'Административный центр',kind:'солнечная',note:'ещё не подключён к шине',color:'#FFDD57'},
  {id:'genset',title:'Генератор',             kind:'резервный',note:'ещё не построен',        color:'#F2A93B'},
];

/* ---------------- «Профиль суток» и «Выработка по часам» ---------------- */
function sunProfile(){
  var g=new Array(24).fill(0);
  gens().forEach(function(b){ for(var h=0;h<24;h++) g[h]+=b.isSolar?b.nameplate*sunFactor(h*3600+1800):b.now; });
  return {gen:g, demandKw:now().supply};
}
function dialPoint(cx,cy,r,deg){ var a=(deg-90)*Math.PI/180; return [cx+r*Math.cos(a),cy+r*Math.sin(a)]; }
function dialSector(cx,cy,r0,r1,d0,d1){
  var a=dialPoint(cx,cy,r1,d0), b=dialPoint(cx,cy,r1,d1), c=dialPoint(cx,cy,r0,d1), d=dialPoint(cx,cy,r0,d0), big=(d1-d0)>180?1:0;
  return 'M'+a[0].toFixed(1)+' '+a[1].toFixed(1)+' A'+r1+' '+r1+' 0 '+big+' 1 '+b[0].toFixed(1)+' '+b[1].toFixed(1)+' L'+c[0].toFixed(1)+' '+c[1].toFixed(1)+' A'+r0+' '+r0+' 0 '+big+' 0 '+d[0].toFixed(1)+' '+d[1].toFixed(1)+' Z';
}
function sunDialSvg(){
  var CX=150,CY=150,R0=96,RMAX=30, prof=sunProfile(), c=now(), top=1;
  prof.gen.forEach(function(v){ if(v>top) top=v; }); if(prof.demandKw>top) top=prof.demandKw;
  var k=RMAX/top, bg='',wedges='',hits='',ticks='';
  for(var h=0;h<24;h++){
    var d0=h*15+0.4, d1=(h+1)*15-0.4, sf=sunFactor(h*3600+1800);
    bg+='<path d="'+dialSector(CX,CY,166,172,d0,d1)+'" fill="rgba(255,221,87,'+(0.08+0.72*sf).toFixed(2)+'"/>';
    var lg=prof.gen[h]*k; if(lg>0.5) wedges+='<path d="'+dialSector(CX,CY,R0+1,R0+1+lg,d0,d1)+'" fill="var(--dial-gen,#FFDD57)" opacity=".9"/>';
    hits+='<path class="dial-hit" d="'+dialSector(CX,CY,40,164,h*15,(h+1)*15)+'"><title>'+(h<10?'0':'')+h+':00 · выработка ≈'+kw(prof.gen[h])+'</title></path>';
    if(h%6===0){ var tp=dialPoint(CX,CY,182,h*15); ticks+='<text x="'+tp[0].toFixed(1)+'" y="'+(tp[1]+4).toFixed(1)+'" text-anchor="middle" font-size="11" fill="var(--dial-text,#9CA6C4)">'+(h<10?'0':'')+h+':00</text>'; }
  }
  var demR=R0+1+Math.min(RMAX+4,prof.demandKw*k), rr=44, circ=2*Math.PI*rr;
  var cd=clockSec(S.play)/DAY*360, p1=dialPoint(CX,CY,66,cd), p2=dialPoint(CX,CY,160,cd);
  return '<svg viewBox="-54 -44 408 390" role="img" aria-label="Прогноз выработки по часам суток">'+
    '<circle cx="150" cy="150" r="176" fill="var(--dial-bg,#0A0F20)" stroke="var(--dial-line,#293150)"/>'+
    '<circle cx="150" cy="150" r="'+R0+'" fill="none" stroke="var(--dial-line,#293150)" stroke-dasharray="3 5"/>'+bg+wedges+
    '<circle cx="150" cy="150" r="'+demR.toFixed(1)+'" fill="none" stroke="var(--dial-dem,#5AA9FF)" stroke-width="1.4" stroke-dasharray="4 4"/>'+ticks+hits+
    '<circle cx="150" cy="150" r="60" fill="var(--dial-bg,#0A0F20)" stroke="var(--dial-line,#293150)"/>'+
    '<circle cx="150" cy="150" r="'+rr+'" fill="none" stroke="var(--dial-line,#293150)" stroke-width="9"/>'+
    '<circle cx="150" cy="150" r="'+rr+'" fill="none" stroke="'+(c.pct<15?'#F4557B':'var(--dial-bat,#4FD1E7)')+'" stroke-width="9" stroke-linecap="round" transform="rotate(-90 150 150)" stroke-dasharray="'+(circ*c.pct/100).toFixed(1)+' '+circ.toFixed(1)+'"/>'+
    '<text x="150" y="149" text-anchor="middle" font-size="20" font-weight="500" fill="var(--dial-fg,#E9ECF7)" font-family="var(--font-mono)">'+Math.round(c.pct)+'%</text>'+
    '<text x="150" y="166" text-anchor="middle" font-size="10.5" fill="var(--dial-text,#9CA6C4)">'+J(c.stored)+'</text>'+
    '<line x1="'+p1[0].toFixed(1)+'" y1="'+p1[1].toFixed(1)+'" x2="'+p2[0].toFixed(1)+'" y2="'+p2[1].toFixed(1)+'" stroke="var(--dial-fg,#fff)" stroke-width="1.5" stroke-linecap="round"/>'+
    '<circle cx="'+p2[0].toFixed(1)+'" cy="'+p2[1].toFixed(1)+'" r="4" fill="var(--dial-fg,#fff)"/></svg>';
}
function genHeatmap(g){
  var vals=[],max=0; for(var h=0;h<24;h++){ var v=g.nameplate*sunFactor(h*3600+1800); vals.push(v); if(v>max) max=v; }
  var cur=Math.floor(clockSec(S.play)/3600), cells='';
  vals.forEach(function(v,h){ cells+='<div class="hm-cell'+(h===cur?' now':'')+'" style="background:rgba(255,221,87,'+(0.1+0.8*(max>0?v/max:0)).toFixed(2)+')" title="'+(h<10?'0':'')+h+':00 · '+kw(v)+'"></div>'; });
  return '<div class="hm-grid">'+cells+'</div><div class="hm-legend"><span>00:00</span><span style="flex:1"></span><span>12:00</span><span style="flex:1"></span><span>23:00</span></div>'+
    '<div class="hm-legend"><span>Пик: '+kw(max)+' · за сутки ≈ '+kwh(vals.reduce(function(s,v){ return s+v; },0))+'</span></div>';
}
// Готовые поповеры: вариант кладёт их внутрь узла солнца / панели (позиционирует своим CSS).
var UI={sunPop:false, genPop:null, period:'d1'};
function sunPopHtml(){
  if(!UI.sunPop) return '';
  return '<div class="pop pop-sun" id="popSun"><div class="pop-head"><h4>Профиль суток</h4><button type="button" class="pop-x" data-close-sun-pop aria-label="Закрыть">×</button></div>'+
    '<p class="pop-note">Расчётная кривая по текущему парку панелей — не история. Пунктир — текущее потребление, кольцо в центре — заряд аккумуляторов.</p>'+
    '<div data-live="sunDial">'+sunDialSvg()+'</div>'+
    '<div class="pop-key"><span><i style="background:var(--dial-gen,#FFDD57)"></i>Выработка солнца</span><span><i style="background:var(--dial-dem,#5AA9FF)"></i>Текущее потребление</span></div></div>';
}
function genPopHtml(g){
  if(!(g.isSolar&&UI.genPop===g.id)) return '';
  return '<div class="pop pop-gen" id="popGen"><div class="pop-head"><h4>Выработка по часам</h4><button type="button" class="pop-x" data-close-gen-pop aria-label="Закрыть">×</button></div>'+
    '<p class="pop-note">Расчётная кривая по текущему парку панелей на сутки — не история, а прогноз «как выглядели бы сутки сейчас». Рамкой отмечен текущий час.</p>'+
    '<div data-live="genHeat">'+genHeatmap(g)+'</div></div>';
}
function infoBtn(kind,id,cls){
  var open=kind==='sun'?UI.sunPop:UI.genPop===id;
  return '<button type="button" class="i-btn '+(cls||'')+'" '+(kind==='sun'?'data-toggle-sun-pop':'data-toggle-gen-pop="'+id+'"')+' aria-expanded="'+open+'" title="'+(kind==='sun'?'Профиль суток':'Выработка по часам')+'">i</button>';
}
// Строки всплывающего окна группы потребителей («Сейчас добывается» …)
function groupRows(g){
  return g.list.map(function(r){
    return '<div class="gp-row" style="--rc:'+r.color+'"><i></i><span>'+r.name+' <small>'+r.label+'</small></span><em>×'+r.count+'</em><b data-live="rv_'+r.id+'">'+kw(r.now)+'</b>'+
      '<div class="gp-rowbar"><i data-live="rb_'+r.id+'" style="width:'+r.load.toFixed(0)+'%"></i></div></div>';
  }).join('');
}
function groupPop(g){ return '<div class="gpop" role="tooltip" id="gpop-'+g.id+'"><div class="gpop-h">'+g.what+'</div>'+groupRows(g)+'</div>'; }

/* ---------------- журнал ---------------- */
var PERIODS=[
  {id:'live',label:'Реальное время',sec:300,    tier:'live',phrase:'за последние 5 минут'},
  {id:'h1',  label:'1 час',         sec:3600,   tier:'m1',  phrase:'за последний час'},
  {id:'d1',  label:'Сутки',         sec:86400,  tier:'m10', phrase:'за последние сутки'},
  {id:'d7',  label:'Неделя',        sec:604800, tier:'h1',  phrase:'за неделю'},
  {id:'d30', label:'Месяц',         sec:2592000,tier:'h4',  phrase:'за месяц'},
  {id:'d90', label:'3 месяца',      sec:7776000,tier:'h4',  phrase:'за 3 месяца'},
];
var PMAP={}; PERIODS.forEach(function(p){ PMAP[p.id]=p; });
function bins(pid,back){
  var P=PMAP[pid], def=P.tier==='live'?EH_LIVE:EH_TIERS.filter(function(t){ return t.id===P.tier; })[0];
  var tier=P.tier==='live'?S.live:S.hist[P.tier];
  var n=Math.max(1,Math.round(P.sec/def.sec)), last=Math.floor((S.play-1e-6)/def.sec)-(back?n:0), byT={};
  tier.rows.forEach(function(r){ byT[r[0]]=r; }); if(tier.open) byT[tier.open[0]]=tier.open;
  var rows=[]; for(var t=last-n+1;t<=last;t++) rows.push(byT[t]||null);
  return {n:n, sec:def.sec, first:last-n+1, rows:rows};
}
function stats(pid,back){
  var b=bins(pid,back), s={gen:0,dem:0,sup:0,cur:0,def:0,cov:0,pg:0,pd:0,first:null,last:null,span:b.n*b.sec};
  b.rows.forEach(function(r){ if(!r||!r[10]) return; s.gen+=r[1]; s.dem+=r[2]; s.sup+=r[3]; s.cur+=r[4]; s.def+=r[7]; s.cov+=r[10];
    if(r[8]>s.pg) s.pg=r[8]; if(r[9]>s.pd) s.pd=r[9]; if(s.first==null) s.first=r[5]; s.last=r[5]; });
  return s;
}
function delta(cur,prev,has,mode){
  if(!has) return {txt:'нет прошлого периода',cls:'',title:'Сравнение появится, когда накопится история за прошлый такой же период'};
  if(prev===0&&cur===0) return {txt:'без изменений',cls:''};
  var pct=prev>0?(cur-prev)/prev*100:(cur>0?100:0);
  if(Math.abs(pct)<0.5) return {txt:'без изменений',cls:''};
  var up=pct>=0, cls=mode==='good'?(up?'good':'bad'):mode==='bad'?(up?'bad':'good'):mode==='warn'?(up?'warn':'good'):'';
  return {txt:(up?'▲ ':'▼ ')+Math.abs(pct).toFixed(Math.abs(pct)>=10?0:1)+'% к прошлому',cls:cls,up:up,title:'К прошлому такому же периоду'};
}
function pct(v,d){ return v.toFixed(d==null?0:d)+'%'; }
function journal(pid){
  var c=stats(pid,false), p=stats(pid,true), has=p.cov>=p.span*0.25;
  var unmet=Math.max(0,c.dem-c.sup), unmetP=Math.max(0,p.dem-p.sup);
  var ratio=c.dem>0?c.sup/c.dem*100:100, ratioP=p.dem>0?p.sup/p.dem*100:100;
  var meanG=c.cov>0?c.gen/c.cov*3600:0, meanD=c.cov>0?c.dem/c.cov*3600:0, np=now().nameplate, dSt=(c.last||0)-(c.first||0);
  var P=PMAP[pid], covPct=Math.min(100,c.cov/c.span*100);
  return {c:c,p:p,has:has,phrase:P.phrase,covPct:covPct,covNote:covPct<99?'История записывается с момента запуска демо: '+P.phrase+' собрано '+dur(c.cov)+' из '+dur(c.span)+' ('+pct(covPct)+').':'',
    ratio:ratio, list:[
    {id:'gen',  l:'Выработано',      color:'#FFDD57',v:kwh(c.gen),s:'средняя '+kw(meanG),d:delta(c.gen,p.gen,has,'good'),frac:np>0?Math.min(1,meanG/np):0},
    {id:'sup',  l:'Потреблено',      color:'#5AA9FF',v:kwh(c.sup),s:'из '+kwh(c.dem)+' нужных',d:delta(c.sup,p.sup,has,'neutral'),frac:c.dem>0?c.sup/c.dem:0},
    {id:'unmet',l:'Не хватило',      color:'#F4557B',v:kwh(unmet),s:'обеспеченность '+pct(ratio,1),d:delta(unmet,unmetP,has,'bad'),frac:c.dem>0?unmet/c.dem:0},
    {id:'cur',  l:'Сброшено излишка',color:'#8C93B0',v:kwh(c.cur),s:pct(c.gen>0?c.cur/c.gen*100:0)+' от выработки',d:delta(c.cur,p.cur,has,'warn'),frac:c.gen>0?c.cur/c.gen:0},
    {id:'ratio',l:'Обеспеченность',  color:'#4ADE9B',v:pct(ratio,1),s:'по энергии',d:delta(ratio,ratioP,has,'good'),frac:ratio/100},
    {id:'def',  l:'Время дефицита',  color:'#F0B93D',v:c.def>0?dur(c.def):'0 м',s:pct(c.cov>0?c.def/c.cov*100:0)+' периода',d:delta(c.def,p.def,has,'bad'),frac:c.cov>0?c.def/c.cov:0},
    {id:'pg',   l:'Пик выработки',   color:'#FFDD57',v:kw(c.pg),s:'установлено '+kw(np),d:delta(c.pg,p.pg,has,'neutral'),frac:np>0?Math.min(1,c.pg/np):0},
    {id:'pd',   l:'Пик нагрузки',    color:'#5AA9FF',v:kw(c.pd),s:'средняя '+kw(meanD),d:delta(c.pd,p.pd,has,'neutral'),frac:c.pd>0?Math.min(1,meanD/c.pd):0},
    {id:'st',   l:'Заряд за период', color:'#4FD1E7',v:(dSt>=0?'+':'−')+J(Math.abs(dSt)),s:c.first==null?'нет данных':'с '+J(c.first)+' до '+J(c.last),d:null,frac:now().cap>0?(c.last||0)/now().cap:0},
  ]};
}
function deltaHtml(d,cls){ if(!d) return '<div class="'+(cls||'j-d')+'"></div>'; return '<div class="'+(cls||'j-d')+' '+d.cls+'"'+(d.title?' title="'+d.title+'"':'')+'>'+d.txt+'</div>'; }
function periodTabs(attr,active,withLive){
  return PERIODS.filter(function(p){ return withLive||p.id!=='live'; }).map(function(p){
    return '<button type="button" class="p-tab'+(p.id===active?' active':'')+'" '+attr+'="'+p.id+'" aria-pressed="'+(p.id===active)+'">'+p.label+'</button>'; }).join('');
}

/* ---------------- окно графика карточки ---------------- */
function avgKw(r,i){ return r[10]>0?r[i]/r[10]*3600:null; }
var CHARTS={
  gen:  {title:'Выработка',       unit:'power',series:[{label:'Выработка',color:'#FFDD57',fill:true,f:function(r){return avgKw(r,1);}},{label:'Сброс излишка',color:'#8C93B0',f:function(r){return avgKw(r,4);}}]},
  sup:  {title:'Потребление',     unit:'power',series:[{label:'Получено',color:'#5AA9FF',fill:true,f:function(r){return avgKw(r,3);}},{label:'Потребность',color:'#B9C2E0',dash:[4,3],f:function(r){return avgKw(r,2);}}]},
  unmet:{title:'Нехватка энергии',unit:'power',series:[{label:'Не хватило',color:'#F4557B',fill:true,f:function(r){return r[10]>0?Math.max(0,r[2]-r[3])/r[10]*3600:null;}},{label:'Потребность',color:'#B9C2E0',dash:[4,3],f:function(r){return avgKw(r,2);}}]},
  cur:  {title:'Сброс излишка',   unit:'power',series:[{label:'Сброшено',color:'#8C93B0',fill:true,f:function(r){return avgKw(r,4);}},{label:'Выработка',color:'#FFDD57',f:function(r){return avgKw(r,1);}}]},
  ratio:{title:'Обеспеченность',  unit:'pct',  series:[{label:'Обеспеченность',color:'#4ADE9B',fill:true,f:function(r){return r[10]>0?(r[2]>0?r[3]/r[2]*100:100):null;}}]},
  def:  {title:'Время дефицита',  unit:'pct',bars:true,series:[{label:'Доля времени с дефицитом',color:'#F0B93D',f:function(r){return r[10]>0?r[7]/r[10]*100:null;}}]},
  pg:   {title:'Пик выработки',   unit:'power',series:[{label:'Пик',color:'#FFDD57',f:function(r){return r[10]>0?r[8]:null;}},{label:'Средняя',color:'#FFDD57',fill:true,dash:[4,3],f:function(r){return avgKw(r,1);}}]},
  pd:   {title:'Пик нагрузки',    unit:'power',series:[{label:'Пик',color:'#5AA9FF',f:function(r){return r[10]>0?r[9]:null;}},{label:'Средняя',color:'#5AA9FF',fill:true,dash:[4,3],f:function(r){return avgKw(r,2);}}]},
  st:   {title:'Заряд аккумуляторов',unit:'joule',series:[{label:'Заряд',color:'#4FD1E7',fill:true,f:function(r){return r[10]>0?r[5]:null;}},{label:'Ёмкость',color:'#4FD1E7',dash:[5,4],f:function(r){return r[10]>0?r[6]:null;}}]},
};
function hexA(hex,a){ var n=parseInt(hex.slice(1),16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; }
function chartFmt(u,v){ return u==='power'?kw(v):u==='joule'?J(v):v.toFixed(1)+'%'; }
function chartAxis(unit,max){
  if(unit==='pct') return {div:1,name:'%',max:100,step:25};
  var sc=unit==='power'?POWER_SCALE:JOULE_SCALE, mul=unit==='joule'?J_PER_KWH:1;
  var i=Math.max(unit==='joule'?2:1,pickUnitScale(sc,max*mul)), div=sc[i][0]/mul, m=Math.max(max/div,1e-9);
  var e=Math.pow(10,Math.floor(Math.log10(m))), st=e, ks=[0.1,0.2,0.25,0.5,1,2,2.5,5,10];
  for(var k=0;k<ks.length;k++){ st=ks[k]*e; if(m/st<=5) break; }
  return {div:div,name:sc[i][1],max:Math.ceil(m/st-1e-9)*st*div,step:st*div};
}
var CH=null;
function cssv(el,n,def){ var v=getComputedStyle(el).getPropertyValue(n).trim(); return v||def; }
function chartModal(){
  var el=document.getElementById('invChart'); if(el) return el;
  el=document.createElement('div'); el.id='invChart'; el.className='j-modal'; el.hidden=true;
  el.innerHTML='<div class="j-mbox" role="dialog" aria-modal="true" aria-labelledby="invChartT"><div class="j-mh"><h3 id="invChartT"></h3><button type="button" class="pop-x" data-chart-close aria-label="Закрыть">×</button></div>'+
    '<div class="p-tabs j-mtabs"></div><div class="j-mleg"></div><div class="j-chart"><canvas></canvas><div class="ch-tip" hidden></div></div><div class="j-msum"></div></div>';
  document.body.appendChild(el);
  el.addEventListener('click',function(e){
    if(e.target===el||e.target.closest('[data-chart-close]')){ closeChart(); return; }
    var pb=e.target.closest('[data-chart-period]'); if(pb){ CH.period=pb.dataset.chartPeriod; CH.hov=-1; drawChart(); }
  });
  var cv=el.querySelector('canvas');
  var mv=function(e){ if(!CH||!CH.geom) return; var g=CH.geom, r=cv.getBoundingClientRect(), x=e.clientX-r.left-g.l, i=g.bars?Math.floor(x/g.slot):Math.round(x/g.slot); CH.hov=(i>=0&&i<g.n)?i:-1; drawChart(); };
  cv.addEventListener('pointermove',mv); cv.addEventListener('pointerdown',mv);
  cv.addEventListener('pointerleave',function(){ if(CH){ CH.hov=-1; drawChart(); } });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&CH) closeChart(); });
  window.addEventListener('resize',function(){ if(CH) drawChart(); });
  return el;
}
function openChart(k){ CH={kpi:k,period:UI.period,hov:-1}; chartModal().hidden=false; drawChart(); }
function closeChart(){ CH=null; var el=document.getElementById('invChart'); if(el) el.hidden=true; }
function drawChart(){
  if(!CH) return;
  var el=chartModal(), cfg=CHARTS[CH.kpi], P=PMAP[CH.period], kv=journal(CH.period).list.filter(function(k){ return k.id===CH.kpi; })[0];
  el.querySelector('#invChartT').textContent=cfg.title;
  var th=PERIODS.map(function(p){ return '<button type="button" class="p-tab'+(p.id===CH.period?' active':'')+'" data-chart-period="'+p.id+'">'+p.label+'</button>'; }).join('');
  var te=el.querySelector('.j-mtabs'); if(te.innerHTML!==th) te.innerHTML=th;
  el.querySelector('.j-mleg').innerHTML=cfg.series.map(function(s){ return '<span><i style="background:'+s.color+'"></i>'+s.label+'</span>'; }).join('');
  el.querySelector('.j-msum').innerHTML='<span>'+kv.l+' '+P.phrase+':</span> <b>'+kv.v+'</b> <span class="dim">· '+kv.s+'</span>';
  var b=bins(CH.period,false), n=b.n, data=cfg.series.map(function(s){ return b.rows.map(function(r){ return r?s.f(r):null; }); });
  var cv=el.querySelector('canvas'), box=cv.parentElement, W=box.clientWidth, H=280; if(!W) return;
  var dpr=window.devicePixelRatio||1; cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); cv.style.width=W+'px'; cv.style.height=H+'px';
  var ctx=cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
  var gridC=cssv(el,'--ch-grid','rgba(255,255,255,.07)'), txtC=cssv(el,'--ch-text','#606A8A'), labC=cssv(el,'--ch-label','#9CA6C4'), nightC=cssv(el,'--ch-night','rgba(4,7,20,.55)'), font=cssv(el,'--ch-font','"IBM Plex Mono",monospace');
  var pad={l:56,r:12,t:20,b:24}, pw=W-pad.l-pad.r, ph=H-pad.t-pad.b, ymax=0;
  data.forEach(function(a){ a.forEach(function(v){ if(v!=null&&v>ymax) ymax=v; }); }); if(ymax<=0) ymax=cfg.unit==='pct'?100:1;
  var ax=chartAxis(cfg.unit,ymax), top=ax.max, bars=!!cfg.bars, slot=bars?pw/n:pw/Math.max(1,n-1);
  var X=function(i){ return bars?pad.l+slot*(i+0.5):pad.l+slot*i; }, Y=function(v){ return pad.t+ph-(v/top)*ph; };
  CH.geom={l:pad.l,slot:slot,n:n,bars:bars};
  var binT=function(i){ return (b.first+i)*b.sec; };
  if(b.n*b.sec<=604800){ ctx.fillStyle=nightC; var rs=-1;
    for(var i=0;i<=n;i++){ var night=i<n&&sunFactor(binT(i)+b.sec/2)<=0.0001; if(night&&rs<0) rs=i;
      if(!night&&rs>=0){ var xa=Math.max(pad.l,X(rs)-slot/2), xb=Math.min(W-pad.r,X(i-1)+slot/2); ctx.fillRect(xa,pad.t,xb-xa,ph); rs=-1; } } }
  ctx.font='11px '+font; ctx.textAlign='right'; ctx.textBaseline='middle';
  for(var v=0;v<=top+1e-9;v+=ax.step){ var y=Math.round(Y(v))+.5; ctx.strokeStyle=gridC; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y); ctx.stroke(); ctx.fillStyle=txtC; ctx.fillText(String(+(v/ax.div).toFixed(2)),pad.l-7,y); }
  ctx.textAlign='left'; ctx.textBaseline='top'; ctx.fillStyle=labC; ctx.fillText(ax.name,4,2); ctx.textBaseline='alphabetic'; ctx.fillStyle=txtC;
  for(var k=0;k<=4;k++){ var bk=P.sec*(1-k/4), lab=k===4?'сейчас':P.sec<=3600?'−'+Math.round(bk/60)+' м':P.sec<=86400?'−'+Math.round(bk/3600)+' ч':'−'+Math.round(bk/86400)+' д';
    ctx.textAlign=k===0?'left':k===4?'right':'center'; ctx.fillText(lab,pad.l+pw*k/4,H-6); }
  cfg.series.forEach(function(s,si){
    var a=data[si];
    if(bars){ ctx.fillStyle=s.color; a.forEach(function(v,i){ if(v==null||v<=0) return; var bw=Math.max(1,slot-(slot>4?1.2:0)); ctx.fillRect(X(i)-bw/2,Y(v),bw,Y(0)-Y(v)); }); return; }
    var seg=[]; var flush=function(){
      if(!seg.length) return;
      if(s.fill){ ctx.beginPath(); seg.forEach(function(p,k){ k?ctx.lineTo(X(p[0]),Y(p[1])):ctx.moveTo(X(p[0]),Y(p[1])); }); ctx.lineTo(X(seg[seg.length-1][0]),Y(0)); ctx.lineTo(X(seg[0][0]),Y(0)); ctx.closePath(); ctx.fillStyle=hexA(s.color,0.16); ctx.fill(); }
      ctx.beginPath(); seg.forEach(function(p,k){ k?ctx.lineTo(X(p[0]),Y(p[1])):ctx.moveTo(X(p[0]),Y(p[1])); });
      ctx.strokeStyle=s.color; ctx.lineWidth=1.7; ctx.lineJoin='round'; ctx.setLineDash(s.dash||[]); ctx.stroke(); ctx.setLineDash([]); seg=[]; };
    a.forEach(function(v,i){ if(v==null) flush(); else seg.push([i,v]); }); flush();
  });
  var tip=el.querySelector('.ch-tip'), hov=CH.hov;
  if(hov>=0&&hov<n){
    var hx=Math.round(X(hov))+.5; ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(hx,pad.t); ctx.lineTo(hx,pad.t+ph); ctx.stroke();
    var t0=binT(hov), age=(n-hov)*b.sec, row=b.rows[hov];
    tip.innerHTML='<div class="ch-tip-t">'+clockStr(t0)+'–'+clockStr(t0+b.sec)+' · '+(age<90?Math.round(age)+' с назад':dur(age)+' назад')+'</div>'+
      (row?cfg.series.map(function(s,si){ return '<div class="ch-tip-row"><i style="background:'+s.color+'"></i><span>'+s.label+'</span><b>'+(data[si][hov]==null?'—':chartFmt(cfg.unit,data[si][hov]))+'</b></div>'; }).join(''):'<div class="ch-tip-row"><span>Нет данных — история тогда ещё не писалась</span></div>');
    tip.hidden=false; var tw=tip.offsetWidth, x=X(hov)+14; if(x+tw>W-4) x=X(hov)-tw-14; if(x<4) x=4; tip.style.left=x+'px'; tip.style.top='8px';
  }else tip.hidden=true;
}

// Ряд значений первой серии графика карточки за период — для спарклайнов в журнале.
function series(kpi,pid){ var b=bins(pid,false), f=CHARTS[kpi].series[0].f; return b.rows.map(function(r){ return r?f(r):null; }); }

/* ---------------- таблица ---------------- */
function tableRows(c){
  var h='<thead><tr><th>Источник / потребитель</th><th>Кол-во</th><th>Установлено</th><th>Сейчас</th><th>Загрузка</th><th>Доля потребления</th></tr></thead><tbody>';
  if(c.gens.length){ h+='<tr class="grp"><td colspan="6">Источники</td></tr>';
    c.gens.forEach(function(g){ h+='<tr><td><i class="d-dot" style="background:'+g.color+'"></i>'+g.title+'</td><td>'+g.count+'</td><td>'+kw(g.nameplate)+'</td><td>'+kw(g.now)+'</td><td>'+Math.round(g.pct)+'%</td><td class="dim">—</td></tr>'; }); }
  var tot=c.supply, all=0;
  c.groups.forEach(function(g){ h+='<tr class="grp"><td colspan="6">'+g.name+'</td></tr>';
    g.list.forEach(function(r){ var sh=tot>0?r.now/tot*100:0; all+=r.count;
      h+='<tr><td><i class="d-dot" style="background:'+r.color+'"></i>'+(r.label===r.name?r.name:r.label)+'</td><td>'+r.count+'</td><td>'+kw(r.inst)+'</td><td>'+kw(r.now)+'</td><td>'+Math.round(r.load)+'%</td><td>'+sh.toFixed(1)+'%<span class="d-mini"><i style="width:'+Math.min(100,sh*2.2)+'%;background:'+r.color+'"></i></span></td></tr>'; }); });
  return h+'<tr class="tot"><td>Итого потребители</td><td>'+all+'</td><td class="dim">—</td><td>'+kw(tot)+'</td><td class="dim">—</td><td>100%</td></tr></tbody>';
}

/* ---------------- живые потоки ---------------- */
var NS='http://www.w3.org/2000/svg';
function FlowLayer(svg,host,opts){ this.svg=svg; this.host=host; this.opts=opts||{}; this.items=[]; svg.innerHTML=''; }
FlowLayer.prototype.add=function(from,to,color,fn,o){
  o=o||{}; var base=document.createElementNS(NS,'path'), dash=document.createElementNS(NS,'path');
  base.setAttribute('class','fl-base '+(o.cls||'')); dash.setAttribute('class','fl-dash '+(o.cls||''));
  base.setAttribute('stroke',color); dash.setAttribute('stroke',color);
  this.svg.appendChild(base); this.svg.appendChild(dash);
  this.items.push({from:from,to:to,base:base,dash:dash,fn:fn,o:o,lastDur:0});
};
function side(r,s,h){
  if(s==='r') return [r.right-h.left,r.top+r.height/2-h.top];
  if(s==='l') return [r.left-h.left,r.top+r.height/2-h.top];
  if(s==='t') return [r.left+r.width/2-h.left,r.top-h.top];
  if(s==='b') return [r.left+r.width/2-h.left,r.bottom-h.top];
  return [r.left+r.width/2-h.left,r.top+r.height/2-h.top];
}
FlowLayer.prototype.layout=function(){
  var host=this.host.getBoundingClientRect(); if(!host.width) return;
  this.svg.setAttribute('viewBox','0 0 '+host.width+' '+host.height);
  var route=this.opts.route||'curve', stacked=this.opts.stackAt&&window.innerWidth<=this.opts.stackAt, self=this;
  this.items.forEach(function(f){
    var A=document.getElementById(f.from), Bn=document.getElementById(f.to); if(!A||!Bn){ f.base.setAttribute('d',''); f.dash.setAttribute('d',''); return; }
    var a=A.getBoundingClientRect(), b=Bn.getBoundingClientRect(), d;
    if(!a.width||!b.width||(stacked&&f.o.hideStacked)){ f.base.setAttribute('d',''); f.dash.setAttribute('d',''); return; }
    var custom=f.o.route||route;
    if(typeof custom==='function'){ d=custom(a,b,host,f); }
    else if(stacked||(a.left<b.right&&b.left<a.right&&!f.o.forceH)){
      var cx=(Math.max(a.left,b.left)+Math.min(a.right,b.right))/2-host.left, y1=(a.top<b.top?a.bottom:a.top)-host.top, y2=(a.top<b.top?b.top:b.bottom)-host.top;
      if(f.o.fromXY){ var p=f.o.fromXY(a,b,host); cx=p[0]; }
      d='M'+cx+' '+y1+' L'+cx+' '+y2;
    }else{
      var ltr=a.right<=b.left, xa=(ltr?a.right:a.left)-host.left, xb=(ltr?b.left:b.right)-host.left;
      var ya=(a.top+a.height/2)-host.top, yb=(b.top+b.height/2)-host.top;
      if(f.o.spreadTo) yb=Math.min(b.bottom-host.top-14,Math.max(b.top-host.top+14,ya));
      else if(f.o.spreadFrom) ya=Math.min(a.bottom-host.top-14,Math.max(a.top-host.top+14,yb));
      else if(b.height>a.height) yb=Math.min(b.bottom-host.top-14,Math.max(b.top-host.top+14,ya)); else ya=Math.min(a.bottom-host.top-14,Math.max(a.top-host.top+14,yb));
      if(f.o.toCircle){ var cc=side(b,'c',host), R=Math.min(b.width,b.height)/2*(f.o.toCircle), ang=Math.atan2(ya-cc[1],xa-cc[0]); xb=cc[0]+R*Math.cos(ang); yb=cc[1]+R*Math.sin(ang); }
      if(f.o.fromCircle){ var cf=side(a,'c',host), Rf=Math.min(a.width,a.height)/2*(f.o.fromCircle), an=Math.atan2(yb-cf[1],xb-cf[0]); xa=cf[0]+Rf*Math.cos(an); ya=cf[1]+Rf*Math.sin(an); }
      if(route==='ortho'){
        var mx=f.o.midX!=null?f.o.midX(xa,xb,host):(xa+xb)/2, r=Math.min(12,Math.abs(yb-ya)/2), dx=xb>xa?1:-1, dy=yb>ya?1:-1;
        d=Math.abs(yb-ya)<1?'M'+xa+' '+ya+' L'+xb+' '+ya:
          'M'+xa+' '+ya+' L'+(mx-dx*r)+' '+ya+' L'+mx+' '+(ya+dy*r)+' L'+mx+' '+(yb-dy*r)+' L'+(mx+dx*r)+' '+yb+' L'+xb+' '+yb;
      }else if(route==='straight'){ d='M'+xa+' '+ya+' L'+xb+' '+yb; }
      else{ var m=(xa+xb)/2; d='M'+xa+' '+ya+' C'+m+' '+ya+' '+m+' '+yb+' '+xb+' '+yb; }
    }
    f.base.setAttribute('d',d); f.dash.setAttribute('d',d);
  });
};
FlowLayer.prototype.update=function(c){
  this.layout(); var st=this.opts.style;
  this.items.forEach(function(f){
    var r=f.fn(c), i=Math.max(0,Math.min(1,r.i||0)), on=i>0.01, w=2+7*Math.sqrt(i), du=Math.max(.35,1.7-1.35*i);
    if(st){ st(f,i,on,w,du,r); }
    else{
      f.base.setAttribute('stroke-width',w+4); f.base.style.opacity=on?'.2':'.07';
      f.dash.setAttribute('stroke-width',Math.max(2.5,w*0.8)); f.dash.style.opacity=on?'1':'0';
      f.dash.style.strokeDasharray='0.5 12.5';
    }
    if(Math.abs(du-f.lastDur)>0.06){ f.dash.style.animationDuration=du.toFixed(2)+'s'; f.lastDur=du; }
    f.dash.classList.toggle('rev',!!r.rev); f.base.classList.toggle('on',on); f.dash.classList.toggle('on',on);
  });
};
// Стандартный набор потоков (как в игре): солнце→панели, источники→шина, шина↔аккумуляторы, аккумуляторы→сброс, шина→группы.
function stdFlows(L,ids,c,o){
  o=o||{};
  c.gens.forEach(function(g){
    if(g.isSolar) L.add(ids.sun,ids.gen(g.id),g.color,function(c){ return {i:c.sun}; },o.sunGen);
    L.add(ids.gen(g.id),ids.busIn||ids.bus,g.color,function(c){ var x=c.gens.filter(function(q){ return q.id===g.id; })[0]; return {i:x&&x.nameplate>0?x.now/x.nameplate:0}; },o.genBus);
  });
  if(ids.admin) L.add(ids.admin,ids.busIn||ids.bus,'#FFDD57',function(){ return {i:0}; },o.plan);
  if(ids.genset) L.add(ids.genset,ids.busIn||ids.bus,'#F2A93B',function(){ return {i:0}; },o.plan);
  L.add(ids.busOut||ids.bus,ids.bat,'#4FD1E7',function(c){ var ref=Math.max(c.nameplate,c.demand,1); return {i:Math.min(1,Math.abs(c.flow)/ref*1.6),rev:c.flow<0}; },o.busBat);
  L.add(ids.bat,ids.curt,'#8C93B0',function(c){ return {i:c.nameplate>0?Math.min(1,c.curtail/c.nameplate*1.6):0}; },o.batCurt);
  c.groups.forEach(function(g){ L.add(ids.busOut||ids.bus,ids.grp(g.id),g.color,function(c){ var x=c.groups.filter(function(q){ return q.id===g.id; })[0]; return {i:x&&x.inst>0?x.sum/x.inst:0}; },o.busGrp); });
}

/* ---------------- обновление DOM без пересборки ---------------- */
function patch(rootEl,html){
  var t=document.createElement('div'); t.innerHTML=html;
  t.querySelectorAll('[data-live-class]').forEach(function(n){ var o=rootEl.querySelector('[data-live-class="'+n.dataset.liveClass+'"]'); if(o&&o.getAttribute('class')!==n.getAttribute('class')) o.setAttribute('class',n.getAttribute('class')); });
  t.querySelectorAll('[data-live]').forEach(function(n){
    var o=rootEl.querySelector('[data-live="'+n.dataset.live+'"]'); if(!o||o.outerHTML===n.outerHTML) return;
    Array.prototype.slice.call(o.attributes).forEach(function(a){ if(!n.hasAttribute(a.name)) o.removeAttribute(a.name); });
    Array.prototype.slice.call(n.attributes).forEach(function(a){ if(o.getAttribute(a.name)!==a.value) o.setAttribute(a.name,a.value); });
    if(o.innerHTML!==n.innerHTML) o.innerHTML=n.innerHTML;
  });
}

/* ---------------- демо-панель управления ---------------- */
var SPEEDS=[[1,'×1'],[60,'×60'],[600,'×600'],[3600,'×3600']];
function ctlHtml(){
  return '<div class="inv-ctl" role="group" aria-label="Демо-управление">'+
    '<div class="inv-ctl-g"><span class="inv-ctl-l">База</span>'+Object.keys(SCENARIOS).map(function(k){ return '<button type="button" class="inv-btn'+(S.scenario===k?' active':'')+'" data-scn="'+k+'" title="'+SCENARIOS[k].hint+'">'+SCENARIOS[k].label+'</button>'; }).join('')+'</div>'+
    '<div class="inv-ctl-g"><span class="inv-ctl-l">Скорость</span>'+SPEEDS.map(function(s){ return '<button type="button" class="inv-btn'+(S.speed===s[0]?' active':'')+'" data-spd="'+s[0]+'">'+s[1]+'</button>'; }).join('')+'</div>'+
    '<div class="inv-ctl-g"><span class="inv-ctl-l">Часы</span>'+[0,6,12,18,21].map(function(h){ return '<button type="button" class="inv-btn" data-hour="'+h+'">'+(h<10?'0':'')+h+':00</button>'; }).join('')+'</div>'+
    '<div class="inv-ctl-g inv-ctl-clock"><span class="inv-ctl-l">Игровое время</span><b data-live="ctlClock">День '+Math.floor(S.play/DAY)+' · '+clockStr(S.play)+'</b></div></div>';
}
function setHour(h){ var t=Math.floor(S.play/DAY)*DAY+h*3600; if(t<S.play) t+=DAY; advance(t-S.play); }

/* ---------------- запуск варианта ---------------- */
var V=null, lastReal=0;
function render(force){
  var c=now(), html=V.render(c);
  var key=JSON.stringify([S.scenario,UI.sunPop,UI.genPop,UI.period,(V.key?V.key(c):'')]);
  var rootEl=V.root;
  if(force||key!==V._key||!rootEl.firstChild){ V._key=key; rootEl.innerHTML=html; if(V.build) V.build(c); }
  else patch(rootEl,html);
  var ctl=document.getElementById('invCtl'); if(ctl){ var ch=ctlHtml(); if(!ctl.firstChild) ctl.innerHTML=ch; else patch(ctl,ch); }
  if(V.tick) V.tick(c);
  if(CH) drawChart();
}
function start(v){
  V=v; reset();
  document.addEventListener('click',function(e){
    var t=e.target;
    var sc=t.closest('[data-scn]'); if(sc){ S.scenario=sc.dataset.scn; UI.genPop=null; reset(); var ctl=document.getElementById('invCtl'); if(ctl) ctl.innerHTML=''; render(true); return; }
    var sp=t.closest('[data-spd]'); if(sp){ S.speed=+sp.dataset.spd; document.querySelectorAll('[data-spd]').forEach(function(b){ b.classList.toggle('active',b===sp); }); return; }
    var hr=t.closest('[data-hour]'); if(hr){ setHour(+hr.dataset.hour); render(); return; }
    if(t.closest('[data-toggle-sun-pop]')){ e.stopPropagation(); UI.sunPop=!UI.sunPop; UI.genPop=null; render(); return; }
    if(t.closest('[data-close-sun-pop]')){ UI.sunPop=false; render(); return; }
    var gb=t.closest('[data-toggle-gen-pop]'); if(gb){ var id=gb.dataset.toggleGenPop; UI.genPop=UI.genPop===id?null:id; UI.sunPop=false; render(); return; }
    if(t.closest('[data-close-gen-pop]')){ UI.genPop=null; render(); return; }
    if(t.closest('.pop')) return;
    var pr=t.closest('[data-en-period]'); if(pr){ UI.period=pr.dataset.enPeriod; render(); return; }
    var kc=t.closest('[data-kpi-chart]'); if(kc){ openChart(kc.dataset.kpiChart); return; }
    if(UI.sunPop||UI.genPop){ UI.sunPop=false; UI.genPop=null; render(); }
  });
  window.addEventListener('resize',function(){ if(V.layout) V.layout(); });
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ if(V.layout) V.layout(); });
  render(true);
  lastReal=performance.now();
  setInterval(function(){ var t=performance.now(), dt=(t-lastReal)/1000; lastReal=t; advance(Math.min(5,dt)*S.speed); },250);
  setInterval(function(){ render(); },1000);
}

root.INV={start:start, render:render, now:now, kw:kw, J:J, kwh:kwh, dur:dur, plural:plural, split:splitVal, pct:pct,
  PLANNED:PLANNED, PERIODS:PERIODS, UI:UI, journal:journal, deltaHtml:deltaHtml, periodTabs:periodTabs, tableRows:tableRows,
  sunPopHtml:sunPopHtml, genPopHtml:genPopHtml, infoBtn:infoBtn, groupRows:groupRows, groupPop:groupPop,
  FlowLayer:FlowLayer, stdFlows:stdFlows, sunFactor:sunFactor, clockStr:clockStr, S:S, openChart:openChart, series:series};
})(window);
