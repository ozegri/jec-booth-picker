#!/usr/bin/env node
/**
 * Refresh booth availability from the official JEC World floor plan.
 *
 * Reads the same endpoint the public floor plan itself uses, rebuilds
 * data/booths.json, and leaves everything else alone. No dependencies —
 * plain Node 18+ (built-in fetch).
 *
 *   node tools/update-booths.mjs
 *
 * Manual decisions (reserved booths, extra non-bookable zones) live in
 * tools/overrides.json and are re-applied on every run, so a daily refresh
 * never wipes them.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://jec.ungerboeck.net/PROD/api/VFPServer/";

/* The floor plan is public: no cookies, no token, no session. These are the
   headers its own JavaScript sends; the endpoint rejects the call without them.
   The user-agent / origin / referer lines matter too — some servers turn away
   requests that do not look like they came from a browser. */
const HEADERS = {
  "content-type": "application/json",
  accept: "application/json",
  "accept-language": "en-US,en;q=0.9",
  appcode: "VFP",
  authorization: "Bearer",
  clientappcategory: "30",
  clientapptype: "2",
  version: "26.2.9669.32536",
  origin: "https://jec.ungerboeck.net",
  referer: "https://jec.ungerboeck.net/PROD/app85.cshtml",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
};

/* VFPConfigID for the JEC World 2027 public plan — the `aat=` token in the
   public link resolves to this on the server side. */
const VFP_CONFIG_ID = 33;

/* Areas that are part of the show, not stands for sale. Matched against the
   labels printed on the plan and against exhibitor names. */
const ZONE =
  /PAVILION|PAVILLON|AGORA|INNOVATION PLANET|INNOVATION AWARDS|STARTUP BOOSTER|STARTUP VILLAGE|LIVE DEMO|REST AREA|TERRACE RESTAURANT|VIP LOUNGE|VIP ROOM|LE CLUB|BUSINESS MEETING|VESTIAIRE|TV STUDIO|SALES OFFICE|CIRCULARITY VILLAGE|CLUBTEX|PRESS CLUB|SPEAKER ROOM|SLIDE BAR|OPEN STAGE|CAMPUS & CAREERS|10 YEARS STARTUP/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callOnce(method, args) {
  const res = await fetch(API + method, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(args),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(
      `${method} → HTTP ${res.status} ${res.statusText}\n` +
        `  first 300 characters of the reply:\n  ${text.slice(0, 300).replace(/\s+/g, " ")}`
    );
  }
  if (!text.trim().startsWith("[")) {
    throw new Error(
      `${method} → expected JSON, got something else (the server may be showing a ` +
        `block page or a login screen)\n  first 300 characters:\n  ${text.slice(0, 300).replace(/\s+/g, " ")}`
    );
  }

  let payload;
  try {
    payload = JSON.parse(JSON.parse(text)[0]);
  } catch (e) {
    throw new Error(`${method} → could not read the reply as JSON: ${e.message}`);
  }
  if (payload.ServerCallSuccessFail === false)
    throw new Error(`${method} → the floor plan service said: ${payload.ErrorMessage}`);
  if (!payload.ReturnObj) throw new Error(`${method} → reply had no data in it`);
  return payload.ReturnObj;
}

async function call(method, args) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await callOnce(method, args);
    } catch (err) {
      lastError = err;
      if (attempt < 3) {
        console.log(`  attempt ${attempt} failed (${err.message.split("\n")[0]}) — retrying…`);
        await sleep(attempt * 4000);
      }
    }
  }
  throw lastError;
}

/**
 * Absolute outline of one booth.
 *
 * The drawing engine (Fabric.js) positions a shape by setting its bounding
 * box's top-left to OriginPoint and then rotating it about the box's CENTRE.
 * Rotating about the origin instead puts every 45° booth ~9 m off.
 */
function shapePoints(el) {
  let pts = [];
  for (const sub of el.Elements || []) {
    const o = sub.OriginPoint || { X: 0, Y: 0 };
    if (sub.Points) for (const p of sub.Points) pts.push([p.X + o.X, p.Y + o.Y]);
  }
  if (!pts.length && el.Points) for (const p of el.Points) pts.push([p.X, p.Y]);
  if (!pts.length) return null;

  const origin = el.OriginPoint || { X: 0, Y: 0 };
  const minX = Math.min(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1]));
  pts = pts.map(([x, y]) => [x - minX + origin.X, y - minY + origin.Y]);

  const angle = el.Rotation ? el.Rotation.Angle || 0 : 0;
  if (angle) {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const cos = Math.cos((angle * Math.PI) / 180);
    const sin = Math.sin((angle * Math.PI) / 180);
    pts = pts.map(([x, y]) => {
      const dx = x - cx;
      const dy = y - cy;
      return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
    });
  }
  return pts;
}

function pointInPolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

const round1 = (n) => Math.round(n * 10) / 10;

