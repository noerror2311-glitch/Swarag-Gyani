(function(){
// Real AI chat with NO API key of yours and NO server: it uses Puter.js (users cover their own AI usage).
// Urgent keywords also show instant tap-to-call numbers from script.js (S, BASE, NAT) before the AI answers.

var ps=document.createElement("script");ps.src="https://js.puter.com/v2/";ps.async=true;document.head.appendChild(ps);

var INTENTS=[
{re:/fire|smoke|burning|blaze|flames/,k:"fire",t:"Fire brigade"},
{re:/bleed|blood|injur|accident|hurt|unconscious|faint|heart|chest pain|breath|chok|drown|suffocat|overdose|snake|shock|pregnan|poison|ambulance|medical|sick|seizure|stroke/,k:"amb",t:"Ambulance"},
{re:/police|thief|theft|robber|stolen|attack|kidnap|murder|fight|threat|crime|assault|burglar|strangl|gun|knife|weapon|kill/,k:"police",t:"Police"},
{re:/women|woman|harass|abuse|domestic|stalk|dowry|molest|eve.?teas/,k:"women",t:"Women helpline"},
{re:/child|kid|baby|minor|missing child/,k:"child",t:"Child helpline"},
{re:/disaster|flood|earthquake|cyclone|landslide|storm|tsunami/,k:"dis",t:"Disaster control"}
];
var EXTRA=[
{re:/cyber|fraud|scam|hack|upi|otp|phishing/,t:"Cyber crime / online fraud",n:"1930"},
{re:/rail|train/,t:"Railway helpline",n:"139"},
{re:/senior|elder|old age/,t:"Senior citizens (Elderline)",n:"14567"},
{re:/tourist/,t:"Tourist helpline",n:"1363"},
{re:/gas leak|lpg|cylinder/,t:"Gas leak",n:"1906"},
{re:/highway|road accident/,t:"Road accident / highway",n:"1073"},
{re:/ncw|commission for women/,t:"NCW helpline",n:"14490"}
];

function clean(s){return String(s).replace("&amp;","&")}
function tel2(n){return "tel:"+String(n).split("/")[0].replace(/[^0-9+]/g,"")}
function stateFrom(q){
var keys=Object.keys(S);
for(var i=0;i<keys.length;i++){
var name=clean(keys[i]).toLowerCase();
if(name.indexOf("other")===0)continue;
if(q.indexOf(name)>-1||(name==="jammu & kashmir"&&/kashmir|jammu/.test(q)))return keys[i];
}
return document.getElementById("area").value;
}
function quick(raw){
var q=raw.toLowerCase(),res=[],st=stateFrom(q),d=S[st]||{};
INTENTS.forEach(function(it){if(it.re.test(q))res.push([it.t,d[it.k]||BASE[it.k]])});
EXTRA.forEach(function(it){if(it.re.test(q))res.push([it.t,it.n])});
return{state:clean(st),res:res};
}

function systemPrompt(){
var st=document.getElementById("area").value,d=S[st]||{},lines=[];
NAT.forEach(function(p){lines.push(p[0]+": "+p[1])});
var local=[];
["police","fire","amb","women","child","dis"].forEach(function(k){local.push(k+" "+(d[k]||BASE[k]))});
return "You are the helper chatbot on Swarag-Gyani, an Indian emergency-numbers website. "+
"Answer whatever the user asks, helpfully and briefly (under 120 words), in the language the user writes in. "+
"If someone may be in danger or hurt: first tell them to call 112 (or the right number below), then give a few short, safe first steps. "+
"Only use phone numbers from this list and never invent numbers; if unsure, say so and suggest 112. "+
"You are not a doctor or lawyer. National numbers: "+lines.join("; ")+". "+
"User's selected area is "+clean(st)+" with local numbers: "+local.join(", ")+".";
}
function aiText(r){
if(typeof r==="string")return r;
var m=r&&r.message;
if(m){var c=m.content;if(typeof c==="string")return c;if(Array.isArray(c))return c.map(function(b){return b.text||""}).join("")}
return "";
}

var fab=document.createElement("button");
fab.id="ai-fab";fab.type="button";fab.setAttribute("aria-expanded","false");fab.setAttribute("aria-controls","ai-box");
fab.textContent="💬 ASK AI CHATBOT";

var box=document.createElement("section");
box.id="ai-box";box.hidden=true;box.setAttribute("aria-label","AI chatbot");
box.innerHTML='<div class="ai-head"><span>Swarag-Gyani AI</span><button id="ai-close" type="button" aria-label="Close chat">×</button></div>'+
'<div id="ai-msgs" role="log" aria-live="polite"></div>'+
'<form class="ai-form"><input id="ai-in" type="text" placeholder="Ask anything..." aria-label="Your message" autocomplete="off" maxlength="500"><button id="ai-send" type="submit">Send</button></form>'+
'<div class="ai-note">AI can make mistakes. In an emergency, call 112.</div>';
document.body.appendChild(box);document.body.appendChild(fab);

var msgs=box.querySelector("#ai-msgs"),form=box.querySelector("form"),inp=box.querySelector("#ai-in"),send=box.querySelector("#ai-send");
var history=[],busy=false;
function add(text,cls){var d=document.createElement("div");d.className="ai-m "+cls;d.textContent=text;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;return d}
function toggle(open){box.hidden=!open;fab.setAttribute("aria-expanded",String(open));if(open)inp.focus()}

add("Hi! Ask me anything. For emergency numbers I will show them instantly. In a real emergency, call 112 now.","bot");

fab.addEventListener("click",function(){toggle(box.hidden)});
box.querySelector("#ai-close").addEventListener("click",function(){toggle(false);fab.focus()});
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!box.hidden)toggle(false)});

form.addEventListener("submit",function(e){
e.preventDefault();
var t=inp.value.trim();if(!t||busy)return;
inp.value="";add(t,"me");
var qk=quick(t);
if(qk.res.length){
var m=add("For "+qk.state+", you can call:","bot");
qk.res.forEach(function(p){var l=document.createElement("a");l.href=tel2(p[1]);l.textContent="\n📞 "+p[0]+": "+p[1];l.style.display="block";l.style.fontWeight="700";l.style.color="inherit";m.appendChild(l)});
var z=document.createElement("a");z.href="tel:112";z.textContent="\n🆘 Not sure? Call 112";z.style.display="block";z.style.color="inherit";m.appendChild(z);
}
history.push({role:"user",content:t});
busy=true;send.disabled=true;
var wait=add("Thinking...","bot");
function done(){busy=false;send.disabled=false;inp.focus()}
function fail(){
history.pop();
if(qk.res.length){wait.remove()}else{wait.className="ai-m err";wait.textContent="The AI is not available right now. For emergencies call 112."}
done();
}
if(typeof puter==="undefined"||!puter.ai){fail();return}
var payload=[{role:"system",content:systemPrompt()}].concat(history.slice(-10));
puter.ai.chat(payload).then(function(r){
var out=aiText(r).trim();
if(!out)throw new Error("empty");
wait.textContent=out;history.push({role:"assistant",content:out});msgs.scrollTop=msgs.scrollHeight;done();
}).catch(fail);
});
})();