(function(){
// Real AI chat with NO API key of yours and NO server: it uses Puter.js (users cover their own AI usage).
// Urgent keywords also show instant tap-to-call numbers from script.js (S, BASE, NAT) before the AI answers.

// Your server (server.js) receives the question and talks to Puter, so visitors never log in.
// The website is on GitHub Pages, so this must be the full address of the hosted server.
var CHAT_URL="https://swarag-gyani.onrender.com/api/chat";

// Photo / video limits. Files are shrunk in the visitor's browser before sending.
var PHOTO_SIDE=1024;      // longest side of a photo after shrinking (pixels)
var VIDEO_SIDE=640;       // longest side of each video frame (pixels)
var VIDEO_FRAMES=4;       // frames picked from a video, evenly spaced
var JPEG_QUALITY=0.72;
var MAX_PHOTO_MB=15;      // biggest photo file accepted
var MAX_VIDEO_MB=100;     // biggest video file accepted
var MAX_VIDEO_SEC=120;    // longest video accepted

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

// ---------- photo / video preparation (runs in the visitor's browser) ----------
function scaled(src,w,h,max){
var s=Math.min(1,max/Math.max(w,h)),cw=Math.max(1,Math.round(w*s)),ch=Math.max(1,Math.round(h*s));
var c=document.createElement("canvas");c.width=cw;c.height=ch;
var x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,cw,ch);x.drawImage(src,0,0,cw,ch);
return c.toDataURL("image/jpeg",JPEG_QUALITY);
}
function readPhoto(file){
return new Promise(function(ok,bad){
var u=URL.createObjectURL(file),im=new Image();
im.onload=function(){
try{ok([scaled(im,im.naturalWidth,im.naturalHeight,PHOTO_SIDE)])}catch(e){bad(e)}
URL.revokeObjectURL(u);
};
im.onerror=function(){URL.revokeObjectURL(u);bad(new Error("photo"))};
im.src=u;
});
}
function readVideo(file){
return new Promise(function(ok,bad){
var u=URL.createObjectURL(file),v=document.createElement("video"),out=[],times=[],i=0,dead=false,timer;
function end(err){
if(dead)return;dead=true;clearTimeout(timer);
URL.revokeObjectURL(u);v.removeAttribute("src");
err?bad(err):ok(out);
}
timer=setTimeout(function(){end(new Error("video"))},30000);
v.muted=true;v.playsInline=true;v.preload="auto";
v.onerror=function(){end(new Error("video"))};
v.onloadedmetadata=function(){
var d=v.duration;
if(!isFinite(d)||d<=0){end(new Error("video"));return}
if(d>MAX_VIDEO_SEC){end(new Error("long"));return}
for(var k=1;k<=VIDEO_FRAMES;k++)times.push(d*k/(VIDEO_FRAMES+1));
v.currentTime=times[0];
};
v.onseeked=function(){
if(!v.videoWidth){end(new Error("video"));return}
try{out.push(scaled(v,v.videoWidth,v.videoHeight,VIDEO_SIDE))}catch(e){end(e);return}
i++;
if(i<times.length)v.currentTime=times[i];else end();
};
v.src=u;
});
}

// ---------- chat window ----------
var fab=document.createElement("button");
fab.id="ai-fab";fab.type="button";fab.setAttribute("aria-expanded","false");fab.setAttribute("aria-controls","ai-box");
fab.textContent="💬 ASK AI CHATBOT";

var box=document.createElement("section");
box.id="ai-box";box.hidden=true;box.setAttribute("aria-label","AI chatbot");
box.innerHTML='<div class="ai-head"><span>Swarag-Gyani AI</span><button id="ai-close" type="button" aria-label="Close chat">×</button></div>'+
'<div id="ai-msgs" role="log" aria-live="polite"></div>'+
'<div id="ai-prev" hidden></div>'+
'<form class="ai-form"><button id="ai-attach" type="button" aria-label="Attach a photo or video" title="Attach a photo or video"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button><input id="ai-in" type="text" placeholder="Ask anything..." aria-label="Your message" autocomplete="off" maxlength="500"><button id="ai-send" type="submit">Send</button></form>'+
'<input id="ai-file" type="file" accept="image/*,video/*" hidden>'+
'<div class="ai-note">AI can make mistakes. In an emergency, call 112.</div>';
document.body.appendChild(box);document.body.appendChild(fab);

var msgs=box.querySelector("#ai-msgs"),form=box.querySelector("form"),inp=box.querySelector("#ai-in"),send=box.querySelector("#ai-send");
var attach=box.querySelector("#ai-attach"),fileIn=box.querySelector("#ai-file"),prev=box.querySelector("#ai-prev");
var history=[],busy=false,preparing=false,pending=null;

function add(text,cls){var d=document.createElement("div");d.className="ai-m "+cls;d.textContent=text;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;return d}
function addMe(text,att){
var d=add(text,"me");
if(att){
var row=document.createElement("div");row.className="ai-thumbs";
att.images.forEach(function(s){var im=document.createElement("img");im.src=s;im.alt=att.kind==="video"?"Frame from your video":"Your photo";row.appendChild(im)});
d.insertBefore(row,d.firstChild);
msgs.scrollTop=msgs.scrollHeight;
}
}
function toggle(open){box.hidden=!open;fab.setAttribute("aria-expanded",String(open));if(open)inp.focus()}

function renderPrev(){
prev.innerHTML="";
if(!pending&&!preparing){prev.hidden=true;return}
prev.hidden=false;
if(preparing){prev.textContent="Preparing your file...";return}
var im=document.createElement("img");im.src=pending.images[0];im.alt="";
var lb=document.createElement("span");
lb.textContent=pending.kind==="video"?"🎬 Video ready ("+pending.images.length+" frames)":"🖼️ Photo ready";
var rm=document.createElement("button");rm.type="button";rm.textContent="×";rm.setAttribute("aria-label","Remove attachment");
rm.addEventListener("click",function(){pending=null;renderPrev();inp.focus()});
prev.appendChild(im);prev.appendChild(lb);prev.appendChild(rm);
}
function mediaError(e,isVideo){
if(e&&e.message==="long")return "That video is longer than "+MAX_VIDEO_SEC+" seconds. Please choose a shorter one.";
return isVideo?"I could not read that video. Try an MP4 recorded on your phone, or send a photo instead.":"I could not read that photo. Try a JPG or PNG.";
}

add("Hi! Ask me anything. Use the paperclip to send a photo or a short video. For emergency numbers I will show them instantly. In a real emergency, call 112 now.","bot");

fab.addEventListener("click",function(){toggle(box.hidden)});
box.querySelector("#ai-close").addEventListener("click",function(){toggle(false);fab.focus()});
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!box.hidden)toggle(false)});