function packBooth(code, area, openSides, status, name, points) {
  const p = points.map(([x, y]) => [x / 1000, y / 1000]);
  const xs = p.map((q) => q[0]);
  const ys = p.map((q) => q[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const isRect =
    p.length === 4 &&
    new Set(xs.map(round1)).size === 2 &&
    new Set(ys.map(round1)).size === 2;
  const head = [code, area, Math.min(4, openSides), status, name].join("|");
  return isRect
    ? `${head}|R|${[round1(minX), round1(minY), round1(maxX - minX), round1(maxY - minY)].join(",")}`
    : `${head}|P|${p.map((q) => `${round1(q[0])} ${round1(q[1])}`).join(",")}`;
}

async function main() {
  console.log(`· node ${process.version}, working folder ${ROOT}`);

  // fail early and clearly if the repository is missing files
  for (const needed of ["index.html", "tools/update-booths.mjs"]) {
    try {
      await readFile(resolve(ROOT, needed));
    } catch {
      throw new Error(
        `${needed} is missing from the repository. Upload the whole contents of the ` +
          `"site" folder (index.html, data, tools) and run this again.`
      );
    }
  }

  let overrides = { reserved: {}, zones: {} };
  try {
    overrides = JSON.parse(await readFile(resolve(ROOT, "tools/overrides.json"), "utf8"));
    console.log(`· overrides: ${Object.keys(overrides.reserved || {}).length} reserved booths`);
  } catch {
    console.warn("! tools/overrides.json not found — continuing without manual overrides");
  }
  const reserved = overrides.reserved || {};
  const extraZones = overrides.zones || {};
  const zonePrefixes = overrides.zonePrefixes || {};

  const init = await call("GetInitialData", ["", 0, "", VFP_CONFIG_ID, "", 0]);
  const { OrgCode, EventID, ConfigCode, AvailableDrawingList } = init;
  console.log(`· event ${EventID} / ${ConfigCode}, ${AvailableDrawingList.length} halls`);

  const nameOf = new Map();
  for (const ex of init.ExhibitorList || []) {
    const name = (ex.Name || "").replace(/\s+/g, " ").trim();
    for (const b of ex.BoothNames || []) nameOf.set(String(b).replace(/^\*/, ""), name);
    for (const b of ex.BoothProposals || []) {
      const key = String(b.Name).replace(/^\*/, "");
      if (!nameOf.has(key)) nameOf.set(key, name);
    }
  }

  const halls = {};
  const summary = [];

  for (const { drawingName, drawingSeq } of AvailableDrawingList) {
    const drawing = await call("GetDrawingData", [OrgCode, EventID, ConfigCode, drawingSeq, "*"]);

    /* Every piece of text on the drawing, with where it sits. The name the
       official plan prints inside a booth is the authority: it also marks
       booths that are already allocated (national pavilions, group stands,
       "RESERVED" blocks) while their Availability field still reads 0. */
    const byId = new Map();
    const labels = [];
    for (const layer of drawing.drawing.Layers) {
      for (const el of layer.Elements) {
        if (el.ElementID) byId.set(el.ElementID, el);
        if (el.ElementType === 1 && el.Text && el.OriginPoint) {
          labels.push({
            text: el.Text.replace(/\s+/g, " ").trim().replace(/^\*/, ""),
            at: [el.OriginPoint.X, el.OriginPoint.Y],
          });
        }
      }
    }

    const lines = [];
    const count = { free: 0, booked: 0, zone: 0 };

    for (const booth of Object.values(drawing.booths)) {
      const el = byId.get(booth.ShapeElementID);
      if (!el) continue;
      const pts = shapePoints(el);
      if (!pts) continue;

      const code = booth.AssignCode;
      const bare = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

      // what the plan itself prints inside this booth, minus its number,
      // its area and the dimension marks
      const printed = labels
        .filter((l) => pointInPolygon(l.at, pts))
        .map((l) => l.text)
        .filter((s) => s && bare(s) !== bare(code) && !/^\d+([.,]\d+)?\s*(m²|m2|sqm|m)?$/i.test(s))
        .map((s) => s.replace(/\b\d+([.,]\d+)?\s*(m²|m2|sqm|m)\b/gi, "").trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      let name = printed || nameOf.get(code) || "";
      // a booth the plan has already written a name on is not on sale, whatever
      // its Availability field says
      let status = booth.Availability === 0 && !printed ? 0 : 1;
      if (ZONE.test(name)) status = 2;

      // manual overrides
      for (const [prefix, label] of Object.entries(zonePrefixes))
        if (code.startsWith(prefix)) { status = 2; name = label; }
      if (extraZones[code]) { status = 2; name = extraZones[code]; }
      if (reserved[code]) { status = 1; name = reserved[code]; }

      if (status === 0) name = "";
      name = name.replace(/\|/g, "/").slice(0, 44);

      count[status === 0 ? "free" : status === 1 ? "booked" : "zone"]++;
      lines.push(packBooth(code, booth.Area, booth.OpenSides, status, name, pts));
    }

    halls[drawingName] = lines.join("\n");
    summary.push(`${drawingName}: ${count.free} free, ${count.booked} booked, ${count.zone} show zones`);
  }

  const out = { generated: new Date().toISOString(), source: "JEC World official floor plan", halls };
  await mkdir(resolve(ROOT, "data"), { recursive: true });
  await writeFile(resolve(ROOT, "data/booths.json"), JSON.stringify(out) + "\n");

  console.log(summary.map((s) => "· " + s).join("\n"));
  console.log("· wrote data/booths.json");
}

main().catch((err) => {
  console.error("");
  console.error("======================================================");
  console.error("UPDATE FAILED");
  console.error("======================================================");
  console.error(err.message);
  if (err.cause) console.error("cause:", err.cause.message || err.cause);
  console.error("");
  console.error("If this says HTTP 403 / 429, or shows a block page, the floor plan");
  console.error("service is refusing requests from GitHub's servers. Everything else");
  console.error("on the site keeps working — only the daily refresh is affected.");
  console.error("======================================================");
  process.exit(1);
});
