// Вкладка 5 · «Навыки» — учебный центр и прокачка навыков.

function renderAcademyCard(){
  const count=state.buildings[ACADEMY.id]||0;
  const cost=scaledCost(ACADEMY,count);
  const afford=Object.entries(cost).every(([rid,q])=>(state.resources[rid]||0)>=q);
  const costStr=Object.entries(cost).map(([rid,q])=>{
    const ok=(state.resources[rid]||0)>=q;
    return '<span class="'+(ok?'ok':'bad')+'">'+q+' '+resTag(rid)+'</span>';
  }).join('');
  return '<div class="bcard" style="--tier-color:var(--skill)">'+
    '<div class="bcard-head">'+iconSvg('academy','skill')+
      '<div><h3>'+ACADEMY.name+'</h3><div class="bcard-recipe">+'+ACADEMY_SP_PER_HOUR+' SP/ч за блок</div></div>'+
    '</div>'+
    '<div class="bcard-stats"><span>Построено: <strong>'+count+'</strong></span></div>'+
    '<div class="bcard-cost">'+costStr+'</div>'+
    '<button class="build-btn" data-build="'+ACADEMY.id+'" '+(afford?'':'disabled')+'>Построить (+1)</button>'+
  '</div>';
}

function renderSkills(){
  const spInfo=spPerHourTotal();
  let html='<div class="panel">'+
    '<h2>Обучение</h2>'+
    '<div class="pop-metrics" style="margin-bottom:12px;">'+
      '<span>От производства: <strong style="font-family:var(--font-mono)">'+spInfo.fromBuildings.toFixed(1)+' SP/ч</strong></span>'+
      '<span>От учебных центров: <strong style="font-family:var(--font-mono)">'+spInfo.fromAcademy+' SP/ч</strong></span>'+
      '<span>Итого: <strong style="font-family:var(--font-mono)">'+spInfo.total.toFixed(1)+' SP/ч</strong></span>'+
    '</div>'+
    '<div class="pop-grid">'+renderAcademyCard()+'</div>'+
  '</div>'+
  '<div class="pop-grid" style="margin-top:14px;">';
  SKILLS.forEach(sk=>{
    const st=state.skills[sk.id];
    const level=st.level;
    const isTraining=state.training===sk.id;
    const maxed=level>=MAX_SKILL_LEVEL;
    const nextCost=maxed?0:skillLevelCost(level+1);
    const pct=maxed?100:Math.max(0,Math.min(100,(st.sp/nextCost)*100));
    const speedBonus=Math.round(SKILL_SPEED_BONUS*level*100);
    const workforceCut=Math.round(SKILL_WORKFORCE_CUT*level*100);
    const affectsRich=skillAffectsRichness(sk.id);
    const richBonus=affectsRich?Math.round(SKILL_RICHNESS_BONUS*level*100):null;
    const speedPerLvl=(SKILL_SPEED_BONUS*100).toFixed(2);
    const wfPerLvl=(SKILL_WORKFORCE_CUT*100).toFixed(2);
    const richPerLvl=affectsRich?(SKILL_RICHNESS_BONUS*100).toFixed(2):null;
    // Метка зависит от того, что именно качает навык — «богатство месторождения» для
    // горного дела, «плодородие почвы» для агрономии и т.д., см. richLabel().
    const richBuildings=BUILDINGS.filter(b=>b.tier===0 && b.type!=='solar' && recipeSkillId(b)===sk.id);
    const richLbl=richBuildings.length?richLabel(richBuildings[0]).toLowerCase():'';
    const barClass=maxed?'full':(isTraining?'partial':'idle');
    const prodRows=BUILDINGS.filter(b=>b.tier===0 && recipeSkillId(b)===sk.id && unitsOf(b.id).length>0)
      .map(b=>{
        const richPct=Math.round(richOf(b)*100);
        const speedPct=Math.round(speedMultForRecipe(b)*100);
        const loadFrac=(util[b.id]&&util[b.id].frac)||0;
        const loadPct=Math.round(loadFrac*100);
        const totalPct=Math.round(richOf(b)*speedMultForRecipe(b)*loadFrac*100);
        return '<div class="skill-prod-row"><span class="skill-prod-name">'+recipeLabel(b)+'</span>'+
          '<span class="skill-prod-detail">'+richLabel(b).toLowerCase()+' '+richPct+'% × скорость '+speedPct+'% × загрузка '+loadPct+'%</span>'+
          '<span class="skill-prod-total">= '+totalPct+'%</span></div>';
      }).join('');
    html+='<div class="bcard" style="--tier-color:var(--skill)">'+
      '<div class="bcard-head">'+iconSvg(sk.icon,'skill')+
        '<div><h3>'+sk.name+'</h3><div class="bcard-recipe">Уровень '+level+' / '+MAX_SKILL_LEVEL+(isTraining?' · изучается сейчас':'')+'</div></div>'+
      '</div>'+
      '<div class="util-bar '+barClass+'"><div class="util-fill" style="width:'+pct+'%"></div></div>'+
      '<div class="util-label">'+(maxed?'Максимальный уровень':(Math.floor(st.sp)+' / '+nextCost+' SP до следующего уровня'))+'</div>'+
      '<div class="bcard-staff">Накоплено: +'+speedBonus+'% скорость, −'+workforceCut+'% персонал'+(richBonus!=null?', +'+richBonus+'% '+richLbl:'')+'</div>'+
      '<div class="bcard-staff">Каждый уровень даёт: +'+speedPerLvl+'% скорость, −'+wfPerLvl+'% персонал'+(richPerLvl!=null?', +'+richPerLvl+'% '+richLbl:'')+'</div>'+
      (prodRows?'<div class="skill-prod-list">'+prodRows+'</div>':'')+
      '<button class="build-btn" data-train="'+sk.id+'" '+((isTraining||maxed)?'disabled':'')+'>'+(isTraining?'Изучается':'Обучать')+'</button>'+
    '</div>';
  });
  html+='</div>';
  skillsPanelEl.innerHTML=html;
}

function trySetTraining(skId){
  if(!state.skills[skId]) return;
  if(state.skills[skId].level>=MAX_SKILL_LEVEL) return;
  state.training=skId;
  saveState();
  renderAll();
}

skillsPanelEl.addEventListener('click', e=>{
  const buildBtn=e.target.closest('[data-build]');
  if(buildBtn){ tryBuild(buildBtn.dataset.build); return; }
  const trainBtn=e.target.closest('[data-train]');
  if(trainBtn){ trySetTraining(trainBtn.dataset.train); }
});
