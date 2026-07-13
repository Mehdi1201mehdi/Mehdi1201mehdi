"use strict";
/* ================= STOCKAGE (window.storage -> localStorage -> mémoire) ================= */
const KEY="coachperso.v1";
const Store=(()=>{
  let mem=null, mode="mem";
  async function detect(){
    if(typeof window!=="undefined" && window.storage && window.storage.get){mode="artifact"; return;}
    try{ localStorage.setItem("__t","1"); localStorage.removeItem("__t"); mode="local"; }catch(e){ mode="mem"; }
  }
  async function load(){
    await detect();
    try{
      if(mode==="artifact"){ try{ const r=await window.storage.get(KEY); if(r&&r.value){mem=JSON.parse(r.value); return mem;} }catch(e){} }
      if(mode==="local"){ const v=localStorage.getItem(KEY); if(v){mem=JSON.parse(v); return mem;} }
    }catch(e){ console.error("load",e); }
    return null;
  }
  async function save(data){
    mem=data;
    try{
      if(mode==="artifact"){ await window.storage.set(KEY, JSON.stringify(data)); return true; }
      if(mode==="local"){ localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    }catch(e){ console.error("save",e); }
    return false;
  }
  return {load,save,get mode(){return mode;}};
})();

/* ================= ÉTAT ================= */
const DEFAULTS={
  profile:{sexe:"H", age:40, taille:180, poids:95, activite:1.5, pas:6000},
  settings:{jours:3, lieu:"salle", theme:"auto", limitations:[], usdaKey:"", rapidKey:"", startDate:null, deficit:15},
  weights:[],            // {d:"2026-07-13", kg:95.0}
  measures:[],           // {d, taille, poitrine, bras, cuisse}
  sessions:{},           // exId -> [{d, sets:[{kg,reps,rir}], pain, note, variant}]
  doneSessions:[],       // {d, sid, dur}
  foodlog:{},            // date -> [{name, g, kcal,p,c,l, src}]
  menu:{struct:"3repas", pd:0, dj:0, dn:0, col:0},
  reviews:[]             // bilans hebdo {d, note}
};
let S=null;
const todayStr=()=>new Date().toISOString().slice(0,10);
const clone=o=>JSON.parse(JSON.stringify(o));
async function persist(){ const ok=await Store.save(S); if(!ok && Store.mode==="mem"){ /* session seulement */ } }

/* ================= UTILS ================= */
const $=s=>document.querySelector(s);
const el=(tag,attrs={},html="")=>{const e=document.createElement(tag); for(const k in attrs){if(k==="class")e.className=attrs[k]; else e.setAttribute(k,attrs[k]);} e.innerHTML=html; return e;};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const r5=x=>Math.round(x/5)*5, r0=x=>Math.round(x);
const fmtD=d=>new Date(d+"T12:00").toLocaleDateString("fr-FR",{day:"numeric",month:"short"});
function avg7(arr, endDate){ // moyenne poids sur 7 jours se terminant à endDate
  const end=new Date(endDate+"T12:00"), start=new Date(end); start.setDate(start.getDate()-6);
  const w=arr.filter(x=>{const t=new Date(x.d+"T12:00"); return t>=start&&t<=end;});
  if(!w.length)return null; return w.reduce((a,b)=>a+b.kg,0)/w.length;
}

/* ================= CALCULS NUTRITION ================= */
function calcTargets(){
  const p=S.profile;
  const bmr=10*p.poids + 6.25*p.taille - 5*p.age + 5;      // Mifflin-St Jeor (homme)
  const tdee=bmr*p.activite;
  const imc=p.poids/Math.pow(p.taille/100,2);
  const ref=imc>27 ? Math.round(25*Math.pow(p.taille/100,2)*1.05) : p.poids; // poids de référence prudent
  const kcal=Math.round(tdee*(1-S.settings.deficit/100)/10)*10;
  const kcalTrain=kcal+100, kcalRest=kcal-50;
  const prot=Math.round(ref*2.0), fat=Math.round(ref*0.8);
  const carbs=k=>Math.max(0,Math.round((k-prot*4-fat*9)/4));
  const eau=Math.min(3,Math.round(p.poids*0.03*10)/10);
  return {bmr:Math.round(bmr), tdee:Math.round(tdee), imc:Math.round(imc*10)/10, ref, kcal, kcalTrain, kcalRest, prot, fat,
          carbsTrain:carbs(kcalTrain), carbsRest:carbs(kcalRest), fibres:"30–40 g", eau};
}

/* ================= BASE ALIMENTS LOCALE (pour 100 g, cru sauf mention) ================= */
const FOODS=[
 {id:"oeuf",n:"Œuf entier",kcal:143,p:12.6,c:0.7,l:9.9,note:"1 œuf ≈ 60 g"},
 {id:"poulet",n:"Blanc de poulet (cru)",kcal:106,p:22,c:0,l:1.8,note:"cuit ≈ −25 % de poids"},
 {id:"dinde",n:"Escalope de dinde (crue)",kcal:105,p:24,c:0,l:1},
 {id:"steak5",n:"Steak haché 5 % (cru)",kcal:129,p:21,c:0,l:5},
 {id:"cabillaud",n:"Cabillaud (cru)",kcal:82,p:18,c:0,l:0.7},
 {id:"saumon",n:"Saumon (cru)",kcal:200,p:20,c:0,l:13},
 {id:"thon",n:"Thon au naturel (égoutté)",kcal:110,p:25,c:0,l:1},
 {id:"sardines",n:"Sardines huile (égouttées)",kcal:210,p:25,c:0,l:12},
 {id:"fb0",n:"Fromage blanc 0 %",kcal:47,p:8,c:4,l:0.2},
 {id:"skyr",n:"Skyr nature",kcal:57,p:10,c:4,l:0.2},
 {id:"yg",n:"Yaourt grec nature",kcal:97,p:9,c:3.5,l:5},
 {id:"lait",n:"Lait demi-écrémé",kcal:46,p:3.2,c:4.8,l:1.5,note:"100 ml"},
 {id:"whey",n:"Whey protéine (poudre)",kcal:380,p:75,c:8,l:6,note:"1 dose ≈ 30 g"},
 {id:"riz",n:"Riz blanc (cru)",kcal:350,p:7,c:78,l:0.6,note:"cuit ≈ ×2,8 en poids"},
 {id:"rizc",n:"Riz blanc (cuit)",kcal:130,p:2.6,c:28,l:0.2},
 {id:"pates",n:"Pâtes (crues)",kcal:360,p:12,c:72,l:1.5,note:"cuites ≈ ×2,4"},
 {id:"patesc",n:"Pâtes (cuites)",kcal:150,p:5,c:30,l:0.9},
 {id:"pdt",n:"Pommes de terre (crues)",kcal:80,p:2,c:17,l:0.1,note:"vapeur : poids ≈ stable"},
 {id:"avoine",n:"Flocons d'avoine",kcal:370,p:13,c:60,l:7,f:10},
 {id:"pain",n:"Pain complet",kcal:250,p:9,c:43,l:3.5,f:7},
 {id:"lentilles",n:"Lentilles (cuites)",kcal:115,p:9,c:17,l:0.4,f:8,note:"crues ≈ ÷2,4"},
 {id:"poisch",n:"Pois chiches (cuits)",kcal:140,p:8,c:21,l:2.5,f:7},
 {id:"legumes",n:"Légumes verts (moyenne)",kcal:30,p:2,c:4,l:0.2,f:3},
 {id:"tomate",n:"Tomate",kcal:18,p:0.9,c:3.5,l:0.2},
 {id:"banane",n:"Banane",kcal:90,p:1,c:20,l:0.3,f:2.6},
 {id:"pomme",n:"Pomme",kcal:52,p:0.3,c:12,l:0.2,f:2.4},
 {id:"ho",n:"Huile d'olive",kcal:900,p:0,c:0,l:100},
 {id:"amandes",n:"Amandes",kcal:600,p:21,c:8,l:52,f:12},
 {id:"noix",n:"Noix",kcal:650,p:15,c:7,l:63,f:7},
 {id:"beurre",n:"Beurre",kcal:740,p:0.7,c:0.6,l:82},
 {id:"fromage",n:"Emmental",kcal:380,p:28,c:1,l:29},
 {id:"jambon",n:"Jambon blanc",kcal:110,p:20,c:1,l:3},
 {id:"muesli",n:"Muesli sans sucre ajouté",kcal:380,p:10,c:62,l:8,f:8},
 {id:"miel",n:"Miel",kcal:320,p:0.3,c:80,l:0}
];
const food=id=>FOODS.find(f=>f.id===id);
function macro(items){ // items: [{id,g}]
  let t={kcal:0,p:0,c:0,l:0,f:0};
  items.forEach(it=>{const f=food(it.id); if(!f)return; const k=it.g/100;
    t.kcal+=f.kcal*k; t.p+=f.p*k; t.c+=f.c*k; t.l+=f.l*k; t.f+=(f.f||0)*k;});
  for(const k in t)t[k]=Math.round(t[k]); return t;
}

/* ================= BLOCS REPAS INTERCHANGEABLES ================= */
const MEALS={
 pd:[ // petits-déjeuners
  {n:"Avoine · lait · whey · banane · amandes", items:[{id:"avoine",g:90},{id:"lait",g:250},{id:"whey",g:30},{id:"banane",g:100},{id:"amandes",g:15}]},
  {n:"3 œufs · pain complet · pomme", items:[{id:"oeuf",g:180},{id:"pain",g:100},{id:"pomme",g:150},{id:"fb0",g:150}]},
  {n:"Skyr · avoine · amandes · fruit", items:[{id:"skyr",g:300},{id:"avoine",g:75},{id:"amandes",g:15},{id:"banane",g:100}]},
  {n:"Fromage blanc · muesli · miel", items:[{id:"fb0",g:300},{id:"muesli",g:70},{id:"miel",g:15},{id:"amandes",g:10}]}
 ],
 dj:[ // déjeuners
  {n:"Poulet · riz · légumes · huile", items:[{id:"poulet",g:200},{id:"riz",g:120},{id:"legumes",g:250},{id:"ho",g:15}]},
  {n:"Steak 5 % · pâtes · légumes", items:[{id:"steak5",g:180},{id:"pates",g:120},{id:"legumes",g:250},{id:"ho",g:8}]},
  {n:"Thon · lentilles · légumes · huile", items:[{id:"thon",g:160},{id:"lentilles",g:250},{id:"legumes",g:250},{id:"ho",g:12},{id:"pain",g:50}]},
  {n:"Dinde · pommes de terre · légumes", items:[{id:"dinde",g:200},{id:"pdt",g:450},{id:"legumes",g:250},{id:"ho",g:15}]}
 ],
 dn:[ // dîners
  {n:"Cabillaud · riz · légumes · huile", items:[{id:"cabillaud",g:200},{id:"riz",g:100},{id:"legumes",g:250},{id:"ho",g:15},{id:"fb0",g:200}]},
  {n:"Poulet · pommes de terre · légumes", items:[{id:"poulet",g:190},{id:"pdt",g:400},{id:"legumes",g:250},{id:"ho",g:15}]},
  {n:"Omelette 3 œufs · jambon · pain · salade", items:[{id:"oeuf",g:180},{id:"jambon",g:60},{id:"pain",g:90},{id:"legumes",g:200},{id:"ho",g:8}]},
  {n:"Saumon · pâtes · légumes", items:[{id:"saumon",g:170},{id:"pates",g:100},{id:"legumes",g:250}]}
 ],
 col:[ // collations
  {n:"Skyr · amandes", items:[{id:"skyr",g:250},{id:"amandes",g:20}]},
  {n:"Whey · banane", items:[{id:"whey",g:30},{id:"banane",g:120}]},
  {n:"Fromage blanc · fruit · noix", items:[{id:"fb0",g:250},{id:"pomme",g:150},{id:"noix",g:15}]}
 ]
};
const SUBS=[
 ["Poulet 180 g","dinde 180 g · cabillaud 220 g · steak 5 % 160 g · thon 150 g · 4 œufs (jour sans autre source grasse)"],
 ["Riz 100 g cru","pâtes 100 g crues · pommes de terre 450 g · lentilles cuites 300 g · pain complet 140 g"],
 ["Fromage blanc 0 %","skyr (même poids) · yaourt grec (réduire l'huile de 5 g)"],
 ["Huile d'olive 10 g","beurre 10 g · 15 g d'amandes ou de noix"],
 ["Banane 100 g","pomme 180 g · 2 kiwis · 150 g de fruits rouges"],
 ["Légumes verts","tous légumes non féculents, à volonté raisonnable (250 g et +)"]
];
/* ================= BASE EXERCICES (3 variantes : salle / haltères / minimal) ================= */
/* inc = palier de progression conseillé (kg). contra = limitation qui déclenche l'alternative. */
const EXOS={
 squat:{n:"Squat",m:"Quadriceps",s:"Fessiers, gainage",sets:3,reps:[8,12],rest:150,tempo:"2-0-1",inc:5,
  v:{salle:["Squat barre ou goblet squat","Barre / haltère"],halteres:["Goblet squat","1 haltère ou kettlebell"],minimal:["Squat poids du corps → squat bulgare","Aucun / sac lesté"]},
  cues:"Pieds largeur épaules, descends en gardant le dos neutre et les talons au sol, cuisses au moins parallèles.",err:"Talons qui décollent, genoux qui rentrent, dos qui s'arrondit en bas.",easy:"Squat sur box / amplitude réduite",hard:"Squat barre, pause 2 s en bas",
  contra:{genou:"Presse à cuisses amplitude confortable ou squat box haut", dos:"Goblet squat léger, torse très droit"}},
 rdl:{n:"Soulevé de terre roumain",m:"Ischio-jambiers",s:"Fessiers, lombaires",sets:3,reps:[8,12],rest:150,tempo:"3-0-1",inc:5,
  v:{salle:["SDT roumain barre","Barre"],halteres:["SDT roumain haltères","2 haltères"],minimal:["Pont fessier / hip thrust au sol","Aucun / sac"]},
  cues:"Genoux légèrement fléchis, pousse les hanches vers l'arrière, dos neutre, barre proche des jambes, remonte en serrant les fessiers.",err:"Dos arrondi, barre loin du corps, transformer en squat.",easy:"Pont fessier",hard:"SDT roumain une jambe",
  contra:{dos:"Leg curl machine ou pont fessier (colonne peu chargée)"}},
 fentes:{n:"Fentes / squat bulgare",m:"Quadriceps, fessiers",s:"Ischios, équilibre",sets:3,reps:[8,12],rest:120,tempo:"2-0-1",inc:2,
  v:{salle:["Fentes haltères ou presse unilatérale","Haltères"],halteres:["Squat bulgare haltères","2 haltères + banc/chaise"],minimal:["Fentes poids du corps","Aucun"]},
  cues:"Grand pas, descends verticalement, genou avant aligné avec le pied.",err:"Pas trop court, genou qui part en dedans, buste qui s'effondre.",easy:"Fentes statiques sans charge",hard:"Squat bulgare lesté",
  contra:{genou:"Amplitude réduite ou presse à cuisses légère"}},
 legcurl:{n:"Leg curl / ischio ciblé",m:"Ischio-jambiers",s:"Mollets",sets:3,reps:[10,15],rest:90,tempo:"2-1-1",inc:2.5,
  v:{salle:["Leg curl machine","Machine"],halteres:["Leg curl haltère entre les pieds (au sol)","1 haltère"],minimal:["Leg curl glissé (serviette) ou nordic assisté","Serviette / sol lisse"]},
  cues:"Fléchis les genoux en contrôlant, contracte l'ischio 1 s en haut.",err:"Cambrer les lombaires, mouvement balistique.",easy:"Pont fessier talons surélevés",hard:"Nordic curl excentrique"},
 mollets:{n:"Mollets debout",m:"Mollets",s:"—",sets:3,reps:[12,20],rest:75,tempo:"1-2-1",inc:2.5,
  v:{salle:["Mollets machine ou à la presse","Machine"],halteres:["Mollets debout haltères, marche d'escalier","Haltères"],minimal:["Mollets une jambe sur une marche","Marche"]},
  cues:"Amplitude complète : étirement en bas 2 s, contraction en haut.",err:"Rebondir, amplitude partielle.",easy:"Deux jambes sans charge",hard:"Une jambe lestée"},
 dc:{n:"Développé couché",m:"Pectoraux",s:"Épaules avant, triceps",sets:3,reps:[8,12],rest:150,tempo:"2-0-1",inc:2.5,
  v:{salle:["Développé couché barre","Barre + banc"],halteres:["Développé couché haltères","2 haltères + banc (ou sol)"],minimal:["Pompes (progression : surélevées, lestées)","Aucun"]},
  cues:"Omoplates serrées, pieds au sol, descends la barre vers la ligne des tétons, coudes ~45°.",err:"Rebond sur la poitrine, fesses qui décollent, coudes trop écartés.",easy:"Pompes sur les genoux / mains surélevées",hard:"Pause 1 s en bas, pieds surélevés (pompes)",
  contra:{epaule:"Prise plus serrée, amplitude réduite, ou développé haltères prise neutre"}},
 dci:{n:"Développé incliné",m:"Haut des pectoraux",s:"Épaules, triceps",sets:3,reps:[8,12],rest:120,tempo:"2-0-1",inc:2,
  v:{salle:["Développé incliné haltères ou barre","Banc incliné 30°"],halteres:["Développé incliné haltères","Banc / coussins"],minimal:["Pompes pieds surélevés","Chaise"]},
  cues:"Inclinaison 30°, mêmes repères que le développé couché.",err:"Banc trop incliné (ça devient des épaules).",easy:"Pompes standard",hard:"Tempo 3-1-1",
  contra:{epaule:"Amplitude confortable, prise neutre"}},
 devmil:{n:"Développé militaire",m:"Épaules",s:"Triceps, gainage",sets:3,reps:[8,12],rest:120,tempo:"2-0-1",inc:2,
  v:{salle:["Développé militaire barre ou haltères","Barre / haltères"],halteres:["Développé épaules haltères assis ou debout","2 haltères"],minimal:["Pompes piquées (pike push-up)","Aucun"]},
  cues:"Gainage serré, pousse au-dessus de la tête sans cambrer, tête qui passe « à travers la fenêtre » en haut.",err:"Cambrure lombaire excessive, demi-amplitude.",easy:"Développé assis dossier",hard:"Pompes piquées pieds surélevés",
  contra:{epaule:"Prise neutre, amplitude sans douleur ; sinon élévations latérales légères"}},
 lat:{n:"Élévations latérales",m:"Épaules (faisceau moyen)",s:"Trapèzes",sets:3,reps:[12,20],rest:75,tempo:"1-1-2",inc:1,
  v:{salle:["Élévations latérales haltères ou poulie","Haltères"],halteres:["Élévations latérales haltères","2 haltères légers"],minimal:["Élévations latérales élastique","Élastique"]},
  cues:"Coudes légèrement fléchis, monte jusqu'à l'horizontale, redescends lentement.",err:"Balancer le buste, monter trop haut, charge trop lourde.",easy:"Un bras à la fois",hard:"Tempo lent 1-1-3"},
 rowing:{n:"Rowing buste penché",m:"Dos (largeur/épaisseur)",s:"Biceps, arrière d'épaule",sets:3,reps:[8,12],rest:120,tempo:"2-0-1",inc:2.5,
  v:{salle:["Rowing barre ou machine","Barre / machine"],halteres:["Rowing haltère unilatéral (main sur banc)","1 haltère + appui"],minimal:["Rowing élastique ou rowing inversé sous une table","Élastique / table solide"]},
  cues:"Dos neutre, tire le coude vers la hanche, serre les omoplates 1 s.",err:"Dos arrondi, tirer avec les bras seulement, élan du buste.",easy:"Rowing appuyé poitrine (banc incliné)",hard:"Pause 2 s en contraction",
  contra:{dos:"Rowing unilatéral avec appui ou rowing machine poitrine soutenue"}},
 tirage:{n:"Tirage vertical / tractions",m:"Dos (grand dorsal)",s:"Biceps",sets:3,reps:[6,12],rest:120,tempo:"2-0-1",inc:2.5,
  v:{salle:["Tirage poulie haute ou tractions assistées","Poulie / machine"],halteres:["Pull-over haltère + rowing serré","1 haltère + banc"],minimal:["Tractions (ou élastique porte / tirage élastique)","Barre de traction / élastique"]},
  cues:"Tire la barre vers le haut de la poitrine, coudes vers le bas, sans élan.",err:"Se pencher trop en arrière, demi-amplitude.",easy:"Tractions assistées élastique / tirage plus léger",hard:"Tractions lestées",
  contra:{epaule:"Prise neutre, amplitude confortable"}},
 facepull:{n:"Face pull / oiseau",m:"Arrière d'épaule",s:"Trapèzes, coiffe",sets:3,reps:[12,20],rest:75,tempo:"1-1-2",inc:1,
  v:{salle:["Face pull poulie","Poulie + corde"],halteres:["Oiseau haltères buste penché","2 haltères légers"],minimal:["Face pull élastique","Élastique"]},
  cues:"Tire vers le visage en écartant les mains, omoplates serrées.",err:"Trop lourd, élan du buste.",easy:"Oiseau appuyé front sur banc",hard:"Pause 2 s"},
 curl:{n:"Curl biceps",m:"Biceps",s:"Avant-bras",sets:3,reps:[10,15],rest:75,tempo:"2-0-1",inc:1,
  v:{salle:["Curl barre ou haltères","Barre / haltères"],halteres:["Curl haltères alterné ou marteau","2 haltères"],minimal:["Curl élastique","Élastique"]},
  cues:"Coudes fixes le long du corps, contrôle la descente.",err:"Balancer le buste, coudes qui avancent.",easy:"Curl assis dossier",hard:"Tempo 3-0-1"},
 triceps:{n:"Extension triceps",m:"Triceps",s:"—",sets:3,reps:[10,15],rest:75,tempo:"2-0-1",inc:1,
  v:{salle:["Extension poulie ou barre front","Poulie / barre EZ"],halteres:["Extension nuque haltère ou barre front haltères","1–2 haltères"],minimal:["Dips entre deux chaises / pompes prise serrée","Chaises"]},
  cues:"Coudes fixes, étends complètement sans verrouiller brutalement.",err:"Coudes qui s'écartent, charge trop lourde.",easy:"Pompes prise serrée genoux",hard:"Dips lestés",
  contra:{epaule:"Éviter dips profonds : extension poulie/haltère"}},
 gainf:{n:"Gainage frontal",m:"Abdominaux profonds",s:"Épaules, fessiers",sets:3,reps:[30,60],rest:60,tempo:"—",inc:0,time:true,
  v:{salle:["Planche frontale","Tapis"],halteres:["Planche frontale","Tapis"],minimal:["Planche frontale","Sol"]},
  cues:"Coudes sous les épaules, bassin rétroversé, corps aligné, respire.",err:"Bassin qui tombe ou fesses trop hautes, apnée.",easy:"Planche sur les genoux",hard:"Planche bras tendus + touches d'épaules"},
 gainl:{n:"Gainage latéral",m:"Obliques",s:"Moyen fessier",sets:2,reps:[20,45],rest:45,tempo:"—",inc:0,time:true,perSide:true,
  v:{salle:["Planche latérale","Tapis"],halteres:["Planche latérale","Tapis"],minimal:["Planche latérale","Sol"]},
  cues:"Coude sous l'épaule, hanches hautes et alignées, chaque côté.",err:"Hanche qui s'affaisse.",easy:"Genoux au sol",hard:"Pied surélevé"},
 deadbug:{n:"Dead bug",m:"Abdominaux profonds",s:"Coordination",sets:3,reps:[8,12],rest:60,tempo:"lent",inc:0,perSide:true,
  v:{salle:["Dead bug","Tapis"],halteres:["Dead bug","Tapis"],minimal:["Dead bug","Sol"]},
  cues:"Dos plaqué au sol, souffle en allongeant bras et jambe opposés.",err:"Lombaires qui décollent, aller trop vite.",easy:"Jambes seules",hard:"Élastique entre mains et pieds"},
 pallof:{n:"Pallof press",m:"Gainage anti-rotation",s:"Obliques",sets:3,reps:[10,12],rest:60,tempo:"lent",inc:0,perSide:true,
  v:{salle:["Pallof press poulie","Poulie"],halteres:["Pallof press élastique","Élastique"],minimal:["Pallof press élastique","Élastique + point d'ancrage"]},
  cues:"Tends les bras devant toi et résiste à la rotation, gainage serré.",err:"Épaules qui montent, buste qui tourne.",easy:"Plus près de l'ancrage",hard:"Plus loin, tempo 3 s"},
 crunchp:{n:"Crunch contrôlé / poulie",m:"Grand droit",s:"—",sets:3,reps:[10,15],rest:60,tempo:"2-1-2",inc:2.5,
  v:{salle:["Crunch à la poulie haute","Poulie + corde"],halteres:["Crunch au sol lesté (haltère sur la poitrine)","Haltère léger"],minimal:["Crunch au sol contrôlé","Sol"]},
  cues:"Enroule la colonne vertèbre par vertèbre, souffle en montant.",err:"Tirer sur la nuque, utiliser les hanches.",easy:"Amplitude réduite",hard:"Tempo plus lent / +charge"},
 releves:{n:"Relevés de genoux",m:"Bas des abdominaux",s:"Fléchisseurs de hanche",sets:3,reps:[8,15],rest:60,tempo:"contrôlé",inc:0,
  v:{salle:["Relevés de genoux suspendu ou chaise romaine","Barre / chaise"],halteres:["Relevés de genoux allongé","Tapis"],minimal:["Relevés de genoux allongé ou assis","Sol"]},
  cues:"Enroule le bassin en fin de montée, redescends lentement.",err:"Balancement, cambrure lombaire.",easy:"Genoux fléchis, allongé",hard:"Jambes tendues suspendu"}
};

/* ================= PROGRAMMES ================= */
const PROG3=[
 {id:"A",n:"Corps entier A",ex:["squat","dc","rowing","lat","curl","gainf"]},
 {id:"B",n:"Corps entier B",ex:["rdl","devmil","tirage","fentes","triceps","gainl"]},
 {id:"C",n:"Corps entier C",ex:["fentes","dci","rowing","mollets","facepull","deadbug"]}
];
const PROG4=[
 {id:"HA",n:"Haut du corps A",ex:["dc","rowing","devmil","tirage","curl","triceps"]},
 {id:"BA",n:"Bas du corps A",ex:["squat","rdl","fentes","mollets","gainf","deadbug"]},
 {id:"HB",n:"Haut du corps B",ex:["dci","tirage","lat","facepull","curl","triceps"]},
 {id:"BB",n:"Bas du corps B",ex:["fentes","legcurl","squat","mollets","pallof","releves"]}
];
const SCHED3=[1,3,5], SCHED4=[1,2,4,6]; // jours ISO (1=lundi)
const PHASES=[
 {w:[1,2], n:"Adaptation", rir:"RIR 3–4", note:"Charges légères, priorité absolue à la technique.", vol:1, load:1},
 {w:[3,5], n:"Progression", rir:"RIR 2–3", note:"Double progression : répétitions puis charge.", vol:1, load:1},
 {w:[6,6], n:"Allègement", rir:"RIR 4+", note:"1 série en moins par exercice et charges −10 %. Aucune série difficile.", vol:-1, load:0.9},
 {w:[7,10], n:"Développement", rir:"RIR 1–3", note:"Surcharge contrôlée, jamais d'échec sur les mouvements lourds.", vol:1, load:1},
 {w:[11,11], n:"Consolidation", rir:"RIR 1–2", note:"Mêmes charges, vise de petits records de répétitions propres.", vol:1, load:1},
 {w:[12,12], n:"Évaluation", rir:"RIR 2–3", note:"Bilan : charges, mensurations, poids moyen, énergie. Le cycle suivant repart de là.", vol:1, load:1}
];
function weekNo(){ if(!S.settings.startDate) return 1;
  const d=Math.floor((new Date(todayStr())-new Date(S.settings.startDate))/(7*864e5))+1;
  return Math.min(Math.max(d,1),12); }
function phaseOf(w){ return PHASES.find(p=>w>=p.w[0]&&w<=p.w[1])||PHASES[0]; }
function program(){ return S.settings.jours===4?PROG4:PROG3; }
function sched(){ return S.settings.jours===4?SCHED4:SCHED3; }
function todaySession(){ const iso=((new Date().getDay()+6)%7)+1; const i=sched().indexOf(iso);
  return i>=0? program()[i] : null; }

/* ================= PROGRESSION (double progression) ================= */
function lastHist(exId){ const h=S.sessions[exId]; return h&&h.length? h[h.length-1] : null; }
function suggestion(exId){
  const ex=EXOS[exId], h=S.sessions[exId]||[], last=h[h.length-1];
  if(ex.time||ex.inc===0){
    if(!last) return {txt:"Commence par la version qui te laisse 2–3 répétitions (ou secondes) de marge.",kg:null};
    return {txt:"Ajoute quelques secondes ou répétitions si la dernière fois était propre.",kg:null};
  }
  if(!last||!last.sets.length) return {txt:"Première fois : choisis une charge qui laisse 3–4 répétitions en réserve (RIR 3–4) sur la 1ʳᵉ série, ajuste ensuite.",kg:null};
  const kg=Math.max(...last.sets.map(s=>+s.kg||0));
  if(last.pain) return {txt:"Douleur signalée la dernière fois : garde une charge réduite (−10 %) ou prends la variante plus facile. Stoppe si la douleur revient.",kg:Math.round(kg*0.9*2)/2};
  const allTop=last.sets.every(s=>(+s.reps||0)>=ex.reps[1] && (s.rir===""||+s.rir>=1));
  const anyFail=last.sets.some(s=>(+s.reps||0)<ex.reps[0] && +s.reps>0);
  const prev=h[h.length-2];
  const prevFail=prev && prev.sets.some(s=>(+s.reps||0)<ex.reps[0] && +s.reps>0);
  if(anyFail&&prevFail) return {txt:"2 séances difficiles de suite : réduis de 5–10 %, vérifie sommeil, récupération et technique.",kg:Math.round(kg*0.925*2)/2};
  if(anyFail) return {txt:"Garde la même charge et vise le bas de la fourchette proprement.",kg};
  if(allTop) return {txt:`Toutes les séries au maximum avec de la réserve : ajoute ~${ex.inc} kg et redescends vers ${ex.reps[0]}–${ex.reps[0]+2} répétitions.`,kg:kg+ex.inc};
  return {txt:"Même charge : essaie d'ajouter 1–2 répétitions propres par série.",kg};
}

/* ================= DÉMONSTRATIONS (ExerciseDB gratuite + repli YouTube) ================= */
const DEMO={
 squat:{salle:"barbell squat",halteres:"goblet squat",minimal:"squat"},
 rdl:{salle:"romanian deadlift",halteres:"dumbbell romanian deadlift",minimal:"glute bridge"},
 fentes:{salle:"dumbbell lunge",halteres:"bulgarian split squat",minimal:"lunge"},
 legcurl:{salle:"leg curl",halteres:"dumbbell leg curl",minimal:"sliding leg curl"},
 mollets:{salle:"calf raise",halteres:"standing calf raise",minimal:"single leg calf raise"},
 dc:{salle:"barbell bench press",halteres:"dumbbell bench press",minimal:"push up"},
 dci:{salle:"incline dumbbell press",halteres:"incline dumbbell press",minimal:"decline push up"},
 devmil:{salle:"overhead press",halteres:"dumbbell shoulder press",minimal:"pike push up"},
 lat:{salle:"dumbbell lateral raise",halteres:"dumbbell lateral raise",minimal:"band lateral raise"},
 rowing:{salle:"barbell bent over row",halteres:"one arm dumbbell row",minimal:"inverted row"},
 tirage:{salle:"lat pulldown",halteres:"dumbbell pullover",minimal:"pull up"},
 facepull:{salle:"face pull",halteres:"rear delt fly",minimal:"band face pull"},
 curl:{salle:"barbell curl",halteres:"dumbbell curl",minimal:"band biceps curl"},
 triceps:{salle:"triceps pushdown",halteres:"overhead triceps extension",minimal:"bench dip"},
 gainf:{salle:"plank",halteres:"plank",minimal:"plank"},
 gainl:{salle:"side plank",halteres:"side plank",minimal:"side plank"},
 deadbug:{salle:"dead bug",halteres:"dead bug",minimal:"dead bug"},
 pallof:{salle:"pallof press",halteres:"band pallof press",minimal:"band pallof press"},
 crunchp:{salle:"cable crunch",halteres:"crunch",minimal:"crunch"},
 releves:{salle:"hanging knee raise",halteres:"lying leg raise",minimal:"lying leg raise"}
};
function ytLink(exId,lieu){ const ex=EXOS[exId], va=(ex.v[lieu]||ex.v.salle);
  return "https://www.youtube.com/results?search_query="+encodeURIComponent(va[0]+" technique"); }
async function showDemo(exId,lieu,box){
  const term=(DEMO[exId]&&DEMO[exId][lieu])||EXOS[exId].n;
  box.innerHTML=`<div class="muted small" style="margin-top:8px">Chargement de la démonstration…</div>`;
  const fallback=()=>{ box.innerHTML=`<div class="notice small" style="margin-top:8px">Démonstration en ligne indisponible (hors ligne ou service saturé).<br><a href="${ytLink(exId,lieu)}" target="_blank" rel="noopener">▶ Voir des vidéos de démonstration sur YouTube</a></div>`; };
  let found=null;
  // 1) ExerciseDB gratuite (sans clé, usage personnel, attribution requise)
  try{
    const r=await fetchTO(`https://oss.exercisedb.dev/api/v1/exercises/search?q=${encodeURIComponent(term)}&limit=3`,7000);
    const j=await r.json();
    const list=(j&&(j.data&&j.data.exercises))||(j&&j.data)||(j&&j.exercises)||[];
    found=(Array.isArray(list)?list:[]).find(x=>x.gifUrl||x.imageUrl);
  }catch(e){}
  // 2) ExerciseDB via RapidAPI si une clé est fournie
  if(!found&&S.settings.rapidKey){
    try{
      const r=await fetchTO2(`https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(term)}?limit=3`,
        {headers:{"X-RapidAPI-Key":S.settings.rapidKey,"X-RapidAPI-Host":"exercisedb.p.rapidapi.com"}},7000);
      const j=await r.json();
      found=(Array.isArray(j)?j:[]).find(x=>x.gifUrl);
    }catch(e){}
  }
  if(found){
    const img=found.gifUrl||found.imageUrl;
    const steps=(found.instructions||[]).slice(0,4).map(x=>`<li>${esc(x)}</li>`).join("");
    box.innerHTML=`<div style="margin-top:8px"><img src="${esc(img)}" alt="Démonstration : ${esc(found.name||term)}" style="max-width:100%;border-radius:12px;border:1px solid var(--line)">
      ${steps?`<ol class="small" style="margin:8px 0 0 18px">${steps}</ol>`:""}
      <div class="tag" style="margin-top:6px">Source : ExerciseDB (oss.exercisedb.dev) · <a href="${ytLink(exId,lieu)}" target="_blank" rel="noopener">vidéos YouTube</a></div></div>`;
  } else fallback();
}
function fetchTO2(url,opts,ms){ return Promise.race([fetch(url,opts),new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")),ms))]); }

/* ================= NAVIGATION / RENDU ================= */
let TAB="dash";
function nav(t){ TAB=t; document.querySelectorAll("nav.tabs button").forEach(b=>b.classList.toggle("on",b.dataset.tab===t)); render(); window.scrollTo(0,0); }
document.querySelectorAll("nav.tabs button").forEach(b=>b.onclick=()=>nav(b.dataset.tab));
function render(){ const v=$("#view"); v.innerHTML="";
  ({dash:vDash,prog:vProg,train:vTrain,food:vFood,track:vTrack,set:vSet})[TAB](v); }

/* petit graphique SVG */
function sparkline(points, opts={}){
  if(points.length<2) return `<div class="muted small">Pas encore assez de données pour un graphique (2 points minimum).</div>`;
  const w=opts.w||600,h=opts.h||160,pad=28;
  const xs=points.map((_,i)=>i), ys=points.map(p=>p.v);
  const ymin=Math.min(...ys), ymax=Math.max(...ys), yr=(ymax-ymin)||1;
  const X=i=>pad+(w-2*pad)*i/(xs.length-1), Y=v=>h-pad-(h-2*pad)*(v-ymin)/yr;
  const path=points.map((p,i)=>`${i?"L":"M"}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ");
  const dots=points.map((p,i)=>`<circle cx="${X(i).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="3.5" fill="var(--accent)"/>`).join("");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${opts.label||"graphique"}">
    <text x="${pad}" y="16" font-size="12" fill="var(--muted)">${esc(opts.label||"")}</text>
    <text x="4" y="${Y(ymax)+4}" font-size="11" fill="var(--muted)">${ymax.toFixed(1)}</text>
    <text x="4" y="${Y(ymin)+4}" font-size="11" fill="var(--muted)">${ymin.toFixed(1)}</text>
    <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>${dots}</svg>`;
}

/* ================= ACCUEIL ================= */
function vDash(v){
  const w=weekNo(), ph=phaseOf(w), t=calcTargets(), ts=todaySession();
  const isTrain=!!ts;
  const kcalToday=isTrain?t.kcalTrain:t.kcalRest, carbsToday=isTrain?t.carbsTrain:t.carbsRest;
  const log=S.foodlog[todayStr()]||[]; const eaten=log.reduce((a,b)=>a+b.kcal,0);
  const lastW=S.weights.length?S.weights[S.weights.length-1]:null;
  const a7=avg7(S.weights,todayStr());
  if(!S.settings.startDate){
    v.appendChild(el("div",{class:"notice"},`<b>Bienvenue !</b> Ton programme de 12 semaines est prêt. Appuie sur <b>Démarrer le cycle</b> pour fixer la semaine 1 à aujourd'hui, puis pèse-toi et note ton tour de taille dans l'onglet Suivi.`));
    const b=el("button",{class:"primary big"},"Démarrer le cycle de 12 semaines");
    b.onclick=async()=>{S.settings.startDate=todayStr(); await persist(); render();};
    v.appendChild(b);
  }else{
    v.appendChild(el("div",{class:"card"},`
      <div class="spread"><div class="eyebrow">Semaine ${w} / 12</div><span class="badge blue">${ph.n} · ${ph.rir}</span></div>
      <div class="bar" style="margin:10px 0"><div style="width:${Math.round(w/12*100)}%"></div></div>
      <div class="muted small">${esc(ph.note)}</div>`));
  }
  const c=el("div",{class:"card"});
  c.innerHTML=`<div class="eyebrow">Aujourd'hui</div>
    <h2>${ts?esc(ts.n):"Repos musculation"}</h2>
    <div class="muted small" style="margin-bottom:10px">${ts?"Échauffement inclus · 45–75 min":"Marche, mobilité ou cardio léger 20–35 min (optionnel)."}</div>`;
  if(ts){const b=el("button",{class:"primary big"},"Lancer la séance guidée →"); b.onclick=()=>nav("train"); c.appendChild(b);}
  v.appendChild(c);
  v.appendChild(el("div",{class:"card"},`
    <div class="spread"><div class="eyebrow">Nutrition du jour (${isTrain?"entraînement":"repos"})</div><span class="badge ${eaten>kcalToday*1.05?"amber":"good"}">${eaten} / ${kcalToday} kcal</span></div>
    <div class="bar g" style="margin:8px 0"><div style="width:${Math.min(100,Math.round(eaten/kcalToday*100))}%"></div></div>
    <div class="row small muted"><span>Protéines&nbsp;: <b>${t.prot} g</b></span><span>Glucides&nbsp;: <b>${carbsToday} g</b></span><span>Lipides&nbsp;: <b>${t.fat} g</b></span><span>Eau&nbsp;: <b>~${t.eau} L</b></span></div>`));
  const g=el("div",{class:"grid2"});
  g.appendChild(el("div",{class:"card"},`<div class="kpi"><span class="lab">Poids (moy. 7 j)</span><b class="num">${a7?a7.toFixed(1)+" kg":"—"}</b><span class="muted small">${lastW?"Dernier : "+lastW.kg+" kg ("+fmtD(lastW.d)+")":"Ajoute une pesée dans Suivi"}</span></div>`));
  g.appendChild(el("div",{class:"card"},`<div class="kpi"><span class="lab">Objectif de pas</span><b class="num">${(S.profile.pas||6000).toLocaleString("fr-FR")}</b><span class="muted small">+1 000–2 000 progressivement, cible 7 000–10 000</span></div>`));
  v.appendChild(g);
  v.appendChild(el("div",{class:"warn"},`⚕️ Cette application ne remplace pas un médecin, un kinésithérapeute ou un diététicien. Après 40 ans et une reprise, un avis médical est recommandé avant un programme intense — obligatoire en cas de maladie cardiovasculaire, hypertension, diabète, douleur thoracique, vertiges, blessure récente ou traitement important. <b>Douleur vive, articulaire ou inhabituelle = on arrête le mouvement.</b> Les résultats ne sont jamais garantis.`));
}

/* ================= PROGRAMME ================= */
function vProg(v){
  const w=weekNo(), ph=phaseOf(w);
  const head=el("div",{class:"card"});
  head.innerHTML=`<div class="spread"><h2>Programme ${S.settings.jours} jours / semaine</h2><span class="badge blue">${ph.n}</span></div>
   <div class="muted small">Recommandé pour une reprise : <b>3 jours</b> (corps entier) pendant 4–6 semaines, puis passe à 4 jours (haut/bas) si la récupération est bonne. Change dans Réglages.</div>
   <div class="row" style="margin-top:10px">
     <span class="muted small">Jours : ${S.settings.jours===4?"lundi · mardi · jeudi · samedi":"lundi · mercredi · vendredi"} (adaptables)</span>
     <button class="chip" onclick="window.print()">Imprimer / PDF</button></div>`;
  v.appendChild(head);
  v.appendChild(el("div",{class:"card flat"},`
   <div class="eyebrow">Échauffement — avant chaque séance</div>
   <div class="small" style="margin-top:6px">1) 5–10 min d'activité légère (vélo, marche rapide, rameur). 2) Mobilité dynamique ciblée (hanches/chevilles les jours de jambes, épaules/omoplates les jours de haut). 3) <b>Séries d'approche</b> sur les gros mouvements : ①&nbsp;très léger ×10–15 → ②&nbsp;~50–60 % ×6–8 → ③&nbsp;~70–80 % ×3–5, puis séries de travail. Les séries d'approche ne comptent pas dans le volume.</div>`));
  program().forEach(sess=>{
    const d=el("details");
    d.innerHTML=`<summary>${esc(sess.n)}<span class="pill">${sess.ex.length} exercices</span></summary>`;
    sess.ex.forEach(id=>d.appendChild(exCard(id)));
    v.appendChild(d);
  });
  const plan=el("details");
  plan.innerHTML=`<summary>Planification des 12 semaines</summary>`+PHASES.map(p=>`
    <div class="spread" style="padding:8px 0;border-bottom:1px solid var(--line)">
      <div><b>Sem. ${p.w[0]===p.w[1]?p.w[0]:p.w[0]+"–"+p.w[1]}</b> · ${p.n}</div>
      <div class="small muted" style="text-align:right;max-width:60%">${p.rir}. ${esc(p.note)}</div></div>`).join("");
  v.appendChild(plan);
  const cardio=el("details");
  cardio.innerHTML=`<summary>Cardio, pas quotidiens & abdominaux</summary>
   <div class="small">
   <p style="margin:8px 0"><b>Pas :</b> pars de ton niveau actuel (~${(S.profile.pas||6000).toLocaleString("fr-FR")}), ajoute 1 000–2 000 pas quand c'est facile, cible 7 000–10 000/jour selon récupération.</p>
   <p style="margin:8px 0"><b>Cardio (optionnel) :</b> 2 séances de 20–35 min à intensité modérée (tu peux encore parler en phrases courtes) — marche rapide, vélo, rameur ou elliptique. Pas la veille ni le jour d'une grosse séance de jambes si tes cuisses récupèrent mal.</p>
   <p style="margin:8px 0"><b>Abdominaux :</b> déjà intégrés 2–3 ×/semaine (gainage frontal & latéral, dead bug, Pallof, crunch contrôlé, relevés de genoux). Progression : + temps ou + répétitions, puis variante plus dure. ⚠️ Les exercices d'abdos ne font <b>pas</b> fondre localement la graisse du ventre : les abdos visibles viennent surtout de la baisse du taux de graisse global, de la génétique et de la régularité sur plusieurs mois.</p></div>`;
  v.appendChild(cardio);
  const rm=el("details");
  rm.innerHTML=`<summary>Charges, 1RM estimé & progression</summary>
   <div class="small">
   <p style="margin:8px 0"><b>Charge de départ :</b> jamais de chiffre universel. Choisis une charge qui laisse ~2–4 répétitions en réserve (RIR 2–4) en fin de série, technique parfaite.</p>
   <p style="margin:8px 0"><b>Double progression :</b> même charge tant que tu n'atteins pas le haut de la fourchette sur toutes les séries. Quand c'est fait avec 1–2 répétitions en réserve → +1–2 kg/haltère ou +2,5–5 kg (haut du corps), +2,5–5 kg (bas du corps), plus petit palier possible en isolation. Au poids du corps : + répétitions, puis variante plus dure ou petite charge.</p>
   <p style="margin:8px 0"><b>1RM estimé (Epley, indicatif seulement) :</b> 1RM ≈ charge × (1 + reps ÷ 30). Ne teste jamais un vrai maxi en reprise ; le programme se pilote au RIR et à la technique, pas au 1RM.</p>
   <p style="margin:8px 0"><b>Échec 2 séances de suite :</b> garde ou baisse la charge de 5–10 %, vérifie sommeil, récupération, volume, technique — ou prends la variante plus simple.</p></div>`;
  v.appendChild(rm);
}
function limitFor(exId){ const ex=EXOS[exId]; if(!ex.contra)return null;
  for(const lim of S.settings.limitations){ if(ex.contra[lim]) return {lim, alt:ex.contra[lim]}; } return null; }
function exCard(id){
  const ex=EXOS[id], lieu=S.settings.lieu, va=ex.v[lieu]||ex.v.salle, lim=limitFor(id);
  const d=el("div",{class:"card flat"});
  d.innerHTML=`<div class="spread"><h3>${esc(ex.n)}</h3><span class="pill">${ex.sets} × ${ex.reps[0]}–${ex.reps[1]}${ex.time?" s":""}${ex.perSide?" / côté":""}</span></div>
   <div class="small muted">${esc(ex.m)} · secondaires : ${esc(ex.s)} · repos ${ex.rest}s · tempo ${ex.tempo}</div>
   <div class="small" style="margin-top:6px"><b>${esc(va[0])}</b> <span class="muted">(${esc(va[1])})</span></div>
   ${lim?`<div class="warn small" style="margin:8px 0">⚠️ Limitation « ${lim.lim} » : privilégie → ${esc(lim.alt)}</div>`:""}
   <div class="small" style="margin-top:6px">✅ ${esc(ex.cues)}</div>
   <div class="small muted" style="margin-top:4px">✖ Erreurs : ${esc(ex.errors||ex.err)}</div>
   <div class="small muted" style="margin-top:4px">↓ Plus facile : ${esc(ex.easy)} · ↑ Plus difficile : ${esc(ex.hard)}</div>`;
  const demoBox=el("div"); const bDemo=el("button",{class:"chip",style:"margin-top:8px"},"🎬 Démonstration");
  bDemo.onclick=()=>showDemo(id,lieu,demoBox);
  d.appendChild(bDemo); d.appendChild(demoBox);
  return d;
}
/* ================= SÉANCE GUIDÉE ================= */
let LIVE=null; // {sid, lieu, start, data:{exId:{sets:[{kg,reps,rir,done}],pain,variant}}}
function vTrain(v){
  const w=weekNo(), ph=phaseOf(w);
  if(!LIVE){
    const ts=todaySession();
    const c=el("div",{class:"card"});
    c.innerHTML=`<h2>Séance guidée</h2><div class="muted small">Semaine ${w} · phase ${ph.n} (${ph.rir})${ph.load<1?" · <b>allègement : −10 % de charge, 1 série en moins</b>":""}</div>
      <label class="f"><span>Séance</span><select id="selSess">${program().map(s=>`<option value="${s.id}" ${ts&&ts.id===s.id?"selected":""}>${esc(s.n)}</option>`).join("")}</select></label>
      <label class="f"><span>Lieu du jour (les exercices s'adaptent)</span>
        <div class="sw" id="swLieu">${[["salle","Salle"],["halteres","Haltères"],["minimal","Minimal"]].map(x=>`<button data-l="${x[0]}" class="${S.settings.lieu===x[0]?"on":""}">${x[1]}</button>`).join("")}</div></label>
      <div class="notice small">Échauffement d'abord : 5–10 min léger + mobilité + séries d'approche (très léger ×10-15 → ~55 % ×6-8 → ~75 % ×3-5) sur les gros mouvements.</div>`;
    const b=el("button",{class:"primary big"},"Commencer");
    b.onclick=()=>{
      const sid=$("#selSess").value;
      LIVE={sid, lieu:S.settings.lieu, start:Date.now(), data:{}};
      render();
    };
    c.appendChild(b); v.appendChild(c);
    c.querySelectorAll("#swLieu button").forEach(btn=>btn.onclick=async()=>{S.settings.lieu=btn.dataset.l; await persist(); render();});
    // historique
    if(S.doneSessions.length){
      const h=el("details"); h.innerHTML=`<summary>Historique des séances (${S.doneSessions.length})</summary>`+
        S.doneSessions.slice(-15).reverse().map(x=>`<div class="spread small" style="padding:6px 0;border-bottom:1px solid var(--line)"><span>${fmtD(x.d)} — ${esc((program().find(p=>p.id===x.sid)||{n:x.sid}).n)}</span><span class="muted">${x.dur} min</span></div>`).join("");
      v.appendChild(h);
    }
    return;
  }
  // séance en cours
  const sess=program().find(s=>s.id===LIVE.sid)||program()[0];
  const deload=ph.load<1;
  const head=el("div",{class:"card"});
  head.innerHTML=`<div class="spread"><h2>${esc(sess.n)}</h2><span class="badge blue">${ph.rir}</span></div>
    <div class="muted small">Lieu : ${LIVE.lieu}${deload?" · Allègement (−10 %, −1 série)":""}</div>`;
  v.appendChild(head);
  sess.ex.forEach(id=>v.appendChild(liveExCard(id, deload)));
  const fin=el("button",{class:"primary big"},"Terminer et enregistrer la séance");
  fin.onclick=finishSession;
  v.appendChild(fin);
  const ab=el("button",{class:"ghost big",style:"margin-top:8px"},"Abandonner sans enregistrer");
  ab.onclick=()=>{ if(confirm("Abandonner la séance ?")){LIVE=null; render();} };
  v.appendChild(ab);
}
function liveExCard(id, deload){
  const ex=EXOS[id], va=(ex.v[LIVE.lieu]||ex.v.salle), lim=limitFor(id), sug=suggestion(id);
  const nSets=Math.max(1,ex.sets+(deload&&ex.sets>2?-1:0));
  if(!LIVE.data[id]) LIVE.data[id]={sets:Array.from({length:nSets},()=>({kg:"",reps:"",rir:"",done:false})),pain:false,variant:va[0]};
  const st=LIVE.data[id];
  const d=el("div",{class:"card"});
  const last=lastHist(id);
  let sugKg=sug.kg; if(deload&&sugKg)sugKg=Math.round(sugKg*0.9*2)/2;
  d.innerHTML=`<div class="spread"><h3>${esc(st.variant)}</h3><span class="pill">${nSets} × ${ex.reps[0]}–${ex.reps[1]}${ex.time?" s":""}${ex.perSide?" /côté":""}</span></div>
   <div class="small muted">${esc(ex.m)} · repos ${ex.rest}s · tempo ${ex.tempo}</div>
   ${lim?`<div class="warn small" style="margin:6px 0">⚠️ ${lim.lim} : ${esc(lim.alt)}</div>`:""}
   <div class="notice small" style="margin:8px 0"><b>Suggestion :</b> ${esc(sug.txt)}${sugKg?` <b>(~${sugKg} kg)</b>`:""}</div>
   ${last?`<div class="small muted">Dernière fois : ${last.sets.map(s=>`${s.kg||0}kg×${s.reps||0}`).join(" · ")}${last.pain?" · ⚠️ douleur":""}</div>`:""}
   <details class="small" style="margin:8px 0"><summary>Technique & variantes</summary>
     <div style="margin-top:6px">✅ ${esc(ex.cues)}</div><div class="muted" style="margin-top:4px">✖ ${esc(ex.err)}</div>
     <div class="muted" style="margin-top:4px">↓ ${esc(ex.easy)} · ↑ ${esc(ex.hard)}</div></details>
   <div class="setrow small muted" style="margin-top:8px"><span>#</span><span>kg</span><span>${ex.time?"sec":"reps"}</span><span>RIR</span><span></span></div>`;
  st.sets.forEach((s,i)=>{
    const row=el("div",{class:"setrow"});
    row.innerHTML=`<span class="muted num">${i+1}</span>
      <input inputmode="decimal" placeholder="${sugKg||"—"}" value="${s.kg}" data-f="kg">
      <input inputmode="numeric" placeholder="${ex.reps[0]}–${ex.reps[1]}" value="${s.reps}" data-f="reps">
      <input inputmode="numeric" placeholder="2" value="${s.rir}" data-f="rir">
      <button class="done ${s.done?"on":""}" aria-label="Série terminée">✓</button>`;
    row.querySelectorAll("input").forEach(inp=>inp.oninput=()=>{s[inp.dataset.f]=inp.value;});
    row.querySelector(".done").onclick=e=>{ s.done=!s.done; e.target.classList.toggle("on",s.done); if(s.done)startTimer(ex.rest); };
    d.appendChild(row);
  });
  const acts=el("div",{class:"row",style:"margin-top:10px"});
  const bPain=el("button",{class:"chip "+(st.pain?"danger":"")},st.pain?"⚠️ Douleur signalée":"Signaler une douleur");
  bPain.onclick=()=>{ st.pain=!st.pain;
    if(st.pain) alert("Douleur vive, articulaire, électrique ou inhabituelle : arrête cet exercice aujourd'hui. Une gêne musculaire normale peut passer avec une variante plus légère. Si la douleur persiste plusieurs jours, consulte un professionnel de santé.");
    render(); };
  const bEasy=el("button",{class:"chip"},"Trop difficile → variante");
  bEasy.onclick=()=>{ st.variant=ex.easy; render(); };
  const bDemo=el("button",{class:"chip"},"🎬 Démo");
  const demoBox=el("div");
  bDemo.onclick=()=>showDemo(id,LIVE.lieu,demoBox);
  const bSwap=el("button",{class:"chip"},"Remplacer");
  bSwap.onclick=()=>{ const alt=prompt("Nom de l'exercice de remplacement :", st.variant); if(alt){st.variant=alt; render();} };
  acts.append(bDemo,bPain,bEasy,bSwap); d.appendChild(acts); d.appendChild(demoBox);
  return d;
}
async function finishSession(){
  const dur=Math.round((Date.now()-LIVE.start)/60000);
  const d=todayStr();
  for(const exId in LIVE.data){
    const st=LIVE.data[exId];
    const sets=st.sets.filter(s=>s.done||s.reps||s.kg).map(s=>({kg:s.kg,reps:s.reps,rir:s.rir}));
    if(!sets.length&&!st.pain)continue;
    (S.sessions[exId]=S.sessions[exId]||[]).push({d,sets,pain:st.pain,variant:st.variant});
  }
  S.doneSessions.push({d,sid:LIVE.sid,dur});
  LIVE=null; await persist();
  alert("Séance enregistrée 💪 Les suggestions de charge de la prochaine séance sont à jour.");
  nav("dash");
}
/* minuteur */
let TMR=null;
function startTimer(sec){
  const ov=$("#timerOverlay"); ov.classList.add("show");
  let total=sec, left=sec;
  const draw=()=>{ $("#timerTxt").textContent=`${Math.floor(left/60)}:${String(left%60).padStart(2,"0")}`;
    $("#ringFg").style.strokeDashoffset=628*(1-left/total); };
  draw();
  clearInterval(TMR);
  TMR=setInterval(()=>{ left--; if(left<=0){stopTimer(); try{navigator.vibrate&&navigator.vibrate(200);}catch(e){} return;} draw(); },1000);
  $("#timerPlus").onclick=()=>{left+=30; total=Math.max(total,left); draw();};
  $("#timerMinus").onclick=()=>{left=Math.max(1,left-30); draw();};
  $("#timerSkip").onclick=stopTimer;
}
function stopTimer(){ clearInterval(TMR); $("#timerOverlay").classList.remove("show"); }
/* ================= NUTRITION ================= */
function vFood(v){
  const t=calcTargets(), isTrain=!!todaySession();
  const kcal=isTrain?t.kcalTrain:t.kcalRest, carbs=isTrain?t.carbsTrain:t.carbsRest;
  const log=S.foodlog[todayStr()]||[];
  const tot=log.reduce((a,b)=>({kcal:a.kcal+b.kcal,p:a.p+b.p,c:a.c+b.c,l:a.l+b.l}),{kcal:0,p:0,c:0,l:0});
  const c1=el("div",{class:"card"});
  c1.innerHTML=`<div class="spread"><h2>Objectifs du jour</h2><span class="badge ${isTrain?"blue":"good"}">${isTrain?"Jour d'entraînement":"Jour de repos"}</span></div>
   <table><tr><th></th><th>Cible</th><th>Consommé</th></tr>
   <tr><td>Calories</td><td class="num">${kcal} kcal</td><td class="num">${Math.round(tot.kcal)}</td></tr>
   <tr><td>Protéines</td><td class="num">${t.prot} g</td><td class="num">${Math.round(tot.p)} g</td></tr>
   <tr><td>Glucides</td><td class="num">${carbs} g</td><td class="num">${Math.round(tot.c)} g</td></tr>
   <tr><td>Lipides</td><td class="num">${t.fat} g</td><td class="num">${Math.round(tot.l)} g</td></tr>
   <tr><td>Fibres / Eau</td><td class="num">${t.fibres} · ~${t.eau} L</td><td class="muted small">+0,5–1 L par séance ou forte chaleur</td></tr></table>
   <div class="muted small" style="margin-top:8px">Estimation de départ (Mifflin-St Jeor : BMR ${t.bmr} kcal × activité ${S.profile.activite} = ~${t.tdee} kcal, déficit ${S.settings.deficit} %). Protéines/lipides calculés sur un poids de référence de ${t.ref} kg (IMC ${t.imc}). On ajuste toutes les 2 semaines selon la moyenne de poids — jamais sur une seule pesée.</div>`;
  v.appendChild(c1);

  /* Journal du jour */
  const cj=el("div",{class:"card"});
  cj.innerHTML=`<h2>Journal du jour</h2>
    <div class="row"><input id="foodQ" placeholder="Rechercher un aliment (ex : riz, poulet…)" style="flex:1"><button class="primary" id="foodGo">OK</button></div>
    <div class="row" style="margin-top:8px"><input id="barcode" inputmode="numeric" placeholder="Code-barres (Open Food Facts)" style="flex:1"><button id="bcGo">Scanner par code</button></div>
    <div id="foodRes"></div><hr class="sep"><div id="foodLog"></div>`;
  v.appendChild(cj);
  const renderLog=()=>{
    const lg=S.foodlog[todayStr()]||[];
    $("#foodLog").innerHTML=lg.length? lg.map((f,i)=>`<div class="foodline"><span>${esc(f.name)} <span class="muted">· ${f.g} g</span></span><span class="num small">${f.kcal} kcal · P${f.p} <button class="chip" data-del="${i}">✕</button></span></div>`).join("") : `<div class="muted small">Rien d'enregistré aujourd'hui. Recherche un aliment ou ajoute un bloc repas ci-dessous.</div>`;
    $("#foodLog").querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{ S.foodlog[todayStr()].splice(+b.dataset.del,1); await persist(); render(); });
  };
  renderLog();
  const addFood=async(name,g,per100)=>{
    const k=g/100, item={name,g,kcal:Math.round(per100.kcal*k),p:Math.round(per100.p*k),c:Math.round(per100.c*k),l:Math.round(per100.l*k)};
    (S.foodlog[todayStr()]=S.foodlog[todayStr()]||[]).push(item); await persist(); render();
  };
  const showResults=list=>{
    $("#foodRes").innerHTML=list.length? list.map((f,i)=>`<div class="foodline"><span>${esc(f.n)} <span class="tag">${f.src}</span><br><span class="muted small">${f.kcal} kcal · P${f.p} · G${f.c} · L${f.l} /100g ${f.note?"· "+esc(f.note):""}</span></span><button class="chip" data-add="${i}">+ Ajouter</button></div>`).join("") : `<div class="muted small" style="margin-top:8px">Aucun résultat.</div>`;
    $("#foodRes").querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{
      const f=list[+b.dataset.add]; const g=prompt(`Quantité en grammes pour « ${f.n} » :`,"100");
      if(g&&+g>0) addFood(f.n,+g,f);
    });
  };
  $("#foodGo").onclick=async()=>{
    const q=$("#foodQ").value.trim().toLowerCase(); if(!q)return;
    let res=FOODS.filter(f=>f.n.toLowerCase().includes(q)).map(f=>({...f,src:"local"}));
    $("#foodRes").innerHTML=`<div class="muted small" style="margin-top:8px">Recherche…</div>`;
    // Open Food Facts (sans clé) puis USDA si clé fournie — avec repli local si hors ligne
    try{
      const r=await fetchTO(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,nutriments,nutriscore_grade`,6000);
      const j=await r.json();
      (j.products||[]).forEach(p=>{ const n=p.nutriments||{};
        if(p.product_name&&n["energy-kcal_100g"]!=null) res.push({n:p.product_name,kcal:Math.round(n["energy-kcal_100g"]),p:Math.round(n.proteins_100g||0),c:Math.round(n.carbohydrates_100g||0),l:Math.round(n.fat_100g||0),src:"OFF"+(p.nutriscore_grade?" · Nutri-Score "+p.nutriscore_grade.toUpperCase():"")}); });
    }catch(e){ res.push({n:"(Open Food Facts indisponible — base locale utilisée)",kcal:0,p:0,c:0,l:0,src:"info"}); }
    if(S.settings.usdaKey){
      try{
        const r=await fetchTO(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(S.settings.usdaKey)}&query=${encodeURIComponent(q)}&pageSize=4`,6000);
        const j=await r.json();
        (j.foods||[]).forEach(f=>{ const g=n=>{const x=(f.foodNutrients||[]).find(y=>y.nutrientName&&y.nutrientName.startsWith(n)); return x?Math.round(x.value):0;};
          res.push({n:f.description,kcal:g("Energy"),p:g("Protein"),c:g("Carbohydrate"),l:g("Total lipid"),src:"USDA"}); });
      }catch(e){}
    }
    showResults(res.filter(x=>x.src!=="info"||res.length<2?true:x.src!=="info"));
  };
  $("#bcGo").onclick=async()=>{
    const code=$("#barcode").value.trim(); if(!code)return;
    $("#foodRes").innerHTML=`<div class="muted small" style="margin-top:8px">Recherche du produit…</div>`;
    try{
      const r=await fetchTO(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`,6000);
      const j=await r.json();
      if(j.status===1){ const p=j.product,n=p.nutriments||{};
        showResults([{n:p.product_name||"Produit "+code,kcal:Math.round(n["energy-kcal_100g"]||0),p:Math.round(n.proteins_100g||0),c:Math.round(n.carbohydrates_100g||0),l:Math.round(n.fat_100g||0),src:"OFF"+(p.nutriscore_grade?" · Nutri-Score "+p.nutriscore_grade.toUpperCase():""),note:p.allergens?("allergènes : "+p.allergens.replace(/en:/g,"")):""}]);
      } else $("#foodRes").innerHTML=`<div class="muted small" style="margin-top:8px">Produit introuvable sur Open Food Facts.</div>`;
    }catch(e){ $("#foodRes").innerHTML=`<div class="muted small" style="margin-top:8px">Hors ligne ou service indisponible : utilise la recherche locale.</div>`; }
  };

  /* Plan de repas interchangeables */
  const cm=el("div",{class:"card"});
  const m=S.menu;
  const blocks = m.struct==="3repas" ? [["pd","Petit-déjeuner"],["dj","Déjeuner"],["dn","Dîner"]] : [["dj","Repas 1 (midi)"],["dn","Repas 2 (soir)"],["col","Collation"]];
  let tots={kcal:0,p:0,c:0,l:0,f:0};
  cm.innerHTML=`<div class="spread"><h2>Plan de repas</h2>
    <div class="sw" style="max-width:280px"><button id="st3" class="${m.struct==="3repas"?"on":""}">3 repas</button><button id="st2" class="${m.struct==="2repas"?"on":""}">2 repas + collation</button></div></div>
    <div class="muted small" style="margin:6px 0">Chaque bloc est interchangeable (flèches). Quantités <b>crues sauf mention contraire</b>, pesées à cru. Répartis les protéines sur les prises. Avant l'entraînement : un repas digeste protéines + glucides 1h30–3h avant ; après : protéines + glucides + légumes.</div>`;
  blocks.forEach(([key,label])=>{
    const list=MEALS[key], idx=m[key]%list.length, meal=list[idx], mm=macro(meal.items);
    tots.kcal+=mm.kcal; tots.p+=mm.p; tots.c+=mm.c; tots.l+=mm.l; tots.f+=mm.f;
    const b=el("div",{class:"card flat"});
    b.innerHTML=`<div class="spread"><div><span class="eyebrow">${label}</span><h3>${esc(meal.n)}</h3></div>
      <div class="row"><button class="chip" data-prev="${key}">‹</button><button class="chip" data-next="${key}">›</button></div></div>
      ${meal.items.map(it=>{const f=food(it.id);return `<div class="foodline"><span>${esc(f.n)}${f.note?` <span class="tag">${esc(f.note)}</span>`:""}</span><span class="num small">${it.g} g</span></div>`;}).join("")}
      <div class="small muted" style="margin-top:6px"><b>${mm.kcal} kcal</b> · P ${mm.p} g · G ${mm.c} g · L ${mm.l} g · fibres ~${mm.f} g</div>
      <button class="chip" style="margin-top:8px" data-eat="${key}">Ajouter ce repas au journal</button>`;
    cm.appendChild(b);
  });
  const diff=kcal-tots.kcal;
  cm.appendChild(el("div",{class:"notice small"},`<b>Total du plan : ${tots.kcal} kcal · P ${tots.p} · G ${tots.c} · L ${tots.l} · fibres ~${tots.f} g.</b> ${Math.abs(diff)<=120?"Cohérent avec ta cible ✔":diff>0?`Il manque ~${diff} kcal : ajoute un fruit, ${Math.round(diff/3.5)} g de riz cru ou une collation.`:`~${-diff} kcal au-dessus : réduis un féculent ou l'huile.`}`));
  v.appendChild(cm);
  cm.querySelectorAll("[data-prev]").forEach(b=>b.onclick=async()=>{const k=b.dataset.prev; S.menu[k]=(S.menu[k]+MEALS[k].length-1)%MEALS[k].length; await persist(); render();});
  cm.querySelectorAll("[data-next]").forEach(b=>b.onclick=async()=>{const k=b.dataset.next; S.menu[k]=(S.menu[k]+1)%MEALS[k].length; await persist(); render();});
  cm.querySelectorAll("[data-eat]").forEach(b=>b.onclick=async()=>{
    const k=b.dataset.eat, meal=MEALS[k][S.menu[k]%MEALS[k].length], mm=macro(meal.items);
    (S.foodlog[todayStr()]=S.foodlog[todayStr()]||[]).push({name:meal.n,g:meal.items.reduce((a,x)=>a+x.g,0),...mm});
    await persist(); render();
  });
  $("#st3").onclick=async()=>{S.menu.struct="3repas"; await persist(); render();};
  $("#st2").onclick=async()=>{S.menu.struct="2repas"; await persist(); render();};

  const sub=el("details"); sub.innerHTML=`<summary>Substitutions équivalentes</summary><table>${SUBS.map(s=>`<tr><td><b>${esc(s[0])}</b></td><td class="small">${esc(s[1])}</td></tr>`).join("")}</table>
  <div class="muted small" style="margin-top:6px">Si tu choisis 2 repas : vérifie que les protéines totales restent atteignables (${t.prot} g) et que les portions restent digestes — la collation aide.</div>`;
  v.appendChild(sub);

  const courses=el("details");
  const agg={};
  blocks.forEach(([key])=>{const meal=MEALS[key][m[key]%MEALS[key].length]; meal.items.forEach(it=>{agg[it.id]=(agg[it.id]||0)+it.g*7;});});
  courses.innerHTML=`<summary>Liste de courses (menus actuels × 7 jours)</summary><table>${Object.entries(agg).map(([id,g])=>`<tr><td>${esc(food(id).n)}</td><td class="num" style="text-align:right">${g>=1000?(g/1000).toFixed(1)+" kg":Math.round(g)+" g"}</td></tr>`).join("")}</table>`;
  v.appendChild(courses);

  const comp=el("details"); comp.innerHTML=`<summary>Compléments (facultatifs)</summary><div class="small">
   <p style="margin:6px 0"><b>Whey :</b> utile seulement si l'alimentation ne couvre pas ${t.prot} g/j.</p>
   <p style="margin:6px 0"><b>Créatine monohydrate</b> (3–5 g/j) : bien étudiée ; avis médical d'abord en cas de problème rénal ou de traitement.</p>
   <p style="margin:6px 0"><b>Caféine :</b> seulement si bien tolérée, pas en fin de journée.</p>
   <p style="margin:6px 0"><b>Vitamine D / micronutriments :</b> uniquement si besoin identifié (prise de sang, avis professionnel).</p>
   <p style="margin:6px 0" class="muted">Aucun brûleur de graisse, booster douteux ou produit dopant. Les compléments ne remplacent jamais l'alimentation.</p></div>`;
  v.appendChild(comp);
}
function fetchTO(url,ms){ return Promise.race([fetch(url),new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")),ms))]); }

/* ================= SUIVI ================= */
function vTrack(v){
  const c=el("div",{class:"card"});
  c.innerHTML=`<h2>Pesée & mensurations</h2>
   <div class="row"><input id="wKg" inputmode="decimal" placeholder="Poids du matin (kg)" style="flex:1"><button class="primary" id="wAdd">Ajouter</button></div>
   <div class="row" style="margin-top:8px">
     <input id="mTaille" inputmode="decimal" placeholder="Tour de taille (cm)" style="flex:1">
     <input id="mPoit" inputmode="decimal" placeholder="Poitrine" style="flex:1"></div>
   <div class="row" style="margin-top:8px">
     <input id="mBras" inputmode="decimal" placeholder="Bras" style="flex:1">
     <input id="mCuisse" inputmode="decimal" placeholder="Cuisse" style="flex:1">
     <button id="mAdd">Enregistrer</button></div>
   <div class="muted small" style="margin-top:6px">Pèse-toi le matin à jeun, dans les mêmes conditions. Mensurations 1×/semaine. Photos facultatives, mêmes conditions. <b>Aucune décision sur une seule pesée.</b></div>`;
  v.appendChild(c);
  $("#wAdd").onclick=async()=>{const kg=parseFloat($("#wKg").value.replace(",",".")); if(!kg)return;
    S.weights=S.weights.filter(x=>x.d!==todayStr()); S.weights.push({d:todayStr(),kg}); S.weights.sort((a,b)=>a.d<b.d?-1:1); await persist(); render();};
  $("#mAdd").onclick=async()=>{const g=id=>parseFloat($(id).value.replace(",","."))||null;
    const m={d:todayStr(),taille:g("#mTaille"),poitrine:g("#mPoit"),bras:g("#mBras"),cuisse:g("#mCuisse")};
    if(!m.taille&&!m.poitrine&&!m.bras&&!m.cuisse)return; S.measures.push(m); await persist(); render();};

  if(S.weights.length){
    const pts=S.weights.slice(-30).map(x=>({v:x.kg}));
    const av=[]; S.weights.forEach(x=>{const a=avg7(S.weights,x.d); if(a)av.push({v:Math.round(a*10)/10});});
    v.appendChild(el("div",{class:"card"},sparkline(pts,{label:"Poids (30 dernières pesées, kg)"})+(av.length>1?sparkline(av.slice(-30),{label:"Moyenne glissante 7 jours (kg)"}):"")));
  }
  if(S.measures.length){
    const t=S.measures.filter(x=>x.taille).map(x=>({v:x.taille}));
    if(t.length>1)v.appendChild(el("div",{class:"card"},sparkline(t,{label:"Tour de taille (cm)"})));
    const last=S.measures[S.measures.length-1];
    v.appendChild(el("div",{class:"card flat small"},`Dernières mensurations (${fmtD(last.d)}) : taille ${last.taille||"—"} · poitrine ${last.poitrine||"—"} · bras ${last.bras||"—"} · cuisse ${last.cuisse||"—"} cm`));
  }
  /* Bilan bi-hebdo */
  const b=el("div",{class:"card"});
  b.innerHTML=`<h2>Bilan & ajustement (toutes les 2 semaines)</h2><div id="bilan"></div>
    <button class="primary" id="doBilan" style="margin-top:10px">Analyser mes 2 dernières semaines</button>`;
  v.appendChild(b);
  $("#doBilan").onclick=async()=>{
    const today=todayStr(); const d14=new Date(); d14.setDate(d14.getDate()-14);
    const a_now=avg7(S.weights,today), a_prev=avg7(S.weights,d14.toISOString().slice(0,10));
    const tNow=[...S.measures].reverse().find(x=>x.taille), tPrev=[...S.measures].filter(x=>x.taille&&new Date(x.d)<=d14).pop();
    let msg;
    if(!a_now||!a_prev){ msg="Pas assez de pesées sur 2 semaines pour décider. Pèse-toi 3–4 ×/semaine minimum et reviens."; }
    else{
      const dPct=(a_prev-a_now)/a_prev*100/2; // %/semaine
      const tailleDown=tNow&&tPrev? tNow.taille<tPrev.taille : null;
      if(dPct>=0.4&&dPct<=0.9) msg=`✔ Perte ~${dPct.toFixed(2)} %/sem (cible 0,4–0,8 %). <b>On ne change rien</b> : mêmes calories, continue la progression.`;
      else if(dPct>0.9) msg=`⚠ Perte rapide (~${dPct.toFixed(2)} %/sem). <b>Une seule action :</b> +100–200 kcal (glucides), ou réduis le cardio, ou prévois une semaine plus légère. Vérifie sommeil et énergie.`;
      else if(dPct<0.1&&tailleDown) msg=`Poids stable mais tour de taille en baisse : probable <b>recomposition corporelle</b>. Ne réduis pas les calories, continue.`;
      else if(dPct<0.15) msg=`Poids stable depuis 2 semaines. Si l'adhérence était bonne : <b>une seule action</b> — soit −100 à −200 kcal, soit +1 000–2 000 pas/jour. Jamais les deux en même temps.`;
      else msg=`Perte lente (~${dPct.toFixed(2)} %/sem) : acceptable. Option : +1 000 pas/jour avant de toucher aux calories.`;
    }
    $("#bilan").innerHTML=`<div class="notice small">${msg}</div>`;
    S.reviews.push({d:todayStr(),note:msg.replace(/<[^>]+>/g,"")}); await persist();
  };
  /* suivi hebdo tableau */
  const wk=el("details");
  const rows=[...Array(Math.min(12,Math.max(1,weekNo())))].map((_,i)=>{
    const wStart=new Date(S.settings.startDate||todayStr()); wStart.setDate(wStart.getDate()+i*7);
    const wEnd=new Date(wStart); wEnd.setDate(wEnd.getDate()+6);
    const a=avg7(S.weights,wEnd.toISOString().slice(0,10));
    const done=S.doneSessions.filter(x=>{const t=new Date(x.d); return t>=wStart&&t<=wEnd;}).length;
    return `<tr><td>S${i+1}</td><td class="num">${a?a.toFixed(1):"—"}</td><td class="num">${done}/${S.settings.jours}</td></tr>`;
  }).join("");
  wk.innerHTML=`<summary>Tableau hebdomadaire</summary><table><tr><th>Sem.</th><th>Poids moy. (kg)</th><th>Séances</th></tr>${rows}</table>
   <div class="muted small" style="margin-top:6px">À noter aussi chaque semaine (papier ou notes) : pas moyens, sommeil, faim, énergie, douleurs.</div>`;
  v.appendChild(wk);
}

/* ================= RÉGLAGES ================= */
function vSet(v){
  const p=S.profile, st=S.settings;
  const c=el("div",{class:"card"});
  c.innerHTML=`<h2>Profil</h2>
   <div class="grid2">
    <label class="f"><span>Âge</span><input id="pAge" inputmode="numeric" value="${p.age}"></label>
    <label class="f"><span>Taille (cm)</span><input id="pTaille" inputmode="numeric" value="${p.taille}"></label>
    <label class="f"><span>Poids de départ (kg)</span><input id="pPoids" inputmode="decimal" value="${p.poids}"></label>
    <label class="f"><span>Pas actuels / jour</span><input id="pPas" inputmode="numeric" value="${p.pas}"></label>
   </div>
   <label class="f"><span>Activité hors sport</span><select id="pAct">
     <option value="1.4" ${p.activite==1.4?"selected":""}>Sédentaire (bureau, peu de marche)</option>
     <option value="1.5" ${p.activite==1.5?"selected":""}>Légèrement actif (par défaut)</option>
     <option value="1.65" ${p.activite==1.65?"selected":""}>Actif (debout, beaucoup de marche)</option></select></label>
   <label class="f"><span>Déficit calorique</span><select id="pDef">
     <option value="10" ${st.deficit==10?"selected":""}>10 % (doux)</option>
     <option value="15" ${st.deficit==15?"selected":""}>15 % (recommandé)</option>
     <option value="20" ${st.deficit==20?"selected":""}>20 % (max raisonnable)</option></select></label>`;
  v.appendChild(c);
  const c2=el("div",{class:"card"});
  c2.innerHTML=`<h2>Entraînement</h2>
   <label class="f"><span>Jours par semaine</span><div class="sw"><button id="j3" class="${st.jours===3?"on":""}">3 j — Full Body</button><button id="j4" class="${st.jours===4?"on":""}">4 j — Haut/Bas</button></div></label>
   <label class="f"><span>Lieu par défaut</span><div class="sw"><button data-lieu="salle" class="${st.lieu==="salle"?"on":""}">Salle</button><button data-lieu="halteres" class="${st.lieu==="halteres"?"on":""}">Haltères</button><button data-lieu="minimal" class="${st.lieu==="minimal"?"on":""}">Minimal</button></div></label>
   <label class="f"><span>Douleurs / limitations (les exercices s'adaptent)</span>
    <div class="row">${["dos","epaule","genou"].map(l=>`<button class="chip ${st.limitations.includes(l)?"on":""}" data-lim="${l}">${l==="dos"?"Dos sensible":l==="epaule"?"Épaule sensible":"Genou sensible"}</button>`).join("")}</div></label>
   <div class="muted small">Sélectionne ce qui te concerne : le programme propose automatiquement des variantes plus sûres et te le rappelle en séance. En cas de douleur persistante, consulte.</div>
   <label class="f"><span>Date de début du cycle</span><input id="pStart" type="date" value="${st.startDate||""}"></label>`;
  v.appendChild(c2);
  const c3=el("div",{class:"card"});
  c3.innerHTML=`<h2>Données & services</h2>
   <label class="f"><span>Clé USDA FoodData Central (facultative — <a href="https://fdc.nal.usda.gov/api-key-signup" target="_blank" rel="noopener">créer une clé gratuite</a>)</span><input id="pUsda" value="${esc(st.usdaKey)}" placeholder="Stockée uniquement sur cet appareil"></label>
   <label class="f"><span>Clé RapidAPI ExerciseDB (facultative — la version gratuite oss.exercisedb.dev fonctionne <b>sans clé</b> ; <a href="https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb" target="_blank" rel="noopener">créer une clé RapidAPI</a> pour plus d'exercices)</span><input id="pRapid" value="${esc(st.rapidKey||"")}" placeholder="Stockée uniquement sur cet appareil"></label>
   <div class="muted small">Open Food Facts fonctionne sans clé. Tout est stocké <b>localement sur ton appareil</b> (${Store.mode==="mem"?"⚠ mémoire de session uniquement ici — exporte régulièrement":"stockage local actif"}) : aucune donnée n'est envoyée à un serveur, sauf tes recherches d'aliments (OFF/USDA) et de démonstrations (ExerciseDB).</div>
   <div class="row" style="margin-top:10px">
    <button id="expJson">Exporter la sauvegarde (JSON)</button>
    <button id="expCsv">Exporter poids + séances (CSV)</button>
    <button id="impJson">Importer une sauvegarde</button>
    <button class="danger" id="reset">Tout réinitialiser</button></div>
   <input type="file" id="impFile" accept=".json" style="display:none">`;
  v.appendChild(c3);
  const save=async()=>{ p.age=+$("#pAge").value||40; p.taille=+$("#pTaille").value||180; p.poids=+$("#pPoids").value||95;
    p.pas=+$("#pPas").value||6000; p.activite=+$("#pAct").value; st.deficit=+$("#pDef").value;
    st.usdaKey=$("#pUsda").value.trim(); st.rapidKey=$("#pRapid").value.trim(); st.startDate=$("#pStart").value||st.startDate; await persist(); };
  ["pAge","pTaille","pPoids","pPas","pAct","pDef","pUsda","pRapid","pStart"].forEach(id=>$("#"+id).onchange=save);
  $("#j3").onclick=async()=>{st.jours=3; await persist(); render();};
  $("#j4").onclick=async()=>{st.jours=4; await persist(); render();};
  c2.querySelectorAll("[data-lieu]").forEach(b=>b.onclick=async()=>{st.lieu=b.dataset.lieu; await persist(); render();});
  c2.querySelectorAll("[data-lim]").forEach(b=>b.onclick=async()=>{const l=b.dataset.lim;
    st.limitations=st.limitations.includes(l)?st.limitations.filter(x=>x!==l):[...st.limitations,l]; await persist(); render();});
  $("#expJson").onclick=()=>dl("coach-perso-sauvegarde.json",JSON.stringify(S,null,1),"application/json");
  $("#expCsv").onclick=()=>{
    let csv="type;date;valeur1;valeur2;valeur3\n";
    S.weights.forEach(w=>csv+=`poids;${w.d};${w.kg};;\n`);
    S.doneSessions.forEach(x=>csv+=`seance;${x.d};${x.sid};${x.dur} min;\n`);
    for(const ex in S.sessions) S.sessions[ex].forEach(h=>csv+=`exercice;${h.d};${ex};${h.sets.map(s=>s.kg+"kgx"+s.reps).join("|")};${h.pain?"douleur":""}\n`);
    dl("coach-perso-export.csv",csv,"text/csv");};
  $("#impJson").onclick=()=>$("#impFile").click();
  $("#impFile").onchange=e=>{const f=e.target.files[0]; if(!f)return; const r=new FileReader();
    r.onload=async()=>{try{S=Object.assign(clone(DEFAULTS),JSON.parse(r.result)); await persist(); render(); alert("Sauvegarde importée ✔");}catch(err){alert("Fichier invalide.");}}; r.readAsText(f);};
  $("#reset").onclick=async()=>{ if(confirm("Effacer toutes les données ? (exporte d'abord si besoin)")){S=clone(DEFAULTS); await persist(); render();} };
  v.appendChild(el("div",{class:"card flat small muted"},`<b>Confidentialité :</b> application 100 % personnelle et locale, sans compte, sans abonnement, sans envoi de données. Version 1.0 — cycle de 12 semaines renouvelable (semaine 12 : fais le bilan puis relance un cycle en gardant tes historiques).`));
}
function dl(name,content,type){ const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([content],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),5000); }

/* ================= THÈME & INIT ================= */
function applyTheme(){ const t=S?S.settings.theme:"auto";
  const dark=t==="dark"||(t==="auto"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme=dark?"dark":"light"; }
$("#themeBtn").onclick=async()=>{ const cur=document.documentElement.dataset.theme;
  S.settings.theme=cur==="dark"?"light":"dark"; applyTheme(); await persist(); };
(async function init(){
  const saved=await Store.load();
  S=saved?Object.assign(clone(DEFAULTS),saved):clone(DEFAULTS);
  applyTheme(); nav("dash");
})();
