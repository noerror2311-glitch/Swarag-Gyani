(function(){
// Finds the visitor's state from their location and switches the number list to it.
// Uses the browser's location permission (asks the visitor first). Needs https:// or localhost.
var btn=document.getElementById("loc"),msg=document.getElementById("locMsg");
if(!btn||!navigator.geolocation){if(btn)btn.hidden=true;return}

function say(t){msg.textContent=t}
function norm(s){return String(s||"").toLowerCase().replace(/&amp;/g,"and").replace(/&/g,"and").replace(/[^a-z ]/g," ").replace(/\s+/g," ").trim()}
function pretty(k){return String(k).replace("&amp;","&")}
function match(name){
var n=norm(name);if(!n)return null;
if(n.indexOf("delhi")>-1)return "Delhi";
var keys=Object.keys(S);
for(var i=0;i<keys.length;i++){
var k=norm(keys[i]);
if(k.indexOf("other")===0)continue;
if(n===k||n.indexOf(k)>-1||k.indexOf(n)>-1)return keys[i];
}
return null;
}
function getJSON(u){return fetch(u).then(function(r){if(!r.ok)throw new Error("bad");return r.json()})}
function stateName(lat,lon){
return getJSON("https://api.bigdatacloud.net/data/reverse-geocode-client?latitude="+lat+"&longitude="+lon+"&localityLanguage=en")
.then(function(j){if(!j.principalSubdivision)throw new Error("none");return j.principalSubdivision})
.catch(function(){
return getJSON("https://nominatim.openstreetmap.org/reverse?format=json&zoom=5&lat="+lat+"&lon="+lon)
.then(function(j){return (j.address&&(j.address.state||j.address.state_district))||""});
});
}
function apply(name){
var key=match(name);
if(key){sel.value=key;render();say("📍 Showing numbers for "+pretty(key)+". Wrong? Change it in the list.")}
else{sel.value="Other / Not listed";render();say("📍 You seem to be in "+(name||"an unknown area")+", which is not in our list yet. Showing national numbers.")}
}
function locate(){
say("Finding your location...");btn.disabled=true;
navigator.geolocation.getCurrentPosition(function(p){
stateName(p.coords.latitude.toFixed(2),p.coords.longitude.toFixed(2))
.then(apply).catch(function(){say("Could not work out your state. Please choose your area from the list.")})
.then(function(){btn.disabled=false});
},function(err){
btn.disabled=false;
say(err&&err.code===1?"Location permission was denied. Please choose your area from the list.":"Could not get your location. Please choose your area from the list.");
},{timeout:10000,maximumAge:600000});
}
btn.addEventListener("click",locate);
try{if(navigator.permissions)navigator.permissions.query({name:"geolocation"}).then(function(s){if(s.state==="granted")locate()})}catch(e){}
})();