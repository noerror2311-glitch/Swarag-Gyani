// Swarag-Gyani server.
// 1) Serves the website files.  2) POST /api/chat sends the question (and any photo / video frames) to Puter
// using YOUR Puter token and returns the answer, so visitors never have to log in to Puter.
// Run:  npm install   then   node server.js     (open http://localhost:3000)

const http = require("http");
const fs = require("fs");
const path = require("path");

// Tiny .env reader (no extra package needed).
try {
  fs.readFileSync(path.join(__dirname, ".env"), "utf8").split(/\r?\n/).forEach(function (l) {
    const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  });
} catch (e) {}

const TOKEN = process.env.PUTER_AUTH_TOKEN;
if (!TOKEN) {
  console.error("Missing PUTER_AUTH_TOKEN. Create a file named .env (see .env.example) and put your token in it.");
  process.exit(1);
}
const { init } = require("@heyputer/puter.js/src/init.cjs");
const puter = init(TOKEN);

const PORT = Number(process.env.PORT) || 3000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || ""; // only needed if the website is hosted on a different address
const PER_MINUTE = Number(process.env.LIMIT_PER_MINUTE) || 10; // per visitor
const PER_DAY = Number(process.env.DAILY_LIMIT) || 500; // total chats per day, protects your Puter usage
const TRUST_PROXY = process.env.TRUST_PROXY === "1"; // set to 1 when hosted behind a proxy (Render, Railway, nginx...)

const MAX_BODY = 6000000;        // biggest request accepted (bytes)
const MAX_IMAGES = 4;            // photo = 1 image, video = up to 4 frames
const MAX_IMAGE_CHARS = 1200000; // biggest single image (base64 text length)
const IMG_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/;

// ---------- simple rate limiting ----------
const hits = new Map();
let dayKey = "", dayCount = 0;
function allowed(ip) {
  const now = Date.now(), d = new Date().toISOString().slice(0, 10);
  if (d !== dayKey) { dayKey = d; dayCount = 0; }
  if (dayCount >= PER_DAY) return false;
  const arr = (hits.get(ip) || []).filter(function (t) { return now - t < 60000; });
  if (arr.length >= PER_MINUTE) { hits.set(ip, arr); return false; }
  arr.push(now); hits.set(ip, arr); dayCount++;
  return true;
}
setInterval(function () {
  const now = Date.now();
  hits.forEach(function (a, k) { if (!a.some(function (t) { return now - t < 60000; })) hits.delete(k); });
}, 60000).unref();

// ---------- chat ----------
const RULES =
  "You are the helper chatbot on Swarag-Gyani, an Indian emergency-numbers website. " +
  "Answer whatever the user asks, helpfully and briefly (under 120 words), in the language the user writes in. " +
  "If someone may be in danger or hurt, first tell them to call 112 (or the right number below), then give a few short, safe first steps. " +
  "Never invent phone numbers; use only numbers from the list below, and if unsure say so and suggest 112. " +
  "You are not a doctor or lawyer. " +
  "If the user shares a photo, or frames taken from a video, describe only what matters for their question, " +
  "do not diagnose injuries or illnesses from it, and never identify real people from their faces. " +
  "If the picture shows possible danger (fire, injury, accident, crime), tell them to call 112 first. " +
  "If the picture is unclear, say so.\n";

