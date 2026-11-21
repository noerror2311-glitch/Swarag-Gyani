(function(){
// Google-style search: recent searches, popular numbers for the chosen area, ranked matches as you type.
// Recent searches and usage counts are kept only in this visitor's browser (localStorage).
var inp=document.getElementById("sq"),sug=document.getElementById("sug"),res=document.getElementById("sres"),resT=document.getElementById("sresTitle"),resL=document.getElementById("sresList");
if(!inp)return;
var RK="sg-recent",UK="sg-used";

function load(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v||d}catch(e){return d}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function clean(s){return String(s).replace(/&amp;/g,"&")}
function norm(s){return clean(s).toLowerCase()}
function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}

// Extra words people may type (including a few Hindi/Hinglish ones) for each kind of helpline.
var KW=[
[/police|crime/,"pulis chori theft robbery thief attack crime kidnap"],
[/fire/,"aag smoke burning blaze"],
[/ambulance|medical/,"hospital medical injury accident heart bleeding health dawai"],
[/women|domestic|ncw/,"mahila harassment abuse domestic stalking safety dowry"],
[/child/,"bachcha kid missing child abuse"],
[/disaster|ndrf/,"flood earthquake cyclone landslide rescue"],
[/cyber/,"fraud scam upi otp hacked online money"],
[/rail/,"train railway"],
[/gas/,"lpg leak cylinder"],
[/senior/,"elderly old age"],
[/tourist/,"travel visitor"],
[/road|highway/,"highway accident"],
[/electric/,"power bijli light"],
[/water/,"pani supply"],
[/metro/,"train"],
[/national emergency/,"112 all sos"],
[/forest/,"jungle fire"]
];
function kw(l){var o=[],x=l.toLowerCase();KW.forEach(function(p){if(p[0].test(x))o.push(p[1])});return o.join(" ")}

function items(){
var st=sel.value,d=S[st]||{},out=[];
[["Police","police"],["Fire","fire"],["Ambulance","amb"],["Women helpline","women"],["Child helpline","child"],["Disaster control","dis"]].forEach(function(p){
out.push({l:p[0],n:d[p[1]]||BASE[p[1]],s:"For "+clean(st),a:1})});
(d.x||[]).forEach(function(p){out.push({l:p[0],n:p[1],s:"For "+clean(st),a:1})});
var area=out.slice();
NAT.forEach(function(p){
var digits=p[1].replace(/[^0-9]/g,""),dup=false;
if(p[1]!=="112"){area.forEach(function(o){if(new RegExp("(^|[^0-9])"+digits+"([^0-9]|$)").test(o.n))dup=true})}
if(!dup)out.push({l:p[0],n:p[1],s:p[2]||"National",a:0});
});
out.forEach(function(o){o.k=norm(o.l+" "+o.n)+" "+kw(o.l)});
return out;
}

function ranked(q){
var used=load(UK,{}),toks=q.split(/\s+/).filter(Boolean),out=[];
items().forEach(function(o){
var s=0,lab=o.l.toLowerCase(),ok=true;
toks.forEach(function(t){
if(o.k.indexOf(t)<0){ok=false;return}
s+=new RegExp("(^|[^a-z0-9])"+esc(t)).test(o.k)?20:8;
if(lab.indexOf(t)===0)s+=30;else if(lab.indexOf(t)>-1)s+=10;
if(o.n.indexOf(t)>-1)s+=12;
});
if(!ok)return;
if(o.a)s+=5;
s+=Math.min(15,(used[o.l]||0)*3);
out.push([s,o]);
});
out.sort(function(a,b){return b[0]-a[0]});
return out.map(function(p){return p[1]});
}
function popular(n){
var used=load(UK,{}),a=items().filter(function(o){return o.a}).map(function(o,i){return[(used[o.l]||0)*10-i,o]});
a.sort(function(x,y){return y[0]-x[0]});
return a.slice(0,n).map(function(p){return p[1]});
}

function addRecent(s){
s=s.trim();if(!s)return;
var r=load(RK,[]).filter(function(x){return x.toLowerCase()!==s.toLowerCase()});
r.unshift(s);save(RK,r.slice(0,8));
}
function removeRecent(s){save(RK,load(RK,[]).filter(function(x){return x!==s}))}
function bump(l){var u=load(UK,{});u[l]=(u[l]||0)+1;save(UK,u)}

var rows=[],active=-1,open=false;
function buildRows(){
var q=norm(inp.value).trim(),rec=load(RK,[]);rows=[];
if(!q){
if(rec.length){rows.push({t:"hd",x:"Recent searches"});rec.slice(0,4).forEach(function(r){rows.push({t:"recent",q:r})})}
rows.push({t:"hd",x:"Popular in "+clean(sel.value)});
popular(5).forEach(function(o){rows.push({t:"item",o:o})});
}else{
rec.filter(function(r){var x=r.toLowerCase();return x.indexOf(q)===0&&x!==q}).slice(0,2).forEach(function(r){rows.push({t:"recent",q:r})});
var list=ranked(q).slice(0,6);
list.forEach(function(o){rows.push({t:"item",o:o})});
if(!list.length&&!rows.length)rows.push({t:"none"});
}
}
function paint(){
sug.innerHTML="";
rows.forEach(function(r,i){
var li=document.createElement("li");li.id="sug-"+i;
if(r.t==="hd"){li.className="hd";li.setAttribute("role","presentation");li.textContent=r.x}
else if(r.t==="none"){li.className="hd";li.setAttribute("role","presentation");li.textContent="No match. If it is urgent, call 112."}
else{
li.className="opt";li.setAttribute("role","option");li.setAttribute("aria-selected",i===active?"true":"false");
if(r.t==="recent"){
li.innerHTML='<span aria-hidden="true">🕘</span><span class="t"></span>';
li.querySelector(".t").textContent=r.q;
var x=document.createElement("button");x.type="button";x.className="rm";x.textContent="×";x.setAttribute("aria-label","Remove "+r.q+" from recent searches");
x.addEventListener("mousedown",function(e){e.preventDefault();e.stopPropagation();removeRecent(r.q);buildRows();active=-1;paint()});
li.appendChild(x);
}else{
var k=kind(r.o.l);
li.innerHTML='<span aria-hidden="true">'+k[2]+'</span><span class="t"></span><span class="num"></span>';
li.querySelector(".t").innerHTML=r.o.l+"<small>"+r.o.s+"</small>";
li.querySelector(".num").textContent=r.o.n;
}
li.addEventListener("mousedown",function(e){e.preventDefault();choose(r)});
}
sug.appendChild(li);
});
sug.hidden=!(open&&rows.length);
inp.setAttribute("aria-expanded",String(!sug.hidden));
if(active>=0)inp.setAttribute("aria-activedescendant","sug-"+active);else inp.removeAttribute("aria-activedescendant");
}
function show(){open=true;buildRows();active=-1;paint()}
function hide(){open=false;active=-1;paint()}

function showResults(q,pin){
q=norm(q).trim();
if(!q){res.hidden=true;return}
var list=ranked(q);
if(pin){list=list.filter(function(o){return !(o.l===pin.l&&o.n===pin.n)});list.unshift(pin)}
resT.textContent="Results for \u201C"+inp.value.trim()+"\u201D in "+clean(sel.value);
resL.innerHTML="";
if(!list.length){
var p=document.createElement("p");p.className="empty";p.textContent="No helpline matches that. Try another word, or call 112 if you are unsure.";resL.appendChild(p);
list=[{l:"National emergency",n:"112",s:"Call if unsure"}];
}
list.forEach(function(o){var a=card(o.l,o.n,o.s);a.addEventListener("click",function(){bump(o.l);addRecent(o.l)});resL.appendChild(a)});
res.hidden=false;
}
function choose(r){
if(r.t==="recent"){inp.value=r.q;addRecent(r.q);showResults(r.q)}
else if(r.t==="item"){inp.value=r.o.l;addRecent(r.o.l);bump(r.o.l);showResults(r.o.l,r.o)}
else return;
hide();
}

inp.addEventListener("focus",show);
inp.addEventListener("input",function(){show();if(!inp.value.trim())res.hidden=true});
inp.addEventListener("blur",function(){setTimeout(hide,120)});
inp.addEventListener("keydown",function(e){
var sel_=[];rows.forEach(function(r,i){if(r.t==="recent"||r.t==="item")sel_.push(i)});
if(e.key==="ArrowDown"||e.key==="ArrowUp"){
e.preventDefault();if(!open)show();
if(!sel_.length)return;
var pos=sel_.indexOf(active);
pos=e.key==="ArrowDown"?(pos+1)%sel_.length:(pos<=0?sel_.length-1:pos-1);
active=sel_[pos];paint();
}else if(e.key==="Enter"){
e.preventDefault();
if(active>=0&&rows[active])choose(rows[active]);
else if(inp.value.trim()){addRecent(inp.value);showResults(inp.value);hide()}
}else if(e.key==="Escape"){hide()}
});

// Refresh when the area changes (dropdown or "Use my location").
new MutationObserver(function(){
if(open){buildRows();paint()}
if(!res.hidden)showResults(inp.value);
}).observe(document.getElementById("areaTitle"),{childList:true,characterData:true,subtree:true});
})();