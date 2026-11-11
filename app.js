/* AdaMaths — app.js
   Données, formules et clé de sauvegarde inchangées.
   Ajouts : échappement des noms, thème mémorisé, garde si Chart.js indisponible,
   aucune recommandation tant que la charge est nulle. */

const GENERATORS = [8,10,12,20,25,30,37.5,50,62.5,100,125,150,160,187.5,200,250,625];
const STORAGE = "adamaths-dimensionnement";
const THEME_KEY = "adamaths-theme";
let rows = [{name:"", power:"", quantity:1, correction:1}], recommended = null, chart;
const $ = id => document.getElementById(id);
const date = new Date(); $("date").value = date.toISOString().slice(0,10);
const esc = v => String(v ?? "").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const emptyRow = () => ({name:"", power:"", quantity:1, correction:1});

function save(){
  try{localStorage.setItem(STORAGE,JSON.stringify({rows,client:$("client").value,phone:$("phone").value,salesperson:$("salesperson").value,date:$("date").value,comments:$("comments").value}));}catch{}
}
function load(){
  try{
    const s=JSON.parse(localStorage.getItem(STORAGE));
    if(!s)return;
    if(Array.isArray(s.rows)&&s.rows.length)rows=s.rows;
    ["client","phone","salesperson","date","comments"].forEach(k=>{if(s[k])$(k).value=s[k]});
  }catch{}
}

function renderRows(){
  $("row-count").textContent=`${rows.length} équipement${rows.length>1?"s":""}`;
  $("equipment-rows").innerHTML=rows.map((r,i)=>`<tr>
    <td data-label="Matériel"><input data-i="${i}" data-key="name" value="${esc(r.name)}" placeholder="Ex. Climatiseur" aria-label="Matériel ${i+1}"></td>
    <td data-label="Puissance (W)"><input data-i="${i}" data-key="power" type="number" min="0" inputmode="decimal" value="${esc(r.power)}" placeholder="1500" aria-label="Puissance en watts"></td>
    <td data-label="Quantité"><input data-i="${i}" data-key="quantity" type="number" min="1" inputmode="numeric" value="${esc(r.quantity)}" placeholder="1" aria-label="Quantité"></td>
    <td data-label="Coefficient"><input data-i="${i}" data-key="correction" type="number" min="0" step=".01" inputmode="decimal" value="${esc(r.correction)}" placeholder="1" aria-label="Coefficient de correction"></td>
    <td class="cell-action"><button class="delete" type="button" data-remove="${i}" aria-label="Supprimer l’équipement ${i+1}" title="Supprimer">×</button></td>
  </tr>`).join("");
  document.querySelectorAll("#equipment-rows input").forEach(input=>input.addEventListener("input",e=>{rows[+e.target.dataset.i][e.target.dataset.key]=e.target.value;save()}));
  document.querySelectorAll("[data-remove]").forEach(btn=>btn.addEventListener("click",()=>{
    const i=+btn.dataset.remove;
    if(rows.length>1)rows.splice(i,1); else rows[i]=emptyRow();
    renderRows();save();
  }));
}

function calculate(){
  let total=0, labels=[], values=[];
  rows.forEach((r,i)=>{const value=(parseFloat(r.power)||0)*(parseInt(r.quantity)||0)*(parseFloat(r.correction)||1);total+=value;if(value>0){labels.push(r.name||`Équipement ${i+1}`);values.push(value)}});
  const kva=total/(1000*.8);
  recommended=total>0?(GENERATORS.find(g=>g>=kva)||null):null;
  $("total-w").textContent=`${total.toLocaleString("fr-FR",{maximumFractionDigits:2})} W`;
  $("total-kva").textContent=`${kva.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})} kVA`;
  $("recommended").innerHTML=recommended?`${recommended} <small>kVA</small>`:"— <small>kVA</small>";
  $("recommendation-copy").textContent=recommended
    ?`Marge conseillée de ${(recommended-kva).toFixed(2)} kVA pour absorber les variations.`
    :(total>0?"La puissance dépasse notre catalogue disponible.":"Ajoutez vos équipements puis lancez le calcul.");
  const usage=recommended?Math.min(100,kva/recommended*100):0;
  $("capacity-bar").style.width=`${usage}%`;
  $("capacity-bar").classList.toggle("high",usage>85);
  $("capacity-label").textContent=recommended?`${usage.toFixed(0)} %`:"—";
  $("capacity-note").textContent=recommended?`${(recommended-kva).toFixed(2)} kVA de réserve disponible.`:"Sélectionnez un groupe pour voir la marge.";
  $("chart-empty").style.display=labels.length?"none":"block";
  if(chart){chart.destroy();chart=null}
  if(labels.length&&window.Chart)chart=new Chart($("power-chart"),{type:"doughnut",data:{labels,datasets:[{data:values,backgroundColor:["#78adff","#9c8cff","#6ce0aa","#ffbd6b","#ef7180","#57d4cd"],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:"62%",plugins:{legend:{position:"bottom",labels:{color:getComputedStyle(document.body).getPropertyValue("--muted"),font:{size:12,family:"Manrope"},padding:14,usePointStyle:true}}}}});
  renderGenerators();save();
}

function renderGenerators(){
  const q=($("search").value||"").replace(",",".");
  const list=GENERATORS.filter(g=>!q||String(g).includes(q));
  $("generator-grid").innerHTML=list.length?list.map(g=>`<article class="generator ${g===recommended?"recommended":""}"><strong>${g}</strong> <small>kVA</small>${g===recommended?"<span class=\"badge\">Recommandé</span>":""}<button type=\"button\" data-pdf="${g}">Voir la fiche →</button></article>`).join(""):`<p class="no-result">Aucun groupe ne correspond à « ${esc(q)} ».</p>`;
  document.querySelectorAll("[data-pdf]").forEach(b=>b.addEventListener("click",()=>window.open(`${b.dataset.pdf}kVA.pdf`,"_blank")));
}

function csvExport(){const header=["Matériel","Puissance (W)","Quantité","Coefficient de correction"],data=rows.map(r=>[r.name,r.power,r.quantity,r.correction]);const csv="﻿"+[header,...data].map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(";")).join("\n");download(new Blob([csv],{type:"text/csv;charset=utf-8"}),"dimensionnement.csv")}
function download(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href)}
function pdfExport(){calculate();window.print()}

function applyTheme(light){
  document.body.classList.toggle("light",light);
  $("theme").textContent=light?"☾":"☼";
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute("content",light?"#f4f7fb":"#0b1424");
}

$("add-row").addEventListener("click",()=>{rows.push(emptyRow());renderRows();const inputs=document.querySelectorAll("#equipment-rows tr:last-child input");if(inputs[0])inputs[0].focus();save()});
$("reset-rows").addEventListener("click",()=>{rows=[emptyRow()];recommended=null;renderRows();calculate()});
$("calculate").addEventListener("click",calculate);
$("export-csv").addEventListener("click",csvExport);
$("export-pdf").addEventListener("click",pdfExport);
$("search").addEventListener("input",renderGenerators);
$("theme").addEventListener("click",()=>{
  const light=!document.body.classList.contains("light");
  applyTheme(light);
  try{localStorage.setItem(THEME_KEY,light?"light":"dark")}catch{}
  calculate();
});
["client","phone","salesperson","date","comments"].forEach(id=>$(id).addEventListener("input",save));
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});

try{applyTheme(localStorage.getItem(THEME_KEY)==="light")}catch{}
load();renderRows();renderGenerators();calculate();