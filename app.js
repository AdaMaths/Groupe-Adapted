const GENERATORS = [8,10,12,20,25,30,37.5,50,62.5,100,125,150,160,187.5,200,250,625];
const STORAGE = "adamaths-dimensionnement";
let rows = [{name:"", power:"", quantity:1, correction:1}], recommended = null, chart;
const $ = id => document.getElementById(id);
const date = new Date(); $("date").value = date.toISOString().slice(0,10);
function save(){localStorage.setItem(STORAGE,JSON.stringify({rows,client:$("client").value,phone:$("phone").value,salesperson:$("salesperson").value,date:$("date").value,comments:$("comments").value}));}
function load(){try{const s=JSON.parse(localStorage.getItem(STORAGE));if(!s)return;rows=s.rows||rows;["client","phone","salesperson","date","comments"].forEach(k=>{if(s[k])$(k).value=s[k]})}catch{}}
function renderRows(){
  $("row-count").textContent=`${rows.length} équipement${rows.length>1?"s":""}`;
  $("equipment-rows").innerHTML=rows.map((r,i)=>`<tr><td><input data-i="${i}" data-key="name" value="${r.name}" placeholder="Ex. Climatiseur"></td><td><input data-i="${i}" data-key="power" type="number" min="0" value="${r.power}" placeholder="1500"></td><td><input data-i="${i}" data-key="quantity" type="number" min="1" value="${r.quantity}" placeholder="1"></td><td><input data-i="${i}" data-key="correction" type="number" min="0" step=".01" value="${r.correction}" placeholder="1"></td><td><button class="delete" data-remove="${i}" aria-label="Supprimer">×</button></td></tr>`).join("");
  document.querySelectorAll("#equipment-rows input").forEach(input=>input.addEventListener("input",e=>{rows[+e.target.dataset.i][e.target.dataset.key]=e.target.value;save()}));
  document.querySelectorAll("[data-remove]").forEach(btn=>btn.addEventListener("click",()=>{if(rows.length>1)rows.splice(+btn.dataset.remove,1);renderRows();save()}));
}
function calculate(){
  let total=0, labels=[], values=[];
  rows.forEach((r,i)=>{const value=(parseFloat(r.power)||0)*(parseInt(r.quantity)||0)*(parseFloat(r.correction)||1);total+=value;if(value>0){labels.push(r.name||`Équipement ${i+1}`);values.push(value)}});
  const kva=total/(1000*.8); recommended=GENERATORS.find(g=>g>=kva)||null;
  $("total-w").textContent=`${total.toLocaleString("fr-FR",{maximumFractionDigits:2})} W`;
  $("total-kva").textContent=`${kva.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})} kVA`;
  $("recommended").innerHTML=recommended?`${recommended} <small>kVA</small>`:"— <small>kVA</small>";
  $("recommendation-copy").textContent=recommended?`Marge conseillée de ${(recommended-kva).toFixed(2)} kVA pour absorber les variations.`:"La puissance dépasse notre catalogue disponible.";
  const usage=recommended?Math.min(100,kva/recommended*100):0;$("capacity-bar").style.width=`${usage}%`;$("capacity-label").textContent=recommended?`${usage.toFixed(0)} %`:"—";$("capacity-note").textContent=recommended?`${(recommended-kva).toFixed(2)} kVA de réserve disponible.`:"Sélectionnez un groupe pour voir la marge.";
  $("chart-empty").style.display=labels.length?"none":"block"; if(chart)chart.destroy();if(labels.length)chart=new Chart($("power-chart"),{type:"doughnut",data:{labels,datasets:[{data:values,backgroundColor:["#78adff","#9c8cff","#6ce0aa","#ffbd6b","#ef7180","#57d4cd"],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{color:getComputedStyle(document.body).getPropertyValue("--muted"),font:{size:9,family:"Manrope"},padding:12,usePointStyle:true}}}}});
  renderGenerators();save();
}
function renderGenerators(){
  const q=($("search").value||"").replace(",",".");$("generator-grid").innerHTML=GENERATORS.filter(g=>!q||String(g).includes(q)).map(g=>`<article class="generator ${g===recommended?"recommended":""}"><strong>${g}</strong> <small>kVA</small>${g===recommended?"<small style=\"display:block;color:var(--green);margin-top:5px\">Recommandé</small>":""}<button data-pdf="${g}">Voir la fiche →</button></article>`).join("");
  document.querySelectorAll("[data-pdf]").forEach(b=>b.addEventListener("click",()=>window.open(`${b.dataset.pdf}kVA.pdf`,"_blank")));
}
function csvExport(){const header=["Matériel","Puissance (W)","Quantité","Coefficient de correction"],data=rows.map(r=>[r.name,r.power,r.quantity,r.correction]);const csv="\uFEFF"+[header,...data].map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(";")).join("\n");download(new Blob([csv],{type:"text/csv;charset=utf-8"}),"dimensionnement.csv")}
function download(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href)}
function pdfExport(){calculate();window.print()}
$("add-row").addEventListener("click",()=>{rows.push({name:"",power:"",quantity:1,correction:1});renderRows()});$("reset-rows").addEventListener("click",()=>{rows=[{name:"",power:"",quantity:1,correction:1}];recommended=null;renderRows();calculate()});$("calculate").addEventListener("click",calculate);$("export-csv").addEventListener("click",csvExport);$("export-pdf").addEventListener("click",pdfExport);$("search").addEventListener("input",renderGenerators);$("theme").addEventListener("click",()=>{document.body.classList.toggle("light");calculate()});
["client","phone","salesperson","date","comments"].forEach(id=>$(id).addEventListener("input",save));
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
load();renderRows();renderGenerators();calculate();