attach.addEventListener("click",function(){if(!busy&&!preparing)fileIn.click()});
fileIn.addEventListener("change",function(){
var f=fileIn.files&&fileIn.files[0];fileIn.value="";
if(!f)return;
var isV=/^video\//.test(f.type),isP=/^image\//.test(f.type);
if(!isV&&!isP){add("Please choose a photo or a video.","err");return}
if(isP&&f.size>MAX_PHOTO_MB*1048576){add("That photo is too big (limit "+MAX_PHOTO_MB+" MB).","err");return}
if(isV&&f.size>MAX_VIDEO_MB*1048576){add("That video is too big (limit "+MAX_VIDEO_MB+" MB).","err");return}
pending=null;preparing=true;renderPrev();send.disabled=true;
(isV?readVideo(f):readPhoto(f))
.then(function(imgs){pending={kind:isV?"video":"photo",images:imgs}})
.catch(function(e){add(mediaError(e,isV),"err")})
.then(function(){preparing=false;renderPrev();if(!busy)send.disabled=false;inp.focus()});
});

form.addEventListener("submit",function(e){
e.preventDefault();
if(busy||preparing)return;
var typed=inp.value.trim();
if(!typed&&!pending)return;
var att=pending;pending=null;renderPrev();
var t=typed||(att.kind==="video"?"These are frames from a video I recorded. What is happening, and is there any danger?":"What do you see in this photo, and is there any danger?");
inp.value="";addMe(t,att);
var qk=quick(typed);
if(qk.res.length){
var m=add("For "+qk.state+", you can call:","bot");
qk.res.forEach(function(p){var l=document.createElement("a");l.href=tel2(p[1]);l.textContent="\n📞 "+p[0]+": "+p[1];l.style.display="block";l.style.fontWeight="700";l.style.color="inherit";m.appendChild(l)});
var z=document.createElement("a");z.href="tel:112";z.textContent="\n🆘 Not sure? Call 112";z.style.display="block";z.style.color="inherit";m.appendChild(z);
}
history.push({role:"user",content:t.slice(0,450)+(att?" [attached a "+att.kind+"]":"")});
busy=true;send.disabled=true;attach.disabled=true;
var wait=add(att?"Looking at your "+att.kind+"...":"Thinking...","bot");
function done(){busy=false;send.disabled=false;attach.disabled=false;inp.focus()}
function fail(err){
history.pop();
var msg=err&&err.message&&/too many|too large/i.test(err.message)?err.message:"";
if(qk.res.length&&!msg){wait.remove()}else{wait.className="ai-m err";wait.textContent=msg||"The AI is not available right now. For emergencies call 112."}
done();
}
fetch(CHAT_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:history.slice(-10),context:systemPrompt(),images:att?att.images:[],kind:att?att.kind:""})})
.then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||"failed");return j})})
.then(function(j){
var out=String(j.reply||"").trim();
if(!out)throw new Error("empty");
wait.textContent=out;history.push({role:"assistant",content:out});msgs.scrollTop=msgs.scrollHeight;done();
}).catch(fail);
});
})();