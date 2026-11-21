var BASE={police:"112 / 100",fire:"101",amb:"108",women:"181 / 1091",child:"1098",dis:"1070"};
var S={
"Delhi":{amb:"102 / 108",dis:"1077",x:[["Gas leak","1906"],["Electricity complaints","19123"],["Water supply","1916"],["Delhi Metro helpline","155370"]]},
"Uttar Pradesh":{women:"1090 / 181",dis:"1070 / 1077",x:[["CM helpline","1076"]]},
"Haryana":{women:"1091 / 1098"},
"Punjab":{},
"Rajasthan":{},
"Himachal Pradesh":{},
"Uttarakhand":{x:[["Forest fire reporting","1800 180 4074"]]},
"Jammu &amp; Kashmir":{amb:"102 / 108",women:"1091"},
"Chandigarh":{},
"Madhya Pradesh":{women:"1090",dis:"1079 / 1070",x:[["Road development corporation","1099"],["Railway help","139"]]},
"Maharashtra":{women:"103 / 1091 / 181"},
"Gujarat":{women:"181 (Abhayam) / 1091"},
"Goa":{},
"Karnataka":{},
"Tamil Nadu":{},
"Kerala":{dis:"1077 / 1070"},
"Telangana":{},
"Andhra Pradesh":{},
"West Bengal":{amb:"102 / 108"},
"Bihar":{amb:"102"},
"Odisha":{amb:"108 / 102"},
"Jharkhand":{},
"Chhattisgarh":{},
"Assam":{},
"Other / Not listed":{}
};
var NAT=[
["National emergency (police, fire, ambulance)","112","ERSS, 24×7"],
["Police","100","Older number, linked with 112"],
["Fire brigade","101",""],
["National ambulance","102","Mostly maternal and child cases"],
["Medical emergency ambulance","108","In most states"],
["Women helpline","181","Women in distress"],
["Women in distress (police)","1091",""],
["NCW helpline","14490","National Commission for Women"],
["Domestic violence (NCW)","7827 170 170",""],
["Child helpline (Childline)","1098",""],
["Cyber crime / online fraud","1930","Report fast"],
["Railway helpline","139",""],
["Senior citizens (Elderline)","14567",""],
["Disaster management","1070","State control room"],
["District disaster control","1077","District level"],
["NDRF control room","011-24363260","National Disaster Response Force"],
["Road accident / highway","1073",""],
["Gas leak","1906",""],
["Tourist helpline","1363",""]
];
function tel(n){return "tel:"+n.split("/")[0].replace(/[^0-9+]/g,"")}
var K=[[/national emergency/i,"police","🆘"],[/women|domestic|ncw/i,"women","👩"],[/police|cyber|crime/i,"police","👮"],[/fire/i,"fire","🔥"],[/ambulance|medical/i,"amb","🚑"],[/child/i,"child","🧒"],[/disaster|ndrf|road|accident|forest/i,"dis","🌊"],[/rail|metro/i,"rail","🚆"],[/gas|electric|water/i,"util","⚡"],[/senior/i,"gen","🧓"],[/tourist/i,"gen","🧭"]];
function kind(l){for(var i=0;i<K.length;i++)if(K[i][0].test(l))return K[i];return[0,"gen","📞"]}
function card(l,n,s){var k=kind(l),a=document.createElement("a");a.className="item k-"+k[1];a.href=tel(n);a.innerHTML='<span class="ic" aria-hidden="true">'+k[2]+'</span><div class="l">'+l+(s?"<small>"+s+"</small>":"")+'</div><div class="n">'+n+"</div>";return a}
var sel=document.getElementById("area"),list=document.getElementById("areaList"),title=document.getElementById("areaTitle");
Object.keys(S).forEach(function(k){var o=document.createElement("option");o.value=k;o.innerHTML=k;sel.appendChild(o)});
var saved="Delhi";
try{var v=localStorage.getItem("sg-area");if(v&&S[v])saved=v}catch(e){}
sel.value=saved;
function render(){
var k=sel.value,d=S[k],r={};
for(var i in BASE)r[i]=d[i]||BASE[i];
list.innerHTML="";
title.innerHTML="Emergency numbers: "+k;
[["Police",r.police],["Fire",r.fire],["Ambulance",r.amb],["Women helpline",r.women],["Child helpline",r.child],["Disaster control",r.dis]].forEach(function(p){list.appendChild(card(p[0],p[1],""))});
(d.x||[]).forEach(function(p){list.appendChild(card(p[0],p[1],""))});
try{localStorage.setItem("sg-area",k)}catch(e){}
}
sel.addEventListener("change",render);
var nat=document.getElementById("natList"),none=document.getElementById("none");
function renderNat(f){nat.innerHTML="";var c=0;f=(f||"").toLowerCase();
NAT.forEach(function(p){if(!f||(p[0]+p[1]+p[2]).toLowerCase().indexOf(f)>-1){nat.appendChild(card(p[0],p[1],p[2]));c++}});
none.hidden=c>0}
document.getElementById("q").addEventListener("input",function(e){renderNat(e.target.value)});
render();renderNat("");