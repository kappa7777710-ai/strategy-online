/* Общий «движок» демо-страниц энергосистемы: физика базы, история на 90 суток, единицы, графики.
 *
 * Модель повторяет правила игры (js/core.js): солнечная панель даёт 10 ⚡ за цикл 60 с, установки
 * тратят power ⚡ за свой цикл, аккумулятор 400 ⚡, базовый запас 150 ⚡, а если энергии не хватает,
 * ВСЕ потребители сбавляют ход в одной и той же пропорции (powerFraction). Единица «⚡» здесь
 * считается 1 кВт·ч (KWH_PER_UNIT), поэтому 10 ⚡ за 60 с = 600 кВт, а ёмкость батареи = 400 кВт·ч.
 * В самой игре истории пока нет — при интеграции нужно писать такие же минутные срезы в state.
 */
(function(root){
'use strict';

var KWH_PER_UNIT=1, J_PER_KWH=3.6e6;
var DAY_MIN=1440, CAP_DAYS=90, CAP=CAP_DAYS*DAY_MIN, BUF=CAP+10*DAY_MIN;
var SOLAR_KW=600*KWH_PER_UNIT, BATTERY_KWH=400*KWH_PER_UNIT, BASE_KWH=150*KWH_PER_UNIT;
var OFFSET_MIN=10*60+30; // «сейчас» = 10:30 игрового дня: утро, аккумуляторы заряжаются

var CONSUMERS=[
  {id:'iron',  name:'Железная руда', short:'Fe₂O₃', group:'mining', kw:72,    color:'#9FB0C8'},
  {id:'copper',name:'Медная руда',   short:'Cu₂S',  group:'mining', kw:72,    color:'#E08A4B'},
  {id:'coal',  name:'Уголь',         short:'C',     group:'mining', kw:60,    color:'#8B85A6'},
  {id:'stone', name:'Камень',        short:'CaCO₃', group:'mining', kw:56.84, color:'#C2AD82'},
  {id:'water', name:'Бурение воды',  short:'H₂O',   group:'drill',  kw:51.43, color:'#49B8F0'},
  {id:'oil',   name:'Бурение нефти', short:'CxHy',  group:'drill',  kw:72,    color:'#B08D57'},
  {id:'wheat', name:'Пшеница',       short:'Triticum',    group:'farm', kw:30,    color:'#E8D078'},
  {id:'potato',name:'Картофель',     short:'Solanum tub.',group:'farm', kw:27.69, color:'#A9865B'},
  {id:'corn',  name:'Кукуруза',      short:'Zea mays',    group:'farm', kw:31.3,  color:'#F0B93D'},
  {id:'tomato',name:'Томаты',        short:'Solanum lyc.',group:'farm', kw:36,    color:'#E1503D'}
];
var GROUPS=[
  {id:'mining',name:'Горнодобыча',color:'#C9A227'},
  {id:'drill', name:'Бурение',    color:'#49B8F0'},
  {id:'farm',  name:'Фермы',      color:'#8CAF52'}
];
var SCENARIOS={
  start:{label:'Старт',         hint:'1 панель, без аккумуляторов', solar:1,  bat:0,   seed:11, growth:1,
         cons:{iron:1,copper:1,water:1}},
  mid:  {label:'Развитая база', hint:'12 панелей, 45 аккумуляторов',solar:12, bat:45,  seed:23, growth:1.15,
         cons:{iron:6,copper:5,coal:4,stone:3,water:3,oil:3,wheat:3,potato:2,corn:2,tomato:2}},
  big:  {label:'Промышленная',  hint:'60 панелей, 200 аккумуляторов',solar:60, bat:200, seed:37, growth:1.15,
         cons:{iron:30,copper:25,coal:20,stone:15,water:15,oil:15,wheat:15,potato:10,corn:10,tomato:10}}
};
var PERIODS=[
  {id:'h1', label:'1 час',    phrase:'за последний час',   min:60,     bin:1},
  {id:'d1', label:'Сутки',    phrase:'за последние сутки', min:1440,   bin:10},
  {id:'d7', label:'Неделя',   phrase:'за неделю',          min:10080,  bin:60},
  {id:'d30',label:'Месяц',    phrase:'за месяц',           min:43200,  bin:240},
  {id:'d90',label:'3 месяца', phrase:'за 3 месяца',        min:129600, bin:720}
];
var PMAP={}; PERIODS.forEach(function(p){ PMAP[p.id]=p; });

var SKEYS=['gen','curtail','demand','supply','flow','stored','nameplate','capKWh'].concat(CONSUMERS.map(function(c){return c.id;}));
var K=SKEYS.length, KI={}; SKEYS.forEach(function(k,i){ KI[k]=i; });
// Виртуальные ряды: сумма (с весами) настоящих рядов.
var VIRT={
  g_mining:CONSUMERS.filter(function(c){return c.group==='mining';}).map(function(c){return c.id;}),
  g_drill: CONSUMERS.filter(function(c){return c.group==='drill';}).map(function(c){return c.id;}),
  g_farm:  CONSUMERS.filter(function(c){return c.group==='farm';}).map(function(c){return c.id;}),
  unmet:[['demand',1],['supply',-1]],
  balance:[['gen',1],['demand',-1]],
  used:[['gen',1],['curtail',-1]]
};

var EN={
  KWH_PER_UNIT:KWH_PER_UNIT, J_PER_KWH:J_PER_KWH, SOLAR_KW:SOLAR_KW, BATTERY_KWH:BATTERY_KWH, BASE_KWH:BASE_KWH,
  CONSUMERS:CONSUMERS, GROUPS:GROUPS, SCENARIOS:SCENARIOS, PERIODS:PERIODS, PMAP:PMAP, CAP:CAP, DAY_MIN:DAY_MIN,
  period:'d1', speed:600, scenario:'mid', cur:{}, counts:{}, paused:false
};

/* ---------- события ---------- */
var handlers={};
EN.on=function(ev,fn){ (handlers[ev]=handlers[ev]||[]).push(fn); };
function emit(ev,a){ (handlers[ev]||[]).forEach(function(f){ f(a); }); }

/* ---------- физика ---------- */
var S={}; SKEYS.forEach(function(k){ S[k]=new Float32Array(BUF); });
var st={}, SC=null, P=new Float64Array(K), dem=new Float64Array(CONSUMERS.length);

function mulberry(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function sunFactor(clockSec){
  var t=clockSec%86400;
  if(t<21600||t>72000) return 0;
  return Math.sin((t-21600)/50400*Math.PI);
}
EN.sunFactor=sunFactor;

function countsFor(dayIdx){
  var g=Math.pow(Math.min(1,Math.max(0,dayIdx/CAP_DAYS)),SC.growth||1.15), n={};
  n.solar=Math.max(1,Math.ceil(SC.solar*g));
  n.bat=SC.bat>0?Math.ceil(SC.bat*Math.min(1,g*1.08)):0;
  CONSUMERS.forEach(function(c){ var f=SC.cons[c.id]||0; n[c.id]=f?Math.ceil(f*g):0; });
  return n;
}
function rollDuty(){
  for(var i=0;i<CONSUMERS.length;i++){
    var r=st.rng();
    st.duty[i]= r<.68?1: r<.83?.85: r<.93?.6: r<.98?.3: 0; // доля установок группы, реально работающих в этот час
  }
}
function prep(){
  var a=Math.floor((st.secs+OFFSET_MIN*60)/3600);
  if(a!==st.hr){ st.hr=a; rollDuty(); }
  var d=Math.floor((st.secs+OFFSET_MIN*60)/86400);
  if(d!==st.dy){ st.dy=d; st.counts=countsFor(d); EN.counts=st.counts; }
}
function physics(dt){
  var clock=(st.secs+OFFSET_MIN*60)%86400, sun=sunFactor(clock), n=st.counts;
  var gen=n.solar*SOLAR_KW*sun, np=n.solar*SOLAR_KW, D=0, i;
  for(i=0;i<CONSUMERS.length;i++){ dem[i]=n[CONSUMERS[i].id]*CONSUMERS[i].kw*st.duty[i]; D+=dem[i]; }
  var cap=BASE_KWH+n.bat*BATTERY_KWH;
  var avail=st.stored+gen*dt/3600, need=D*dt/3600;
  var frac=need>1e-12?Math.min(1,avail/need):1;
  var left=avail-need*frac, ns=Math.min(cap,left), spill=left-ns;
  P[0]=gen; P[1]=spill*3600/dt; P[2]=D; P[3]=D*frac; P[4]=(ns-st.stored)*3600/dt; P[5]=ns; P[6]=np; P[7]=cap;
  for(i=0;i<CONSUMERS.length;i++) P[8+i]=dem[i]*frac;
  st.stored=ns; st.frac=frac; st.sun=sun; st.clock=clock;
  var c=EN.cur;
  c.sun=sun; c.gen=gen; c.nameplate=np; c.curtail=P[1]; c.demand=D; c.supply=P[3]; c.frac=frac; c.flow=P[4];
  c.stored=ns; c.cap=cap; c.pct=cap>0?ns/cap*100:0; c.clock=clock; c.secs=st.secs; c.day=Math.floor((st.secs+OFFSET_MIN*60)/86400)+1;
  c.cons=c.cons||{};
  for(i=0;i<CONSUMERS.length;i++){ c.cons[CONSUMERS[i].id]=P[8+i]; }
  c.duty=st.duty;
}
function accumulate(dt){ for(var k=0;k<K;k++) st.A[k]+=P[k]*dt; st.acc+=dt; }
function shiftBuffer(){
  var drop=BUF-CAP;
  SKEYS.forEach(function(k){ S[k].copyWithin(0,drop,BUF); });
  st.base+=drop; st.w=CAP;
}
function commit(){
  var i=st.w, k;
  for(k=0;k<K;k++){ S[SKEYS[k]][i]=st.A[k]/st.acc; st.A[k]=0; }
  st.acc=0; st.w++; st.tMin++; st.dirty=true;
  if(st.w>=BUF) shiftBuffer();
}
function advance(dtGame){
  var remain=dtGame;
  while(remain>1e-9){
    prep();
    var dt=Math.min(remain,60-st.acc,15);
    if(dt<1e-6) dt=Math.min(remain,60-st.acc);
    physics(dt); accumulate(dt);
    st.secs+=dt; remain-=dt;
    if(st.acc>=60-1e-7) commit();
  }
}

EN.load=function(name){
  SC=SCENARIOS[name]||SCENARIOS.mid; EN.scenario=SCENARIOS[name]?name:'mid';
  st={secs:0,acc:0,A:new Float64Array(K),w:0,base:0,tMin:0,hr:-1,dy:-1,rng:mulberry(SC.seed),duty:new Array(CONSUMERS.length).fill(1),
      counts:{},stored:0,dirty:false};
  prep(); st.stored=(BASE_KWH+st.counts.bat*BATTERY_KWH)*0.5;
  for(var m=0;m<CAP;m++){ prep(); physics(60); accumulate(60); st.secs+=60; commit(); }
  st.dirty=false;
  prep(); physics(1e-3); // актуальные «текущие» значения
  emit('reset'); emit('data');
};
EN.setSpeed=function(v){ EN.speed=v; emit('speed'); };
EN.setPeriod=function(id){ if(!PMAP[id]) return; EN.period=id; emit('period'); };

var lastTs=0;
EN.run=function(){
  function f(ts){
    var dtR=lastTs?Math.min(0.25,(ts-lastTs)/1000):0; lastTs=ts;
    if(EN.speed>0){ advance(dtR*EN.speed); }
    if(st.dirty){ st.dirty=false; emit('data'); }
    emit('frame',dtR);
    root.requestAnimationFrame(f);
  }
  root.requestAnimationFrame(f);
};

/* ---------- чтение истории ---------- */
function members(k){ var v=VIRT[k]; if(!v) return [[k,1]]; return v.map(function(m){ return typeof m==='string'?[m,1]:m; }); }
// Ряды по бинам за период. mode: mean | energy (кВт·ч за бин) | max | min | last
EN.series=function(keys,pid,mode,offsetMin){
  var pp=PMAP[pid], n=pp.min/pp.bin, off=offsetMin||0, start=st.w-pp.min-off, out={n:n,bin:pp.bin,t0:st.tMin-pp.min-off,keys:{}};
  mode=mode||'mean';
  keys.forEach(function(key){
    var ms=members(key).map(function(m){ return [S[m[0]],m[1]]; }), arr=new Float64Array(n);
    for(var b=0;b<n;b++){
      var s=start+b*pp.bin, acc=0, mx=-Infinity, mn=Infinity, v=0;
      for(var i=0;i<pp.bin;i++){
        v=0; for(var q=0;q<ms.length;q++) v+=ms[q][0][s+i]*ms[q][1];
        acc+=v; if(v>mx) mx=v; if(v<mn) mn=v;
      }
      arr[b]= mode==='mean'?acc/pp.bin : mode==='energy'?acc/60 : mode==='max'?mx : mode==='min'?mn : v;
    }
    out.keys[key]=arr;
  });
  return out;
};
// Итоги по ряду за период: mean/max/min (кВт или кВт·ч для stored) и sum (кВт·ч).
EN.stat=function(key,pid,offsetMin){
  var pp=PMAP[pid], ms=members(key).map(function(m){ return [S[m[0]],m[1]]; }), off=offsetMin||0, s=st.w-pp.min-off, acc=0, mx=-Infinity, mn=Infinity;
  for(var i=0;i<pp.min;i++){
    var v=0; for(var q=0;q<ms.length;q++) v+=ms[q][0][s+i]*ms[q][1];
    acc+=v; if(v>mx) mx=v; if(v<mn) mn=v;
  }
  return {mean:acc/pp.min, max:mx, min:mn, sum:acc/60, first:valueAt(key,s), last:valueAt(key,s+pp.min-1)};
};
function valueAt(key,idx){ var v=0; members(key).forEach(function(m){ v+=S[m[0]][idx]*m[1]; }); return v; }
EN.deficitMinutes=function(pid,offsetMin){
  var pp=PMAP[pid], off=offsetMin||0, s=st.w-pp.min-off, c=0, d=S.demand, u=S.supply;
  for(var i=0;i<pp.min;i++){ if(d[s+i]-u[s+i]>0.02*d[s+i]+1e-6) c++; }
  return c;
};
EN.tNow=function(){ return st.tMin; };
EN.hasPrev=function(pid){ return PMAP[pid].min*2<=CAP; };
EN.timeOf=function(absMin){
  var t=absMin+OFFSET_MIN;
  var day=Math.floor(t/DAY_MIN)+1, m=((t%DAY_MIN)+DAY_MIN)%DAY_MIN;
  return {day:day,hh:Math.floor(m/60),mm:m%60,clock:m};
};
function p2(n){ return (n<10?'0':'')+n; }
EN.clockStr=function(sec){ var m=Math.floor((sec%86400)/60); return p2(Math.floor(m/60))+':'+p2(m%60); };
EN.nowStr=function(){ var c=EN.cur; return 'День '+c.day+' · '+EN.clockStr(c.clock); };
EN.binLabel=function(t0,i,bin){
  var a=EN.timeOf(t0+i*bin), b=EN.timeOf(t0+(i+1)*bin);
  var s='День '+a.day+' · '+p2(a.hh)+':'+p2(a.mm);
  if(bin>1) s+=' – '+p2(b.hh)+':'+p2(b.mm);
  return s;
};
// Сетка «день × час» (для тепловой карты и суточного профиля). Пустые ячейки — NaN.
EN.grid=function(key,days){
  var lastAbs=st.tMin-1, lastDay=Math.floor((lastAbs+OFFSET_MIN)/DAY_MIN), rows=[], d, h;
  var startAbs=st.tMin-CAP;
  for(d=lastDay-days+1;d<=lastDay;d++){
    var cells=new Float64Array(24);
    for(h=0;h<24;h++){
      var a0=d*DAY_MIN+h*60-OFFSET_MIN, sum=0, cnt=0;
      for(var m=0;m<60;m++){
        var ab=a0+m; if(ab<startAbs||ab>lastAbs) continue;
        sum+=valueAt(key,ab-st.base); cnt++;
      }
      cells[h]=cnt?sum/cnt:NaN;
    }
    rows.push({day:d+1,cells:cells});
  }
  return rows;
};
// Последние N минут по одной точке (для «полоски» часа).
EN.strip=function(key,minutes){
  var out=new Float64Array(minutes), s=st.w-minutes;
  for(var i=0;i<minutes;i++) out[i]=valueAt(key,s+i);
  return out;
};

/* ---------- форматирование ---------- */
var PSC=[[1e-3,'Вт'],[1,'кВт'],[1e3,'МВт'],[1e6,'ГВт']];               // база: кВт
var ESC=[[1e-3,'Вт·ч'],[1,'кВт·ч'],[1e3,'МВт·ч'],[1e6,'ГВт·ч'],[1e9,'ТВт·ч']]; // база: кВт·ч
var JSC=[[1,'Дж'],[1e3,'кДж'],[1e6,'МДж'],[1e9,'ГДж'],[1e12,'ТДж']];    // база: Дж
function digitsFor(a){ return a>=100?0:a>=10?1:2; }
function pickScale(sc,v,def){
  var a=Math.abs(v), i=def;
  if(a>0){ i=0; for(var k=0;k<sc.length;k++) if(a>=sc[k][0]) i=k; }
  var num=a/sc[i][0];
  if(Number(num.toFixed(digitsFor(num)))>=1000 && i<sc.length-1) i++;
  return i;
}
function fmtBy(sc,v,def){
  if(Math.abs(v)<1e-9) v=0;
  var i=pickScale(sc,v,def), x=v/sc[i][0], d=digitsFor(Math.abs(x));
  var num=(v===0||Number(x.toFixed(d))===0?'0':x.toFixed(d));
  return {num:num,unit:sc[i][1],text:num+' '+sc[i][1],scale:sc[i][0],idx:i};
}
EN.fmt={
  power:function(kw){ return fmtBy(PSC,kw,1); },
  energy:function(kwh){ return fmtBy(ESC,kwh,1); },
  joule:function(j){ return fmtBy(JSC,j,2); },
  stored:function(kwh){ return fmtBy(JSC,kwh*J_PER_KWH,2); },
  pct:function(p,d){ return (p).toFixed(d==null?0:d)+'%'; },
  sign:function(o,plus){ return (o.num!=='0'&&plus&&parseFloat(o.num)>0?'+':'')+o.text; },
  dur:function(h){
    if(!isFinite(h)||h<0) return '—';
    var m=Math.round(h*60);
    if(m<1) return 'меньше минуты';
    if(m<60) return m+' м';
    if(m<1440) return Math.floor(m/60)+' ч'+(m%60?' '+(m%60)+' м':'');
    return Math.floor(m/1440)+' д'+(Math.floor((m%1440)/60)?' '+Math.floor((m%1440)/60)+' ч':'');
  }
};
// Шкала для осей: по максимуму подбираем единицу, дальше красивые шаги в ней.
EN.axis=function(unit,max){
  var sc= unit==='power'?PSC : unit==='energy'?ESC : unit==='joule'?JSC : null;
  if(unit==='pct') return {div:1,unit:'%',ticks:niceTicks(max,1)};
  var i=pickScale(sc,max,unit==='joule'?2:1), div=sc[i][0];
  return {div:div,unit:sc[i][1],ticks:niceTicks(max/div,div)};
};
function niceTicks(maxD,div){
  var mx=Math.max(maxD,1e-9), e=Math.pow(10,Math.floor(Math.log10(mx)))/10, c=[1,2,2.5,5,10,20,25,50,100], best=e, i;
  for(i=0;i<c.length;i++){ best=c[i]*e; if(mx/best<=5) break; }
  var cnt=Math.max(1,Math.ceil(mx/best-1e-9)), out=[];
  for(i=0;i<=cnt;i++) out.push(i*best);
  return {step:best,vals:out,max:cnt*best};
}

/* ---------- графики (canvas) ---------- */
function hexA(hex,a){
  var h=hex.replace('#',''); if(h.length===3) h=h.split('').map(function(x){return x+x;}).join('');
  var n=parseInt(h,16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')';
}
EN.hexA=hexA;
function cssv(n){ return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }

EN.chart=function(host,o){
  o=Object.assign({kind:'line',unit:'power',mode:'mean',height:220,night:true,stack:false,yMin:0,refs:[],lines:[],series:[],
                   pad:{l:54,r:12,t:18,b:24},fill:false,between:null},o);
  host.classList.add('en-chartbox'); host.style.height=o.height+'px'; host.style.position='relative';
  var cv=document.createElement('canvas'), tip=document.createElement('div');
  tip.className='en-tip'; tip.hidden=true; host.appendChild(cv); host.appendChild(tip);
  var ctx=cv.getContext('2d'), hov=-1, data=null, geom=null, api={o:o};
  var cf=o.unit==='joule'?J_PER_KWH:1;
  function period(){ return (typeof o.period==='function'?o.period():o.period)||EN.period; }
  function fmtV(v){
    return o.unit==='power'?EN.fmt.power(v).text : o.unit==='energy'?EN.fmt.energy(v).text : o.unit==='joule'?EN.fmt.joule(v).text : v.toFixed(1)+'%';
  }
  function draw(){
    var w=host.clientWidth, h=o.height; if(!w) return;
    var dpr=root.devicePixelRatio||1;
    cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr); cv.style.width=w+'px'; cv.style.height=h+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,w,h);
    var pid=period(), vis=o.series.filter(function(s){ return s.visible!==false; });
    var keys=vis.map(function(s){return s.key;}).concat(o.refs.filter(function(r){return r.key;}).map(function(r){return r.key;}))
      .concat(o.lines.map(function(l){return l.key;})).concat(o.between?[o.between.top,o.between.bottom]:[]);
    data=EN.series(Array.from(new Set(keys)),pid,o.mode);
    var n=data.n, pad=o.pad, pw=w-pad.l-pad.r, ph=h-pad.t-pad.b, k, i;
    var stackKind=(o.kind==='area'||o.kind==='bars')&&o.stack!==false;
    var ymax=0;
    for(i=0;i<n;i++){
      var tot=0;
      vis.forEach(function(s){ var v=data.keys[s.key][i]*cf; if(stackKind) tot+=v; else if(v>ymax) ymax=v; });
      if(stackKind&&tot>ymax) ymax=tot;
      o.lines.forEach(function(l){ var v=data.keys[l.key][i]*cf; if(v>ymax) ymax=v; });
      if(o.between){ var a=data.keys[o.between.top][i]*cf; if(a>ymax) ymax=a; }
    }
    o.refs.forEach(function(r){ var v=r.key?Math.max.apply(null,data.keys[r.key])*cf:(r.value*cf); if(v>ymax) ymax=v; });
    if(o.yMax!=null) ymax=o.yMax*cf;
    if(ymax<=0) ymax=o.unit==='pct'?100:1;
    var ax=EN.axis(o.unit,ymax), top=ax.ticks.max*ax.div;
    var bars=o.kind==='bars', slot=bars?pw/n:pw/(n-1);
    function X(idx){ return bars?pad.l+slot*(idx+0.5):pad.l+slot*idx; }
    function Y(v){ return pad.t+ph-(v/top)*ph; }
    geom={pw:pw,ph:ph,pad:pad,slot:slot,n:n,X:X,Y:Y,top:top,w:w,h:h,bars:bars};
    var cGrid=cssv('--en-grid')||'rgba(255,255,255,.07)', cTxt=cssv('--text-muted')||'#606A8A';
    // ночные полосы: один прямоугольник на непрерывный отрезок, без швов между бинами
    if(o.night&&(pid==='h1'||pid==='d1'||pid==='d7')){
      ctx.fillStyle=cssv('--en-night')||'rgba(4,7,20,.55)';
      var runStart=-1;
      for(i=0;i<=n;i++){
        var isNight=i<n&&sunFactor(EN.timeOf(data.t0+i*data.bin+data.bin/2).clock*60)<=0.0001;
        if(isNight&&runStart<0) runStart=i;
        if(!isNight&&runStart>=0){
          var xa=Math.max(pad.l,X(runStart)-slot/2), xb=Math.min(w-pad.r,X(i-1)+slot/2);
          ctx.fillRect(xa,pad.t,xb-xa,ph); runStart=-1;
        }
      }
    }
    // сетка и подписи по Y
    ctx.font='11px "IBM Plex Mono",monospace'; ctx.textAlign='right'; ctx.textBaseline='middle';
    ax.ticks.vals.forEach(function(tv){
      var y=Y(tv*ax.div); ctx.strokeStyle=cGrid; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(pad.l,Math.round(y)+.5); ctx.lineTo(w-pad.r,Math.round(y)+.5); ctx.stroke();
      ctx.fillStyle=cTxt; ctx.fillText(String(Number(tv.toFixed(2))),pad.l-7,y);
    });
    ctx.textAlign='left'; ctx.textBaseline='top'; ctx.fillStyle=cssv('--text-secondary')||'#9CA6C4'; ctx.fillText(ax.unit,4,2);
    // подписи по X
    var pp=PMAP[pid]; ctx.textBaseline='alphabetic'; ctx.fillStyle=cTxt;
    for(k=0;k<=4;k++){
      var f=k/4, back=pp.min*(1-f), lab= k===4?'сейчас' : pp.min<=60?'−'+Math.round(back)+' м' : pp.min<=1440?'−'+Math.round(back/60)+' ч' : '−'+Math.round(back/1440)+' д';
      ctx.textAlign=k===0?'left':k===4?'right':'center';
      ctx.fillText(lab,pad.l+pw*f+(k===0?0:0),h-6);
    }
    // серии
    if(stackKind){
      var base=new Float64Array(n);
      vis.forEach(function(s){
        var arr=data.keys[s.key], col=s.color;
        if(bars){
          ctx.fillStyle=col;
          for(i=0;i<n;i++){ var v=arr[i]*cf; if(v<=0) continue; var y0=Y(base[i]), y1=Y(base[i]+v), bw=Math.max(1,slot-(slot>4?1.2:0)); ctx.fillRect(X(i)-bw/2,y1,bw,y0-y1); base[i]+=v; }
        }else{
          ctx.beginPath();
          for(i=0;i<n;i++){ var yy=Y(base[i]+arr[i]*cf); if(i===0) ctx.moveTo(X(i),yy); else ctx.lineTo(X(i),yy); }
          for(i=n-1;i>=0;i--) ctx.lineTo(X(i),Y(base[i]));
          ctx.closePath(); ctx.fillStyle=hexA(col,0.82); ctx.fill();
          ctx.beginPath(); for(i=0;i<n;i++){ var y2=Y(base[i]+arr[i]*cf); if(i===0) ctx.moveTo(X(i),y2); else ctx.lineTo(X(i),y2); } ctx.strokeStyle=col; ctx.lineWidth=1.2; ctx.stroke();
          for(i=0;i<n;i++) base[i]+=arr[i]*cf;
        }
      });
    }
    if(o.between){
      var A=data.keys[o.between.top], B=data.keys[o.between.bottom];
      ctx.fillStyle=hexA(o.between.color,0.55);
      ctx.beginPath(); var started=false, runStart=0;
      for(i=0;i<n;i++){
        var d=A[i]*cf-B[i]*cf;
        if(d>top*0.003){ if(!started){ started=true; runStart=i; ctx.moveTo(X(i),Y(B[i]*cf)); } ctx.lineTo(X(i),Y(A[i]*cf)); }
        if(started&&(d<=top*0.003||i===n-1)){
          var end=(d<=top*0.003)?i:i;
          for(var j=end;j>=runStart;j--) ctx.lineTo(X(j),Y(B[j]*cf));
          ctx.closePath(); ctx.fill(); ctx.beginPath(); started=false;
        }
      }
    }
    if(!stackKind){
      vis.forEach(function(s){
        var arr=data.keys[s.key];
        ctx.beginPath();
        for(i=0;i<n;i++){ var yy=Y(arr[i]*cf); if(i===0) ctx.moveTo(X(i),yy); else ctx.lineTo(X(i),yy); }
        if(s.fill||o.fill){ var p2_=new Path2D(); ctx.save(); ctx.lineTo(X(n-1),Y(0)); ctx.lineTo(X(0),Y(0)); ctx.closePath(); ctx.fillStyle=hexA(s.color,0.16); ctx.fill(); ctx.restore(); ctx.beginPath(); for(i=0;i<n;i++){ var y3=Y(arr[i]*cf); if(i===0) ctx.moveTo(X(i),y3); else ctx.lineTo(X(i),y3); } }
        ctx.strokeStyle=s.color; ctx.lineWidth=s.width||1.6; ctx.setLineDash(s.dash||[]); ctx.lineJoin='round'; ctx.stroke(); ctx.setLineDash([]);
      });
    }
    o.lines.forEach(function(l){
      var arr=data.keys[l.key]; ctx.beginPath();
      for(i=0;i<n;i++){ var yy=Y(arr[i]*cf); if(i===0) ctx.moveTo(X(i),yy); else ctx.lineTo(X(i),yy); }
      ctx.strokeStyle=l.color; ctx.lineWidth=l.width||1.8; ctx.setLineDash(l.dash||[]); ctx.stroke(); ctx.setLineDash([]);
    });
    o.refs.forEach(function(r){
      var v=(r.key?data.keys[r.key][n-1]:r.value)*cf, y=Y(v);
      if(r.key){ ctx.beginPath(); for(i=0;i<n;i++){ var yy=Y(data.keys[r.key][i]*cf); if(i===0) ctx.moveTo(X(i),yy); else ctx.lineTo(X(i),yy); } }
      else { ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(w-pad.r,y); }
      ctx.strokeStyle=r.color||'#fff'; ctx.lineWidth=1.2; ctx.setLineDash(r.dash||[5,4]); ctx.stroke(); ctx.setLineDash([]);
    });
    // перекрестие
    if(hov>=0&&hov<n){
      var hx=X(hov); ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(Math.round(hx)+.5,pad.t); ctx.lineTo(Math.round(hx)+.5,pad.t+ph); ctx.stroke();
      if(!bars) vis.forEach(function(s){ var yy=Y((stackKind?stackTop(s,hov):data.keys[s.key][hov]*cf)); ctx.fillStyle=s.color; ctx.beginPath(); ctx.arc(hx,yy,3.2,0,6.283); ctx.fill(); });
    }
  }
  function stackTop(s,idx){ var t=0; for(var q=0;q<vis_().length;q++){ var ss=vis_()[q]; t+=data.keys[ss.key][idx]*cf; if(ss===s) break; } return t; }
  function vis_(){ return o.series.filter(function(s){ return s.visible!==false; }); }
  function showTip(idx,clientX){
    var rows='', tot=0, list=vis_();
    list.forEach(function(s){ var v=data.keys[s.key][idx]; tot+=v; rows+='<div class="en-tip-row"><i style="background:'+s.color+'"></i><span>'+s.label+'</span><b>'+fmtV(v*cf)+'</b></div>'; });
    o.lines.forEach(function(l){ rows+='<div class="en-tip-row"><i style="background:'+l.color+'"></i><span>'+l.label+'</span><b>'+fmtV(data.keys[l.key][idx]*cf)+'</b></div>'; });
    o.refs.forEach(function(r){ if(r.key&&r.label) rows+='<div class="en-tip-row"><i style="background:'+(r.color||'#fff')+'"></i><span>'+r.label+'</span><b>'+fmtV(data.keys[r.key][idx]*cf)+'</b></div>'; });
    if(list.length>1&&o.stack!==false&&o.kind!=='line') rows+='<div class="en-tip-row tot"><span>Всего</span><b>'+fmtV(tot*cf)+'</b></div>';
    tip.innerHTML='<div class="en-tip-t">'+EN.binLabel(data.t0,idx,data.bin)+'</div>'+rows;
    tip.hidden=false;
    var tw=tip.offsetWidth, x=geom.X(idx)+14; if(x+tw>geom.w-4) x=geom.X(idx)-tw-14; if(x<4) x=4;
    tip.style.left=x+'px'; tip.style.top='8px';
  }
  function onMove(e){
    if(!geom) return;
    var r=cv.getBoundingClientRect(), x=(e.clientX-r.left)-geom.pad.l;
    var idx=geom.bars?Math.floor(x/geom.slot):Math.round(x/geom.slot);
    if(idx<0||idx>=geom.n){ onLeave(); return; }
    if(idx!==hov){ hov=idx; draw(); }
    showTip(idx,e.clientX);
  }
  function onLeave(){ hov=-1; tip.hidden=true; draw(); }
  cv.addEventListener('pointermove',onMove); cv.addEventListener('pointerleave',onLeave); cv.addEventListener('pointerdown',onMove);
  if(root.ResizeObserver) new ResizeObserver(function(){ draw(); }).observe(host);
  api.draw=function(){ if(hov>=0){ draw(); if(data&&hov<data.n) showTip(hov); } else draw(); };
  api.setSeries=function(list){ o.series=list; api.draw(); };
  api.data=function(){ return data; };
  draw();
  return api;
};

// Легенда-переключатель: кнопки с цветной точкой, клик скрывает/показывает ряд.
EN.legend=function(host,series,onChange,opts){
  opts=opts||{}; host.classList.add('en-legend'); host.innerHTML='';
  series.forEach(function(s){
    var b=document.createElement('button'); b.type='button'; b.className='en-chip'+(s.visible===false?' off':'');
    b.innerHTML='<i style="background:'+s.color+'"></i>'+s.label; b.setAttribute('aria-pressed',s.visible===false?'false':'true');
    b.onclick=function(){ s.visible=(s.visible===false); b.classList.toggle('off',s.visible===false); b.setAttribute('aria-pressed',s.visible===false?'false':'true'); if(onChange) onChange(s); };
    host.appendChild(b);
  });
};

/* ---------- общие элементы интерфейса ---------- */
EN.mountPeriods=function(host,opts){
  opts=opts||{}; host.classList.add('en-tabs'); host.innerHTML='';
  PERIODS.forEach(function(p){
    var b=document.createElement('button'); b.type='button'; b.className='en-tab'; b.dataset.p=p.id; b.textContent=(opts.short&&p.short)||p.label;
    b.onclick=function(){ EN.setPeriod(p.id); }; host.appendChild(b);
  });
  function sync(){ host.querySelectorAll('.en-tab').forEach(function(b){ b.classList.toggle('active',b.dataset.p===EN.period); b.setAttribute('aria-pressed',b.dataset.p===EN.period?'true':'false'); }); }
  EN.on('period',sync); sync();
};
EN.mountControls=function(host){
  host.classList.add('en-ctl');
  var sc=Object.keys(SCENARIOS).map(function(k){ return '<button type="button" class="en-btn" data-sc="'+k+'" title="'+SCENARIOS[k].hint+'">'+SCENARIOS[k].label+'</button>'; }).join('');
  var sp=[[0,'⏸'],[1,'×1'],[60,'×60'],[600,'×600'],[3600,'×3600']].map(function(a){ return '<button type="button" class="en-btn" data-sp="'+a[0]+'">'+a[1]+'</button>'; }).join('');
  host.innerHTML='<div class="en-ctl-g"><span class="en-ctl-l">Демо-база</span><span class="en-btns">'+sc+'</span></div>'+
    '<div class="en-ctl-g"><span class="en-ctl-l">Скорость</span><span class="en-btns">'+sp+'</span></div>'+
    '<div class="en-ctl-g en-ctl-clock"><span class="en-ctl-l">Игровое время</span><b id="enClock" class="mono">—</b></div>';
  function sync(){
    host.querySelectorAll('[data-sc]').forEach(function(b){ b.classList.toggle('active',b.dataset.sc===EN.scenario); });
    host.querySelectorAll('[data-sp]').forEach(function(b){ b.classList.toggle('active',Number(b.dataset.sp)===EN.speed); });
  }
  host.addEventListener('click',function(e){
    var a=e.target.closest('[data-sc]'); if(a){ EN.load(a.dataset.sc); sync(); return; }
    var b=e.target.closest('[data-sp]'); if(b){ EN.setSpeed(Number(b.dataset.sp)); sync(); }
  });
  var clk=host.querySelector('#enClock');
  EN.on('frame',function(){ clk.textContent=EN.nowStr(); });
  sync();
};
EN.start=function(){ EN.load(EN.scenario); EN.run(); };

root.EN=EN;
if(typeof module!=='undefined') module.exports=EN;
})(typeof window!=='undefined'?window:global);
