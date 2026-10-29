const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const STORAGE_KEY = "fullBodyTrackerDataV1";
const uid = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36);
const PROGRAM = [
 {id:"day1",name:"День 1",items:[
  ["lat-pulldown-wide","Тяга верхнего блока широким хватом","Широчайшие мышцы спины",6,10,3],
  ["lateral-raise-seated","Махи с гантелями сидя","Плечи",10,15,3],
  ["incline-db-press","Жим гантелей на наклонной скамье","Грудные мышцы",5,8,3],
  ["one-arm-row","Тяга горизонтального блока одной рукой","Широчайшие мышцы спины",6,10,3],
  ["incline-curl","Сгибание рук на наклонной скамье","Бицепс",8,12,3],
  ["one-arm-pushdown","Разгибание рук на блоке одной рукой","Трицепс",8,12,3],
  ["bulgarian-split-squat","Болгарские выпады с гантелями","Квадрицепсы и ягодичные мышцы",6,8,3],
  ["bosu-crunch","Скручивания на босу-болле","Пресс",10,20,3],
  ["smith-calf-raise","Икроножные стоя в Смите","Икроножные мышцы",6,12,3],
  ["wrist-curl","Сгибание кисти с гантелью","Предплечья",8,12,3]
 ]},
 {id:"day2",name:"День 2",items:[
  ["dips","Отжимания на брусьях","Грудные мышцы",4,8,2],
  ["seated-cable-row","Тяга горизонтального блока","Трапеции и спина",6,10,3],
  ["seated-leg-curl","Сгибание ног сидя","Задняя поверхность бедра",8,12,3],
  ["seated-db-press","Жим гантелей сидя","Плечи",6,12,2],
  ["machine-pullover","Пуловер в тренажёре","Широчайшие мышцы спины",8,14,3],
  ["cable-hammer-curl","Молотки на блоке","Бицепс",10,15,3],
  ["overhead-triceps-cable","Разгибание рук над головой на блоке","Трицепс",10,15,3],
  ["calf-myo-reps","Икры в тренажёре","Икроножные мышцы",6,15,1,"myoreps"]
 ]},
 {id:"day3",name:"День 3",items:[
  ["one-arm-lat-pulldown","Тяга вертикального блока одной рукой","Широчайшие мышцы спины",6,10,3],
  ["wrist-extension","Разгибание кисти","Предплечья",8,15,3],
  ["leg-extension","Разгибание ног сидя","Квадрицепсы",6,10,3],
  ["pec-deck","Сведение рук в тренажёре-бабочке","Грудные мышцы",10,15,2],
  ["reverse-pec-deck","Обратная бабочка","Задние дельты",8,12,2],
  ["romanian-deadlift","Румынская тяга со штангой","Ягодичные и задняя поверхность бедра",5,8,2],
  ["cable-lateral-raise","Махи на блоке","Плечи",10,15,3],
  ["machine-crunch-drop","Скручивания в тренажёре","Пресс",8,20,1,"dropset"]
 ]}
];
const defaultData = () => ({version:1,settings:{weightStep:2.5,restSeconds:90,autoRest:true,sound:false,theme:"dark"},history:[],active:null,exerciseOverrides:{},customExercises:[]});
let data = loadData(), view = "home", timerId=null, restUntil=null;
function loadData(){try{return {...defaultData(),...JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")}}catch{return defaultData()}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}
function allDays(){return PROGRAM.map(day=>({...day,items:day.items.map(item=>data.exerciseOverrides[item[0]]?{...exerciseFromArray(item),...data.exerciseOverrides[item[0]]}:exerciseFromArray(item))}))}
function exerciseFromArray(a){return {id:a[0],name:a[1],target:a[2],min:a[3],max:a[4],sets:a[5],type:a[6]||"normal"}}
function dayById(id){return allDays().find(d=>d.id===id)}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function dateFmt(d){return new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(d))}
function timeFmt(s){const m=Math.floor(s/60),sec=s%60;return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`}
function showToast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2300)}
function setNav(){ $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view)); $("#bottomNav").style.display=view==="workout"||view==="summary"?"none":"flex"; }
function render(){setNav(); if(view==="home")renderHome();else if(view==="workout")renderWorkout();else if(view==="history")renderHistory();else if(view==="progress")renderProgress();else if(view==="settings")renderSettings();else if(view==="summary")renderSummary();}
function startWorkout(dayId){
 const day=dayById(dayId); if(!day)return;
 if(data.active && !data.active.finished){
  if(!confirm("Есть незавершённая тренировка. Начать новую? Текущая будет сохранена как незавершённая."))return;
  data.active.status="unfinished"; data.history.unshift(data.active);
 }
 const previous=data.history.filter(h=>h.dayId===dayId && h.finished).sort((a,b)=>new Date(b.startedAt)-new Date(a.startedAt))[0];
 const exercises=day.items.map(ex=>{
  const last=findLastExercise(ex.id);
  const sets=Array.from({length:ex.sets},(_,i)=>{
   const old=last?.sets?.[i];
   return {weight:old?.weight??"",reps:old?.reps??"",done:false};
  });
  return {exerciseId:ex.id,name:ex.name,target:ex.target,min:ex.min,max:ex.max,type:ex.type,plannedSets:ex.sets,sets,skipped:false,notes:"",special:ex.type==="myoreps"?{minis:[{weight:last?.special?.minis?.[0]?.weight??"",reps:""},{weight:last?.special?.minis?.[1]?.weight??"",reps:""},{weight:last?.special?.minis?.[2]?.weight??"",reps:""}]}:ex.type==="dropset"?{stages:[{weight:last?.special?.stages?.[0]?.weight??"",reps:""},{weight:"",reps:""},{weight:"",reps:""}]}:null};
 });
 data.active={id:uid(),dayId,dayName:day.name,startedAt:new Date().toISOString(),finished:false,status:"active",index:0,exercises,notes:""};
 save();view="workout";render();
}
function findLastExercise(exId){
 const records=data.history.filter(h=>h.finished).sort((a,b)=>new Date(b.startedAt)-new Date(a.startedAt));
 for(const h of records){const e=h.exercises?.find(e=>e.exerciseId===exId&&!e.skipped);if(e)return e;}
 return null;
}
function renderHome(){
 const completed=data.history.filter(h=>h.finished);
 const total=completed.length, thisWeek=completed.filter(h=>Date.now()-new Date(h.startedAt).getTime()<7*86400000).length;
 const activeNotice=data.active&&!data.active.finished?`<div class="list-card"><div class="row-between"><div><h3>Тренировка не завершена</h3><p>${esc(data.active.dayName)} · можно продолжить с сохранённого места</p></div><span class="pill">В процессе</span></div><button class="primary wide" style="margin-top:14px" id="resumeBtn">Продолжить тренировку</button></div>`:"";
 $("#app").innerHTML=`<section><div class="eyebrow">ТВОЙ ТРЕНИРОВОЧНЫЙ ДНЕВНИК</div><h1 class="hero-title">Становись<br>сильнее.</h1><p class="subtle">Тренировка за тренировкой. Твои веса и результаты сохраняются автоматически.</p>${activeNotice}<div class="section-head"><h2>Выбери тренировку</h2><span class="subtle">3 дня</span></div><div class="days-grid">${allDays().map(d=>`<button class="day-card" data-start="${d.id}"><strong>${d.name}</strong><span>Full Body</span><div class="count">${d.items.length} упражнений →</div></button>`).join("")}</div><div class="section-head"><h2>Твоя активность</h2></div><div class="stats-grid"><div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">Завершено тренировок</div></div><div class="stat-card"><div class="stat-value">${thisWeek}</div><div class="stat-label">За последние 7 дней</div></div></div><div class="section-head"><h2>Последняя тренировка</h2></div>${completed.length?historyCard(completed[0]):`<div class="empty">Пока нет завершённых тренировок.<br>Выбери День 1, 2 или 3, чтобы начать.</div>`}</section>`;
 $$("[data-start]").forEach(b=>b.onclick=()=>startWorkout(b.dataset.start));
 if($("#resumeBtn"))$("#resumeBtn").onclick=()=>{view="workout";render()};
}
function currentExercise(){return data.active?.exercises?.[data.active.index]}
function renderWorkout(){
 const w=data.active;if(!w){view="home";return render()}
 const e=currentExercise();if(!e){view="summary";return render()}
 const idx=w.index,total=w.exercises.length,done=w.exercises.filter(x=>x.skipped||x.sets.every(s=>s.done)).length;
 const last=findLastExercise(e.exerciseId);
 const prevText=last?`Прошлый раз: ${last.skipped?"пропущено":last.sets.filter(s=>s.weight!==""||s.reps!=="").map(s=>`${s.weight||"—"} кг × ${s.reps||"—"}`).join(" · ")}`:"Первое выполнение — зафиксируй стартовый вес";
 let setsHTML="";
 if(e.type==="myoreps"){
  const myo=e.special?.minis||[];
  setsHTML=`<div class="subtle">Основной подход и мини-подходы фиксируются отдельно.</div>${renderSpecialRows(myo,"minis","Мини-подход")}`;
 }else if(e.type==="dropset"){
  setsHTML=`<div class="subtle">Запиши каждый этап дроп-сета с отдельным весом.</div>${renderSpecialRows(e.special?.stages||[],"stages","Этап")}`;
 }else{
  setsHTML=e.sets.map((s,i)=>`<div class="set-row"><div class="set-num">${i+1}</div><div><span class="field-label">Вес, кг</span><div class="number-control"><button data-change="weight" data-i="${i}" data-d="-1" aria-label="Уменьшить вес">−</button><input aria-label="Вес подхода ${i+1}" inputmode="decimal" type="number" step="${data.settings.weightStep}" min="0" value="${esc(s.weight)}" placeholder="—" data-field="weight" data-i="${i}"><button data-change="weight" data-i="${i}" data-d="1" aria-label="Увеличить вес">+</button></div></div><div><span class="field-label">Повторения</span><div class="number-control"><button data-change="reps" data-i="${i}" data-d="-1">−</button><input aria-label="Повторения подхода ${i+1}" inputmode="numeric" type="number" min="0" step="1" value="${esc(s.reps)}" placeholder="${e.min}–${e.max}" data-field="reps" data-i="${i}"><button data-change="reps" data-i="${i}" data-d="1">+</button></div></div><button class="check-set ${s.done?"done":""}" data-done="${i}" aria-label="Отметить подход">${s.done?"✓":"✓"}</button></div>`).join("");
 }
 const restHTML=restUntil?`<div class="rest-bar"><div><div class="field-label">ОТДЫХ</div><div class="rest-time" id="restTime">--:--</div></div><div class="button-row"><button class="small-button" id="addRest">+30 сек</button><button class="small-button" id="skipRest">Пропустить</button></div></div>`:"";
 $("#app").innerHTML=`<section class="exercise-screen"><div class="workout-header"><button class="small-button" id="exitWorkout">✕ Выйти</button><span class="eyebrow">${esc(w.dayName)}</span><span class="subtle">${idx+1} / ${total}</span></div><div class="progress-track"><div class="progress-fill" style="width:${((idx+done/Math.max(1,total))*100/total)}%"></div></div><div class="exercise-main"><div class="eyebrow">УПРАЖНЕНИЕ ${idx+1} ИЗ ${total}</div><h1 class="exercise-title">${esc(e.name)}</h1><div class="target">${esc(e.target)}</div><div class="plan-line"><span class="plan-badge">${e.type==="myoreps"?"Myo-Reps":e.type==="dropset"?"Дроп-сет":`${e.plannedSets} подхода`}</span><span class="plan-badge">${e.min}–${e.max} повторений</span></div><div class="previous">${esc(prevText)}</div>${setsHTML}<label class="label" for="exerciseNote">Заметка к упражнению</label><textarea class="textarea" id="exerciseNote" rows="2" placeholder="Например: последний подход тяжёлый…">${esc(e.notes||"")}</textarea>${restHTML}</div><div class="exercise-bottom"><button class="primary wide" id="completeExercise">${e.sets.every(s=>s.done)?"Упражнение выполнено":"Подход выполнен"}</button><div class="bottom-actions"><button class="secondary" id="prevExercise" ${idx===0?"disabled":""}>← Назад</button><button class="secondary" id="skipExercise">Пропустить</button><button class="secondary" id="nextExercise">${idx===total-1?"Итог":"Далее →"}</button></div></div></section>`;
 bindWorkoutInputs();
 $("#exerciseNote").onchange=ev=>{e.notes=ev.target.value;save()};
 $("#completeExercise").onclick=()=>{
  if(e.type!=="normal"){showToast("Для специального упражнения заполни этапы и нажми «Далее»");return}
  const next=e.sets.find(s=>!s.done);
  if(next){next.done=true;save();if(data.settings.autoRest)startRest(data.settings.restSeconds);render()}
  else {showToast("Все подходы отмечены");}
 };
 $("#prevExercise").onclick=()=>{if(idx>0){w.index--;save();render()}};
 $("#skipExercise").onclick=()=>{if(confirm("Пропустить упражнение? Оно останется в истории как пропущенное.")){e.skipped=true;moveNext()}};
 $("#nextExercise").onclick=()=>{if(idx===total-1){view="summary";save();render()}else moveNext()};
 $("#exitWorkout").onclick=()=>{if(confirm("Сохранить тренировку и выйти? Её можно будет продолжить позже.")){save();view="home";render()}};
 if($("#addRest"))$("#addRest").onclick=()=>{restUntil=(restUntil||Date.now())+30000;renderWorkout()};
 if($("#skipRest"))$("#skipRest").onclick=()=>{clearInterval(timerId);timerId=null;restUntil=null;renderWorkout()};
 if(restUntil)tickRestDisplay();
}
function renderSpecialRows(rows,key,label){
 return rows.map((s,i)=>`<div class="set-row"><div class="set-num">${i===0?"Осн.":i}</div><div><span class="field-label">${label} · вес, кг</span><div class="number-control"><button data-special-change="${key}" data-i="${i}" data-field="weight" data-d="-1">−</button><input type="number" inputmode="decimal" step="${data.settings.weightStep}" min="0" value="${esc(s.weight)}" placeholder="—" data-special="${key}" data-i="${i}" data-field="weight"><button data-special-change="${key}" data-i="${i}" data-field="weight" data-d="1">+</button></div></div><div><span class="field-label">${label} · повторы</span><input class="input" style="margin:0;padding:8px;text-align:center" type="number" inputmode="numeric" min="0" value="${esc(s.reps)}" placeholder="—" data-special="${key}" data-i="${i}" data-field="reps"></div><button class="check-set ${s.done?"done":""}" data-special-done="${key}" data-i="${i}">✓</button></div>`).join("");
}
function bindWorkoutInputs(){
 $$("[data-field]").forEach(inp=>inp.addEventListener("change",()=>{
  const e=currentExercise(),i=Number(inp.dataset.i),field=inp.dataset.field;
  if(inp.dataset.special){e.special[inp.dataset.special][i][field]=inp.value}else e.sets[i][field]=inp.value;
  save();
 }));
 $$("[data-change]").forEach(b=>b.onclick=()=>{
  const e=currentExercise(),s=e.sets[Number(b.dataset.i)],f=b.dataset.change,delta=Number(b.dataset.d);
  const step=f==="weight"?Number(data.settings.weightStep):1;let v=Number(s[f]||0)+delta*step;
  s[f]=String(Math.max(0,Math.round(v*100)/100));save();renderWorkout();
 });
 $$("[data-done]").forEach(b=>b.onclick=()=>{const e=currentExercise(),s=e.sets[Number(b.dataset.done)];s.done=!s.done;save();renderWorkout()});
 $$("[data-special-change]").forEach(b=>b.onclick=()=>{const e=currentExercise(),r=e.special[b.dataset.specialChange][Number(b.dataset.i)],f=b.dataset.field,step=f==="weight"?Number(data.settings.weightStep):1;r[f]=String(Math.max(0,Number(r[f]||0)+Number(b.dataset.d)*step));save();renderWorkout()});
 $$("[data-special-done]").forEach(b=>b.onclick=()=>{const e=currentExercise(),r=e.special[b.dataset.specialDone][Number(b.dataset.i)];r.done=!r.done;save();showToast(r.done?"Этап отмечен":"Отметка снята")});
}
function moveNext(){const w=data.active;if(w.index<w.exercises.length-1)w.index++;else{view="summary"}save();render()}
function startRest(sec){clearInterval(timerId);restUntil=Date.now()+sec*1000;timerId=setInterval(()=>{if(!restUntil||Date.now()>=restUntil){clearInterval(timerId);timerId=null;restUntil=null;showToast("Отдых завершён");if(view==="workout")renderWorkout()}else{const el=$("#restTime");if(el)el.textContent=timeFmt(Math.ceil((restUntil-Date.now())/1000))}},250);renderWorkout()}
function tickRestDisplay(){const el=$("#restTime");if(el)el.textContent=timeFmt(Math.max(0,Math.ceil((restUntil-Date.now())/1000)));if(!timerId)timerId=setInterval(()=>{if(!restUntil||Date.now()>=restUntil){clearInterval(timerId);timerId=null;restUntil=null;showToast("Отдых завершён");if(view==="workout")renderWorkout()}else{const t=$("#restTime");if(t)t.textContent=timeFmt(Math.ceil((restUntil-Date.now())/1000))}},250)}
function calcVolume(h){return (h.exercises||[]).reduce((sum,e)=>sum+(e.skipped?0:(e.sets||[]).reduce((s,x)=>s+(Number(x.weight)||0)*(Number(x.reps)||0),0)),0)}
function finishWorkout(){
 const w=data.active;w.finished=true;w.status="completed";w.finishedAt=new Date().toISOString();w.durationMinutes=Math.max(1,Math.round((new Date(w.finishedAt)-new Date(w.startedAt))/60000));
 data.history.unshift(JSON.parse(JSON.stringify(w)));data.active=null;save();clearInterval(timerId);timerId=null;restUntil=null;view="summary";data.lastSummary=w;render();
}
function renderSummary(){
 const w=data.active||data.lastSummary;if(!w){view="home";return render()}
 const skipped=w.exercises.filter(e=>e.skipped).length,finished=w.exercises.filter(e=>!e.skipped&&e.sets.every(s=>s.done)).length,volume=calcVolume(w);
 $("#app").innerHTML=`<section><div class="eyebrow">ТРЕНИРОВКА ЗАВЕРШЕНА</div><h1 class="hero-title">Хорошая<br>работа.</h1><p class="subtle">${esc(w.dayName)} · ${dateFmt(w.startedAt)}</p><div class="stats-grid"><div class="stat-card"><div class="stat-value">${finished}</div><div class="stat-label">Упражнений выполнено</div></div><div class="stat-card"><div class="stat-value">${Math.round(volume).toLocaleString("ru-RU")}</div><div class="stat-label">Тоннаж, кг × повторы</div></div><div class="stat-card"><div class="stat-value">${w.durationMinutes||Math.max(1,Math.round((Date.now()-new Date(w.startedAt))/60000))} мин</div><div class="stat-label">Продолжительность</div></div><div class="stat-card"><div class="stat-value">${skipped}</div><div class="stat-label">Пропущено упражнений</div></div></div><div class="section-head"><h2>Итог по упражнениям</h2></div>${w.exercises.map(e=>`<div class="list-card"><div class="row-between"><h3>${esc(e.name)}</h3><span class="pill">${e.skipped?"Пропущено":`${e.sets.filter(s=>s.done).length}/${e.sets.length}`}</span></div><div class="history-set">${e.type==="normal"?e.sets.map((s,i)=>`Подход ${i+1}: ${s.weight||"—"} кг × ${s.reps||"—"} ${s.done?"✓":""}`).join("<br>"):esc(e.type==="myoreps"?"Myo-Reps": "Дроп-сет")}</div></div>`).join("")}<label class="label" for="workoutNotes">Заметка к тренировке</label><textarea id="workoutNotes" class="textarea" rows="3" placeholder="Самочувствие, энергия, что улучшить…">${esc(w.notes||"")}</textarea><button class="primary wide" id="finishSave">Сохранить тренировку</button><button class="secondary wide" style="margin-top:9px" id="summaryHome">На главную</button></section>`;
 $("#workoutNotes").onchange=e=>{w.notes=e.target.value;if(data.active)save();else{const h=data.history.find(x=>x.id===w.id);if(h)h.notes=e.target.value;data.lastSummary=w;save()}};
 $("#finishSave").onclick=()=>{if(data.active){finishWorkout();showToast("Тренировка сохранена")}else{const h=data.history.find(x=>x.id===w.id);if(h){h.notes=w.notes;save()}view="home";render();showToast("Сохранено")}};
 $("#summaryHome").onclick=()=>{if(data.active){if(confirm("Завершить и сохранить тренировку?"))finishWorkout();else{view="workout";render()}}else{view="home";render()}};
}
function historyCard(h){return `<div class="list-card"><div class="row-between"><div><h3>${esc(h.dayName)}</h3><p>${dateFmt(h.startedAt)} · ${h.durationMinutes||"—"} мин</p></div><span class="pill">${Math.round(calcVolume(h)).toLocaleString("ru-RU")} кг</span></div><button class="secondary wide" style="margin-top:13px" data-open-history="${h.id}">Посмотреть результаты</button></div>`}
function renderHistory(){
 const hs=[...data.history].sort((a,b)=>new Date(b.startedAt)-new Date(a.startedAt));
 $("#app").innerHTML=`<div class="eyebrow">ТВОИ РЕЗУЛЬТАТЫ</div><h1 class="hero-title">История</h1><p class="subtle">Все завершённые и незавершённые тренировки в одном месте.</p>${hs.length?hs.map(h=>`<div class="list-card"><div class="row-between"><div><h3>${esc(h.dayName)}</h3><p>${dateFmt(h.startedAt)} · ${h.finished?"Завершена": "Не завершена"}</p></div><span class="pill">${Math.round(calcVolume(h)).toLocaleString("ru-RU")} кг</span></div><div class="history-set">${h.exercises.filter(e=>!e.skipped).length} упражнений · ${h.durationMinutes||"—"} мин</div><button class="secondary wide" style="margin-top:12px" data-open-history="${h.id}">Открыть тренировку</button></div>`).join(""):`<div class="empty">Здесь появятся твои тренировки после первого занятия.</div>`}`;
 $$("[data-open-history]").forEach(b=>b.onclick=()=>openHistory(b.dataset.openHistory));
}
function openHistory(id){
 const h=data.history.find(x=>x.id===id);if(!h)return;
 $("#app").innerHTML=`<button class="muted-link" id="backHistory">← К истории</button><div class="eyebrow">${h.finished?"ЗАВЕРШЕНО":"НЕЗАВЕРШЕНО"}</div><h1 class="hero-title">${esc(h.dayName)}</h1><p class="subtle">${dateFmt(h.startedAt)} · ${h.durationMinutes||"—"} мин</p><div class="stats-grid"><div class="stat-card"><div class="stat-value">${Math.round(calcVolume(h)).toLocaleString("ru-RU")}</div><div class="stat-label">Тоннаж, кг × повторы</div></div><div class="stat-card"><div class="stat-value">${h.exercises.filter(e=>!e.skipped).length}</div><div class="stat-label">Упражнений</div></div></div><div class="section-head"><h2>Упражнения</h2></div>${h.exercises.map(e=>`<div class="list-card"><div class="row-between"><h3>${esc(e.name)}</h3><span class="pill">${e.skipped?"Пропущено":`${e.sets.filter(s=>s.done).length}/${e.sets.length} подходов`}</span></div><div class="history-set">${e.type==="normal"?e.sets.map((s,i)=>`Подход ${i+1}: ${s.weight||"—"} кг × ${s.reps||"—"} повт. ${s.done?"✓":""}`).join("<br>"):esc(e.type==="myoreps"?"Специальный метод Myo-Reps":"Специальный метод дроп-сет")}</div>${e.notes?`<p class="subtle">Заметка: ${esc(e.notes)}</p>`:""}</div>`).join("")}${h.notes?`<div class="panel"><strong>Заметка к тренировке</strong><p class="subtle">${esc(h.notes)}</p></div>`:""}`;
 $("#backHistory").onclick=()=>{view="history";render()};
}
function renderProgress(){
 const done=data.history.filter(h=>h.finished);
 const volumeByDate=done.slice(0,8).reverse();
 const maxVol=Math.max(1,...volumeByDate.map(calcVolume));
 const exerciseOptions=[...new Map(done.flatMap(h=>h.exercises.filter(e=>!e.skipped).map(e=>[e.exerciseId,e]))).values()];
 $("#app").innerHTML=`<div class="eyebrow">АНАЛИТИКА</div><h1 class="hero-title">Прогресс</h1><p class="subtle">Следи за рабочими весами и регулярностью. Графики появятся после тренировок.</p><div class="stats-grid"><div class="stat-card"><div class="stat-value">${done.length}</div><div class="stat-label">Завершено тренировок</div></div><div class="stat-card"><div class="stat-value">${Math.round(done.reduce((s,h)=>s+calcVolume(h),0)).toLocaleString("ru-RU")}</div><div class="stat-label">Общий тоннаж</div></div></div><div class="section-head"><h2>Тоннаж по тренировкам</h2></div>${volumeByDate.length?`<div class="panel"><div class="bar-chart">${volumeByDate.map(h=>`<div class="bar" style="height:${Math.max(5,calcVolume(h)/maxVol*100)}%"><strong>${Math.round(calcVolume(h)/100)/10}т</strong><span>${new Date(h.startedAt).toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit"})}</span></div>`).join("")}</div></div>`:`<div class="empty">Заверши первую тренировку, чтобы увидеть динамику тоннажа.</div>`}<div class="section-head"><h2>Прогресс упражнения</h2></div>${exerciseOptions.length?`<select class="select" id="exerciseSelect">${exerciseOptions.map(e=>`<option value="${esc(e.exerciseId)}">${esc(e.name)}</option>`).join("")}</select><div id="exerciseProgress"></div>`:`<div class="empty">История рабочих весов появится после первого занятия.</div>`}`;
 if($("#exerciseSelect")){$("#exerciseSelect").onchange=()=>renderExerciseProgress($("#exerciseSelect").value);renderExerciseProgress($("#exerciseSelect").value)}
}
function renderExerciseProgress(id){
 const entries=data.history.filter(h=>h.finished).sort((a,b)=>new Date(a.startedAt)-new Date(b.startedAt)).map(h=>({h,e:h.exercises.find(e=>e.exerciseId===id&&!e.skipped)})).filter(x=>x.e);
 const el=$("#exerciseProgress");if(!el)return;
 if(!entries.length){el.innerHTML='<div class="empty">Пока нет данных.</div>';return}
 el.innerHTML=entries.map(({h,e})=>`<div class="list-card"><div class="row-between"><h3>${dateFmt(h.startedAt)}</h3><span class="pill">${e.sets.length} подхода</span></div><div class="history-set">${e.sets.map((s,i)=>`${i+1}: ${s.weight||"—"} кг × ${s.reps||"—"}`).join(" · ")}</div></div>`).join("");
}
function renderSettings(){
 $("#app").innerHTML=`<div class="eyebrow">ПОД ТЕБЯ</div><h1 class="hero-title">Настройки</h1><div class="panel"><label class="label" for="weightStep">Шаг изменения веса</label><select id="weightStep" class="select"><option value="1">1 кг</option><option value="2.5">2,5 кг</option><option value="5">5 кг</option></select><label class="label" for="restSeconds">Отдых между подходами</label><select id="restSeconds" class="select"><option value="30">30 секунд</option><option value="60">60 секунд</option><option value="90">90 секунд</option><option value="120">120 секунд</option><option value="180">180 секунд</option></select><label class="checkline"><input type="checkbox" id="autoRest"> Автоматически запускать отдых после подхода</label><button class="primary wide" id="saveSettings">Сохранить настройки</button></div><div class="section-head"><h2>Резервная копия</h2></div><div class="panel"><p class="subtle">Сохрани файл JSON, чтобы перенести историю на другое устройство или восстановить данные.</p><div class="settings-actions"><button class="secondary" id="exportData">Экспортировать данные</button><button class="secondary" id="importButton">Импортировать данные</button><input type="file" id="importFile" accept="application/json,.json" hidden><button class="secondary" id="installBtn" ${!window.deferredInstallPrompt?"disabled":""}>Установить приложение</button></div></div><div class="section-head"><h2>Программа</h2></div><div class="panel"><p class="subtle">В программе ${allDays().reduce((n,d)=>n+d.items.length,0)} упражнений на 3 дня. Результаты сохраняются на этом устройстве. Очистка данных браузера может удалить историю — регулярно экспортируй резервную копию.</p></div>`;
 $("#weightStep").value=String(data.settings.weightStep);$("#restSeconds").value=String(data.settings.restSeconds);$("#autoRest").checked=!!data.settings.autoRest;
 $("#saveSettings").onclick=()=>{data.settings.weightStep=Number($("#weightStep").value);data.settings.restSeconds=Number($("#restSeconds").value);data.settings.autoRest=$("#autoRest").checked;save();showToast("Настройки сохранены");render()};
 $("#exportData").onclick=()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`full-body-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);showToast("Резервная копия подготовлена")};
 $("#importButton").onclick=()=>$("#importFile").click();
 $("#importFile").onchange=async ev=>{const file=ev.target.files[0];if(!file)return;try{const incoming=JSON.parse(await file.text());if(!incoming||!Array.isArray(incoming.history)||!incoming.settings)throw new Error("invalid");if(confirm("Импорт заменит текущие историю и настройки. Продолжить?")){data={...defaultData(),...incoming};save();view="home";render();showToast("Данные восстановлены")}}catch{showToast("Не удалось прочитать резервную копию")}ev.target.value=""};
 $("#installBtn").onclick=async()=>{if(window.deferredInstallPrompt){window.deferredInstallPrompt.prompt();await window.deferredInstallPrompt.userChoice;window.deferredInstallPrompt=null;render()}else showToast("В браузере открой меню и выбери «Установить приложение» или «Добавить на главный экран")};
}
document.addEventListener("click",ev=>{const nav=ev.target.closest("[data-view]");if(nav){view=nav.dataset.view;render()}});
$("#homeBtn").onclick=()=>{view="home";render()};$("#settingsBtn").onclick=()=>{view="settings";render()};
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();window.deferredInstallPrompt=e;if(view==="settings")render()});
if("serviceWorker" in navigator && location.protocol!=="file:"){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}))}
render();