function replyText(r) {
  if (typeof r === "string") return r;
  const m = r && r.message;
  if (m) {
    const c = m.content;
    if (typeof c === "string") return c;
    if (Array.isArray(c)) return c.map(function (b) { return (b && b.text) || ""; }).join("");
    if (c != null) return String(c);
  }
  return "";
}
function errText(e) {
  if (e && e.message) return e.message;
  try { return JSON.stringify(e); } catch (x) { return String(e); }
}
function readBody(req, max) {
  return new Promise(function (ok, bad) {
    let n = 0, big = false; const c = [];
    req.on("data", function (b) { n += b.length; if (n > max) big = true; else if (!big) c.push(b); });
    req.on("end", function () { if (big) bad(new Error("too big")); else ok(Buffer.concat(c).toString()); });
    req.on("error", bad);
  });
}
function send(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

// Asks Puter. With images it first tries the standard "content parts" format;
// if that fails or comes back empty, it retries with Puter's simple (prompt, images) form.
async function askAI(system, msgs, images, lastText) {
  const payload = [{ role: "system", content: system }].concat(msgs);
  let out = "";
  try {
    out = replyText(await puter.ai.chat(payload)).trim();
  } catch (e) {
    if (!images.length) throw e;
    console.error("image format 1 failed:", errText(e));
  }
  if (out || !images.length) return out;
  return replyText(await puter.ai.chat(system + "\n\nUser: " + lastText, images)).trim();
}

async function chat(req, res) {
  const ip = (TRUST_PROXY && String(req.headers["x-forwarded-for"] || "").split(",")[0].trim()) || req.socket.remoteAddress || "x";
  if (!allowed(ip)) return send(res, 429, { error: "Too many requests. Please wait a minute. For emergencies call 112." });
  try {
    const body = JSON.parse(await readBody(req, MAX_BODY));
    const msgs = (Array.isArray(body.messages) ? body.messages : []).slice(-10)
      .filter(function (m) { return m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"; })
      .map(function (m) { return { role: m.role, content: m.content.slice(0, 500) }; });
    if (!msgs.length || msgs[msgs.length - 1].role !== "user") return send(res, 400, { error: "Bad request" });
    const context = typeof body.context === "string" ? body.context.slice(0, 3000) : "";

    const images = (Array.isArray(body.images) ? body.images : []).slice(0, MAX_IMAGES)
      .filter(function (s) { return typeof s === "string" && s.length <= MAX_IMAGE_CHARS && IMG_RE.test(s); });
    const isVideo = body.kind === "video";
    const lastText = msgs[msgs.length - 1].content;

    if (images.length) {
      const note = isVideo
        ? " (These " + images.length + " images are frames from one video, in time order. Audio is not available.)"
        : "";
      msgs[msgs.length - 1] = {
        role: "user",
        content: [{ type: "text", text: lastText + note }].concat(
          images.map(function (u) { return { type: "image_url", image_url: { url: u } }; })
        )
      };
    }

    const timeout = new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, 60000); });
    const reply = await Promise.race([askAI(RULES + context, msgs, images, lastText), timeout]);
    if (!reply) throw new Error("empty reply");
    send(res, 200, { reply: reply });
  } catch (e) {
    console.error("chat error:", errText(e));
    if (e && e.message === "too big") return send(res, 413, { error: "That file is too large. Please try a smaller photo or video." });
    send(res, 502, { error: "AI unavailable" });
  }
}

// ---------- static files ----------
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp"
};
const BLOCK = new Set(["server.js", "package.json", "package-lock.json"]);
function notFound(res) { res.writeHead(404, { "Content-Type": "text/plain" }); res.end("Not found"); }
function serve(req, res) {
  let p;
  try { p = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch (e) { return notFound(res); }
  if (p === "/") p = "/index.html";
  const file = path.normalize(path.join(__dirname, p));
  const rel = path.relative(__dirname, file);
  if (rel.startsWith("..") || path.isAbsolute(rel) || BLOCK.has(rel) ||
      rel.split(path.sep).some(function (s) { return s.charAt(0) === "." || s === "node_modules" || s === "api"; })) return notFound(res);
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) return notFound(res);
  fs.readFile(file, function (e, data) {
    if (e) return notFound(res);
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
}

http.createServer(function (req, res) {
  if (ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  }
  const url = req.url.split("?")[0];
  if (url === "/api/health") return send(res, 200, { ok: true });
  if (url === "/api/chat") return req.method === "POST" ? chat(req, res) : send(res, 405, { error: "POST only" });
  if (req.method !== "GET" && req.method !== "HEAD") return notFound(res);
  serve(req, res);
}).listen(PORT, function () {
  console.log("Swarag-Gyani running at http://localhost:" + PORT);
});
