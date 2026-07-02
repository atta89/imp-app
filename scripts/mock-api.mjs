// Dev-only mock of the Go backend for local UI verification (NOT part of the app).
// Run: node scripts/mock-api.mjs   — serves the imp API on http://localhost:8080/api/v1
import { createServer } from "node:http";

const iso = (d) => new Date(d).toISOString();
const agoHours = (h) => iso(Date.now() - h * 3600_000);
const inDays = (d) => iso(Date.now() + d * 86_400_000);
const daysAgo = (d) => iso(Date.now() - d * 86_400_000);

const USER = {
  id: "us1",
  name: "Avery Stone",
  email: "avery@imp.app",
  role: "admin",
  position: "Administrator",
  venueIds: [],
  notifyByEmail: true,
  phone: "+1 555 0100",
  isActive: true,
  createdAt: iso("2026-01-01"),
  updatedAt: iso("2026-06-20"),
};

const tokens = () => ({
  accessToken: "mock-access-token",
  refreshToken: "mock-refresh-token",
  accessExp: Math.floor(Date.now() / 1000) + 3600,
  refreshExp: Math.floor(Date.now() / 1000) + 7 * 86400,
});

const stamp = { isActive: true, createdAt: iso("2026-01-01"), updatedAt: iso("2026-06-20") };

const VENUES = [
  { id: "ve1", name: "Downtown HQ", code: "HQ", type: "office", ...stamp },
  { id: "ve2", name: "Westside Studio", code: "WS", type: "studio", ...stamp },
  { id: "ve3", name: "North Depot", code: "ND", type: "warehouse", ...stamp },
  { id: "ve4", name: "Eastside Hall", code: "EH", type: "venue", ...stamp },
  { id: "ve5", name: "Harbor Annex", code: "HA", type: "annex", ...stamp },
];

const CATEGORIES = [
  { id: "ca1", name: "Laptop", slug: "laptop", customFields: [], ...stamp },
  { id: "ca2", name: "Chair", slug: "chair", customFields: [], ...stamp },
  { id: "ca3", name: "Table", slug: "table", customFields: [], ...stamp },
  { id: "ca4", name: "Projector", slug: "projector", customFields: [], ...stamp },
  { id: "ca5", name: "Camera", slug: "camera", customFields: [], ...stamp },
];

const U = (id, name, position) => ({
  id,
  name,
  email: `${name.toLowerCase().replace(/\s+/g, ".")}@imp.app`,
  role: "staff",
  position,
  venueIds: [],
  notifyByEmail: true,
  ...stamp,
});
const USERS = [
  USER,
  U("us2", "Marco Reyes", "Venue Manager"),
  U("us3", "Nadia Iqbal", "IT Staff"),
  U("us4", "Liam Carter", "Event Manager"),
  U("us5", "Priya Menon", "Operations"),
  U("us6", "Sven Olsen", "Technician"),
];

let seq = 0;
const A = (o) => {
  seq += 1;
  return {
    id: `a${String(seq).padStart(2, "0")}`,
    qrToken: `qr-${seq}`,
    condition: "good",
    isOverdue: false,
    isActive: true,
    createdAt: iso("2026-01-10"),
    photos: [],
    specs: {},
    ...o,
  };
};

const ASSETS = [
  A({ assetTag: "LAP-0001", name: 'MacBook Pro 14"', serialNumber: "C02ZK1", categoryId: "ca1", homeVenueId: "ve1", currentVenueId: "ve1", status: "in_use", responsibleUserId: "us3", updatedAt: agoHours(10) }),
  A({ assetTag: "LAP-0002", name: 'MacBook Air 13"', serialNumber: "C02ZK2", categoryId: "ca1", homeVenueId: "ve1", currentVenueId: "ve2", status: "in_use", responsibleUserId: "us4", updatedAt: agoHours(30), expectedReturnDate: daysAgo(4), isOverdue: true }),
  A({ assetTag: "CHR-0014", name: "Aeron Chair", categoryId: "ca2", homeVenueId: "ve4", currentVenueId: "ve4", status: "available", condition: "fair", responsibleUserId: "us2", updatedAt: daysAgo(8) }),
  A({ assetTag: "PRJ-0003", name: "Epson EB-2250U", serialNumber: "X5J9PR", categoryId: "ca4", homeVenueId: "ve4", currentVenueId: "ve5", status: "in_use", responsibleUserId: "us4", updatedAt: agoHours(5), expectedReturnDate: inDays(5) }),
  A({ assetTag: "CAM-0007", name: "Sony A7 IV", serialNumber: "SN-AA71", categoryId: "ca5", homeVenueId: "ve2", currentVenueId: "ve2", status: "in_repair", condition: "poor", responsibleUserId: "us6", updatedAt: daysAgo(3) }),
  A({ assetTag: "TBL-0021", name: "Folding Table 6ft", categoryId: "ca3", homeVenueId: "ve3", currentVenueId: "ve3", status: "available", responsibleUserId: "us5", updatedAt: daysAgo(11) }),
  A({ assetTag: "LAP-0008", name: "Dell XPS 15", serialNumber: "DX15-92", categoryId: "ca1", homeVenueId: "ve1", currentVenueId: "ve3", status: "in_use", condition: "fair", responsibleUserId: "us3", updatedAt: daysAgo(1), expectedReturnDate: daysAgo(5), isOverdue: true }),
  A({ assetTag: "CHR-0031", name: "Steelcase Leap", categoryId: "ca2", homeVenueId: "ve4", currentVenueId: "ve4", status: "retired", condition: "poor", responsibleUserId: "us2", updatedAt: daysAgo(27) }),
  A({ assetTag: "CAM-0012", name: "Canon EOS R6", serialNumber: "CR6-118", categoryId: "ca5", homeVenueId: "ve2", currentVenueId: "ve1", status: "in_use", responsibleUserId: "us4", updatedAt: agoHours(2), expectedReturnDate: inDays(9) }),
  A({ assetTag: "PRJ-0006", name: "BenQ TK700", categoryId: "ca4", homeVenueId: "ve5", currentVenueId: "ve5", status: "available", condition: "new", responsibleUserId: "us5", updatedAt: daysAgo(4) }),
  A({ assetTag: "LAP-0015", name: "ThinkPad X1", serialNumber: "TP-X1-7", categoryId: "ca1", homeVenueId: "ve3", currentVenueId: "ve3", status: "lost", responsibleUserId: "us3", updatedAt: daysAgo(16) }),
  A({ assetTag: "TBL-0009", name: "Conference Table", categoryId: "ca3", homeVenueId: "ve1", currentVenueId: "ve1", status: "in_use", responsibleUserId: "us1", updatedAt: agoHours(20) }),
  A({ assetTag: "CHR-0042", name: "Task Chair", categoryId: "ca2", homeVenueId: "ve2", currentVenueId: "ve4", status: "available", condition: "fair", responsibleUserId: "us2", updatedAt: daysAgo(9) }),
  A({ assetTag: "CAM-0019", name: "GoPro Hero 12", serialNumber: "GP12-44", categoryId: "ca5", homeVenueId: "ve5", currentVenueId: "ve5", status: "in_repair", condition: "poor", responsibleUserId: "us6", updatedAt: daysAgo(5) }),
  A({ assetTag: "LAP-0022", name: 'MacBook Pro 16"', serialNumber: "MBP16-3", categoryId: "ca1", homeVenueId: "ve1", currentVenueId: "ve1", status: "available", condition: "new", responsibleUserId: "us3", updatedAt: agoHours(33) }),
  A({ assetTag: "PRJ-0011", name: "ViewSonic PX748", categoryId: "ca4", homeVenueId: "ve4", currentVenueId: "ve2", status: "in_use", responsibleUserId: "us4", updatedAt: daysAgo(3), expectedReturnDate: inDays(2) }),
  A({ assetTag: "TBL-0033", name: "Standing Desk", categoryId: "ca3", homeVenueId: "ve3", currentVenueId: "ve3", status: "available", responsibleUserId: "us5", updatedAt: daysAgo(10) }),
  A({ assetTag: "CHR-0050", name: "Bar Stool", categoryId: "ca2", homeVenueId: "ve5", currentVenueId: "ve5", status: "available", condition: "fair", responsibleUserId: "us5", updatedAt: daysAgo(12) }),
  A({ assetTag: "LAP-0027", name: "Surface Laptop 5", serialNumber: "SL5-201", categoryId: "ca1", homeVenueId: "ve2", currentVenueId: "ve3", status: "in_use", responsibleUserId: "us3", updatedAt: agoHours(40), expectedReturnDate: daysAgo(3), isOverdue: true }),
  A({ assetTag: "CAM-0024", name: "Nikon Z6 II", serialNumber: "NZ6-88", categoryId: "ca5", homeVenueId: "ve1", currentVenueId: "ve1", status: "in_use", responsibleUserId: "us4", updatedAt: daysAgo(2) }),
  A({ assetTag: "PRJ-0014", name: "Optoma UHD38", categoryId: "ca4", homeVenueId: "ve5", currentVenueId: "ve4", status: "in_use", responsibleUserId: "us4", updatedAt: daysAgo(6), expectedReturnDate: inDays(3) }),
  A({ assetTag: "TBL-0040", name: "Round Table 4ft", categoryId: "ca3", homeVenueId: "ve4", currentVenueId: "ve4", status: "retired", condition: "poor", responsibleUserId: "us2", updatedAt: daysAgo(29) }),
  A({ assetTag: "LAP-0030", name: "Dell Latitude", serialNumber: "DL-3300", categoryId: "ca1", homeVenueId: "ve3", currentVenueId: "ve3", status: "available", condition: "fair", responsibleUserId: "us5", updatedAt: daysAgo(8) }),
  A({ assetTag: "CHR-0061", name: "Ergohuman", categoryId: "ca2", homeVenueId: "ve1", currentVenueId: "ve1", status: "in_use", responsibleUserId: "us1", updatedAt: agoHours(12) }),
  A({ assetTag: "CAM-0029", name: "Fujifilm X-T5", serialNumber: "FX-T5-9", categoryId: "ca5", homeVenueId: "ve2", currentVenueId: "ve2", status: "available", condition: "new", responsibleUserId: "us6", updatedAt: agoHours(8) }),
  A({ assetTag: "PRJ-0018", name: "LG CineBeam", categoryId: "ca4", homeVenueId: "ve4", currentVenueId: "ve4", status: "in_repair", condition: "poor", responsibleUserId: "us6", updatedAt: daysAgo(7) }),
];

const SUMMARY = {
  totalAssets: 142,
  byStatus: { available: 60, in_use: 55, in_repair: 8, retired: 14, lost: 5 },
  byVenue: VENUES.map((v, i) => ({
    venueId: v.id,
    venueName: v.name,
    count: [48, 33, 27, 21, 13][i],
  })),
  awayFromHome: 18,
  inRepair: 8,
  overdue: 4,
};

const REPAIRS = [
  { id: "r1", assetId: "a05", issue: "Shutter mechanism jammed", reportedBy: "us6", reportedAt: daysAgo(3), status: "in_progress", vendor: "CameraFix Co", createdAt: daysAgo(3), updatedAt: daysAgo(2) },
  { id: "r2", assetId: "a14", issue: "Won't power on after a drop", reportedBy: "us6", reportedAt: daysAgo(5), status: "open", createdAt: daysAgo(5), updatedAt: daysAgo(5) },
];

const PURCHASE_ORDERS = [
  { id: "po1", poNumber: "PO-1001", supplier: { name: "TechWorld", contact: "sales@techworld.com" }, responsibleUserId: "us3", orderDate: daysAgo(20), status: "ordered", lineItems: [{ categoryId: "ca1", name: 'MacBook Pro 14"', quantity: 5 }, { categoryId: "ca5", name: "Sony A7 IV", quantity: 2 }], createdBy: USER.id, createdAt: daysAgo(20), updatedAt: daysAgo(20) },
  { id: "po2", poNumber: "PO-1002", supplier: { name: "OfficeSupply Inc" }, responsibleUserId: "us5", orderDate: daysAgo(40), receivedDate: daysAgo(35), status: "received", lineItems: [{ categoryId: "ca2", name: "Task Chair", quantity: 20 }], createdBy: USER.id, createdAt: daysAgo(40), updatedAt: daysAgo(35) },
];

// ── Bulk import (dev harness for the spec'd /imports/* contract) ──
const IMPORT_JOBS = {};
let importSeq = 0;
function makeImportPreview() {
  importSeq += 1;
  const id = `imp${importSeq}`;
  const job = {
    id,
    filename: "purchase-orders.csv",
    uploadedBy: USER.id,
    status: "preview_ready",
    options: {},
    counts: { posTotal: 3, posCreated: 0, assetsCreated: 0, rowsSkipped: 0, rowsErrored: 1 },
    errors: [{ row: 5, field: "quantity", message: "must be a positive integer" }],
    createdAt: iso(Date.now()),
  };
  IMPORT_JOBS[id] = job;
  const posPreview = [
    { poNumber: "PO-2001", lineItems: 2, assetCount: 7, categories: ["Laptop", "Camera"], venues: ["Downtown HQ"], skipExisting: false },
    { poNumber: "PO-2002", lineItems: 1, assetCount: 20, categories: ["Chair"], venues: ["North Depot"], skipExisting: false },
    { poNumber: "PO-1001", lineItems: 1, assetCount: 3, categories: ["Projector"], venues: ["Eastside Hall"], skipExisting: true },
  ];
  return { job, posPreview };
}

let assetSeq = ASSETS.length;
function generateAssets(po, venueId) {
  const ids = [];
  for (const li of po.lineItems) {
    for (let k = 0; k < li.quantity; k++) {
      assetSeq += 1;
      const id = `g${assetSeq}`;
      ASSETS.push({
        id,
        assetTag: `GEN-${String(assetSeq).padStart(4, "0")}`,
        qrToken: `qr-gen-${assetSeq}`,
        name: li.name,
        categoryId: li.categoryId,
        homeVenueId: venueId,
        currentVenueId: venueId,
        status: "available",
        condition: "new",
        responsibleUserId: po.responsibleUserId,
        purchaseOrderId: po.id,
        isOverdue: false,
        isActive: true,
        photos: [],
        specs: {},
        createdAt: iso(Date.now()),
        updatedAt: iso(Date.now()),
      });
      ids.push(id);
    }
  }
  return ids;
}

function listAssets(q) {
  const truthy = (s) => s === "true" || s === "1";
  let items = ASSETS.slice();
  const text = (q.get("q") || "").toLowerCase();
  if (text)
    items = items.filter((a) =>
      `${a.assetTag} ${a.name} ${a.serialNumber || ""}`.toLowerCase().includes(text),
    );
  if (q.get("venue")) items = items.filter((a) => a.homeVenueId === q.get("venue"));
  if (q.get("currentVenue"))
    items = items.filter((a) => a.currentVenueId === q.get("currentVenue"));
  if (q.get("category")) items = items.filter((a) => a.categoryId === q.get("category"));
  if (q.get("status")) items = items.filter((a) => a.status === q.get("status"));
  if (q.get("responsible"))
    items = items.filter((a) => a.responsibleUserId === q.get("responsible"));
  if (truthy(q.get("away")))
    items = items.filter((a) => a.homeVenueId !== a.currentVenueId);
  if (truthy(q.get("overdue"))) items = items.filter((a) => a.isOverdue);

  const total = items.length;
  const limit = Math.max(1, parseInt(q.get("limit") || "25", 10));
  const page = Math.max(1, parseInt(q.get("page") || "1", 10));
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    meta: {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
    },
  };
}

let mvSeq = 0;
const mv = (assetId, o) => {
  mvSeq += 1;
  return { id: `m${mvSeq}`, assetId, performedBy: USER.id, performedAt: iso(Date.now()), ...o };
};
// Seeded history for the first asset so the timeline has content.
const HISTORY = {
  a01: [
    mv("a01", { type: "transfer", fromVenueId: "ve2", toVenueId: "ve1", reason: "Returned after the launch event", performedAt: daysAgo(1) }),
    mv("a01", { type: "transfer", fromVenueId: "ve1", toVenueId: "ve2", notes: "On loan for filming", performedAt: daysAgo(6) }),
    mv("a01", { type: "status_change", fromStatus: "available", toStatus: "in_use", performedAt: daysAgo(12) }),
    mv("a01", { type: "custody_change", toUserId: "us3", reason: "Assigned to IT", performedAt: daysAgo(25) }),
  ],
};
const pushHistory = (assetId, o) => {
  (HISTORY[assetId] ||= []).unshift(mv(assetId, o));
};

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  "access-control-allow-headers": "authorization,content-type",
};

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json", ...CORS });
  res.end(JSON.stringify(body));
}

function sendRaw(res, status, contentType, body) {
  res.writeHead(status, { "content-type": contentType, ...CORS });
  res.end(body);
}

const nameOf = (arr, id) => arr.find((x) => x.id === id)?.name;

function fauxQrSvg(seed) {
  const n = 25;
  let h = 0;
  for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  let rng = h || 1;
  const rand = () => {
    rng = (rng * 1103515245 + 12345) >>> 0;
    return rng / 0xffffffff;
  };
  let rects = "";
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (rand() > 0.5) rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  // three finder squares
  const finder = (fx, fy) =>
    `<rect x="${fx}" y="${fy}" width="7" height="7" fill="none" stroke="#101828" stroke-width="1"/><rect x="${fx + 2}" y="${fy + 2}" width="3" height="3"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><g fill="#101828">${rects}${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}</g></svg>`;
}

const findAsset = (id) => ASSETS.find((a) => a.id === id);

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  const url = new URL(req.url, "http://localhost:8080");
  const path = url.pathname.replace(/^\/api\/v1/, "");
  const body = req.method === "POST" || req.method === "PUT" ? await readBody(req) : {};

  if (path === "/auth/login" || path === "/auth/refresh")
    return send(res, 200, { data: { user: USER, tokens: tokens() } });
  if (path === "/auth/me") return send(res, 200, { data: USER });
  if (path === "/dashboard/summary") return send(res, 200, { data: SUMMARY });
  if (path === "/venues") {
    if (req.method === "POST") {
      const v = { id: `ve${Date.now()}`, isActive: true, ...body, createdAt: iso(Date.now()), updatedAt: iso(Date.now()) };
      VENUES.push(v);
      return send(res, 201, { data: v });
    }
    return send(res, 200, { data: VENUES });
  }
  if (path === "/categories") {
    if (req.method === "POST") {
      const c = { id: `ca${Date.now()}`, isActive: true, customFields: [], ...body, createdAt: iso(Date.now()), updatedAt: iso(Date.now()) };
      CATEGORIES.push(c);
      return send(res, 201, { data: c });
    }
    return send(res, 200, { data: CATEGORIES });
  }
  if (path === "/users") {
    if (req.method === "POST") {
      const u = { id: `us${Date.now()}`, role: "staff", venueIds: [], notifyByEmail: true, isActive: true, ...body, createdAt: iso(Date.now()), updatedAt: iso(Date.now()) };
      delete u.password;
      USERS.push(u);
      return send(res, 201, { data: u });
    }
    return send(res, 200, { data: USERS });
  }
  const userId = path.match(/^\/users\/([^/]+)$/);
  if (userId) {
    const u = USERS.find((x) => x.id === userId[1]);
    if (!u) return send(res, 404, { error: { kind: "not_found", message: "User not found." } });
    if (req.method === "PUT") {
      const patch = { ...body };
      delete patch.password;
      Object.assign(u, patch, { updatedAt: iso(Date.now()) });
      return send(res, 200, { data: u });
    }
    if (req.method === "DELETE") {
      if (ASSETS.some((a) => a.responsibleUserId === u.id))
        return send(res, 409, { error: { kind: "conflict", message: "User still responsible for assets." } });
      USERS.splice(USERS.indexOf(u), 1);
      return sendRaw(res, 204, "application/json", "");
    }
    return send(res, 200, { data: u });
  }
  if (path === "/me/notification-preferences") {
    if (req.method === "PUT") {
      USER.notifyByEmail = !!body.notifyByEmail;
      return send(res, 200, { data: { notifyByEmail: USER.notifyByEmail } });
    }
    return send(res, 200, { data: { notifyByEmail: USER.notifyByEmail } });
  }
  if (path === "/reports/inventory-by-venue") {
    const rows = VENUES.map((v) => {
      const inV = ASSETS.filter((a) => a.homeVenueId === v.id);
      const byStatus = {};
      for (const a of inV) byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      return { venueId: v.id, venueName: v.name, total: inV.length, byStatus };
    }).filter((r) => r.total > 0);
    return send(res, 200, { data: rows });
  }
  if (path === "/reports/assets-away")
    return send(res, 200, { data: ASSETS.filter((a) => a.homeVenueId !== a.currentVenueId) });
  if (path === "/reports/assets-overdue")
    return send(res, 200, { data: ASSETS.filter((a) => a.isOverdue) });
  if (path === "/reports/in-repair")
    return send(res, 200, { data: REPAIRS.filter((r) => r.status === "open" || r.status === "in_progress") });
  if (path === "/reports/by-responsible") {
    const map = new Map();
    for (const a of ASSETS) {
      if (!a.responsibleUserId) continue;
      map.set(a.responsibleUserId, (map.get(a.responsibleUserId) || 0) + 1);
    }
    const rows = [...map.entries()].map(([uid, count]) => {
      const u = USERS.find((x) => x.id === uid);
      return { userId: uid, userName: u?.name ?? "Unknown", position: u?.position, count };
    });
    return send(res, 200, { data: rows });
  }

  const venueId = path.match(/^\/venues\/([^/]+)$/);
  if (venueId) {
    const v = VENUES.find((x) => x.id === venueId[1]);
    if (!v) return send(res, 404, { error: { kind: "not_found", message: "Venue not found." } });
    if (req.method === "PUT") {
      Object.assign(v, body, { updatedAt: iso(Date.now()) });
      return send(res, 200, { data: v });
    }
    if (req.method === "DELETE") {
      if (ASSETS.some((a) => a.homeVenueId === v.id || a.currentVenueId === v.id))
        return send(res, 409, { error: { kind: "conflict", message: "Venue still has assets." } });
      VENUES.splice(VENUES.indexOf(v), 1);
      return sendRaw(res, 204, "application/json", "");
    }
    return send(res, 200, { data: v });
  }

  const catId = path.match(/^\/categories\/([^/]+)$/);
  if (catId) {
    const c = CATEGORIES.find((x) => x.id === catId[1]);
    if (!c) return send(res, 404, { error: { kind: "not_found", message: "Category not found." } });
    if (req.method === "PUT") {
      Object.assign(c, body, { updatedAt: iso(Date.now()) });
      return send(res, 200, { data: c });
    }
    if (req.method === "DELETE") {
      if (ASSETS.some((a) => a.categoryId === c.id))
        return send(res, 409, { error: { kind: "conflict", message: "Category still has assets." } });
      CATEGORIES.splice(CATEGORIES.indexOf(c), 1);
      return sendRaw(res, 204, "application/json", "");
    }
    return send(res, 200, { data: c });
  }
  if (path === "/assets" && req.method === "GET")
    return send(res, 200, listAssets(url.searchParams));

  // Bulk import
  if (path === "/imports/purchase-orders/template")
    return sendRaw(res, 200, "text/csv", "poNumber,supplierName,categorySlug,itemName,quantity,assetTag,status,currentVenueCode,condition,responsibleUserEmail\nPO-2001,TechWorld,laptop,MacBook Pro 14\",5,,,,,\n");
  if (path === "/imports/purchase-orders/validate" && req.method === "POST")
    return send(res, 200, { data: makeImportPreview() });
  if (path === "/imports/purchase-orders/commit" && req.method === "POST") {
    const job = IMPORT_JOBS[body.importJobId];
    if (!job) return send(res, 404, { error: { kind: "not_found", message: "Import job not found." } });
    job.status = "importing";
    job.options = body.options || {};
    job.counts = { posTotal: 3, posCreated: 0, assetsCreated: 0, rowsSkipped: job.options.importValidOnly ? 1 : 0, rowsErrored: 0 };
    return send(res, 200, { data: job });
  }
  const importReport = path.match(/^\/imports\/([^/]+)\/report$/);
  if (importReport)
    return sendRaw(res, 200, "text/csv", "poNumber,assetTag,name,result\nPO-2001,GEN-0001,MacBook Pro 14\",created\nPO-2002,GEN-0008,Task Chair,created\n");
  const importId = path.match(/^\/imports\/([^/]+)$/);
  if (importId) {
    const job = IMPORT_JOBS[importId[1]];
    if (!job) return send(res, 404, { error: { kind: "not_found", message: "Import job not found." } });
    // Simulate progress: advance one PO per poll until done.
    if (job.status === "importing" && job.counts.posCreated < job.counts.posTotal) {
      job.counts.posCreated += 1;
      job.counts.assetsCreated += [7, 20, 3][job.counts.posCreated - 1] ?? 5;
      if (job.counts.posCreated >= job.counts.posTotal) {
        job.status = "completed";
        job.completedAt = iso(Date.now());
      }
    }
    return send(res, 200, { data: job });
  }

  // Purchase orders
  if (path === "/purchase-orders") {
    if (req.method === "POST") {
      const po = { id: `po${Date.now()}`, status: "ordered", createdBy: USER.id, createdAt: iso(Date.now()), updatedAt: iso(Date.now()), ...body };
      PURCHASE_ORDERS.unshift(po);
      return send(res, 201, { data: po });
    }
    let items = PURCHASE_ORDERS.slice();
    if (url.searchParams.get("status"))
      items = items.filter((p) => p.status === url.searchParams.get("status"));
    return send(res, 200, {
      data: items,
      meta: { pagination: { page: 1, limit: 25, total: items.length, totalPages: 1 } },
    });
  }
  const poReceive = path.match(/^\/purchase-orders\/([^/]+)\/receive$/);
  if (poReceive && req.method === "POST") {
    const po = PURCHASE_ORDERS.find((p) => p.id === poReceive[1]);
    if (!po) return send(res, 404, { error: { kind: "not_found", message: "PO not found." } });
    const ids = generateAssets(po, body.venueId);
    po.status = "received";
    po.receivedDate = iso(Date.now());
    po.updatedAt = iso(Date.now());
    return send(res, 200, { data: { purchaseOrder: po, generatedAssetIds: ids } });
  }
  const poId = path.match(/^\/purchase-orders\/([^/]+)$/);
  if (poId) {
    const po = PURCHASE_ORDERS.find((p) => p.id === poId[1]);
    if (!po) return send(res, 404, { error: { kind: "not_found", message: "PO not found." } });
    if (req.method === "PUT") {
      Object.assign(po, body, { updatedAt: iso(Date.now()) });
      return send(res, 200, { data: po });
    }
    return send(res, 200, { data: po });
  }

  // Repairs
  if (path === "/repairs") {
    if (req.method === "POST") {
      const asset = findAsset(body.assetId);
      if (asset) {
        asset.status = "in_repair";
        asset.updatedAt = iso(Date.now());
        pushHistory(asset.id, { type: "repair_in", notes: body.issue });
      }
      const r = { id: `r${Date.now()}`, assetId: body.assetId, issue: body.issue, vendor: body.vendor, status: "open", reportedBy: USER.id, reportedAt: iso(Date.now()), createdAt: iso(Date.now()), updatedAt: iso(Date.now()) };
      REPAIRS.unshift(r);
      return send(res, 201, { data: r });
    }
    let items = REPAIRS.slice();
    if (url.searchParams.get("status"))
      items = items.filter((r) => r.status === url.searchParams.get("status"));
    return send(res, 200, {
      data: items,
      meta: { pagination: { page: 1, limit: 25, total: items.length, totalPages: 1 } },
    });
  }
  const repairId = path.match(/^\/repairs\/([^/]+)$/);
  if (repairId) {
    const r = REPAIRS.find((x) => x.id === repairId[1]);
    if (!r) return send(res, 404, { error: { kind: "not_found", message: "Repair not found." } });
    if (req.method === "PUT") {
      Object.assign(r, body, { updatedAt: iso(Date.now()) });
      const asset = findAsset(r.assetId);
      if (asset) {
        if (body.status === "completed") {
          asset.status = "available";
          pushHistory(asset.id, { type: "repair_out", notes: body.resolution });
        } else if (body.status === "unrepairable") {
          asset.status = "retired";
          pushHistory(asset.id, { type: "status_change", fromStatus: "in_repair", toStatus: "retired", reason: "Unrepairable" });
        }
      }
      return send(res, 200, { data: r });
    }
    return send(res, 200, { data: r });
  }

  // PUBLIC scan resolution (contact details masked).
  const scan = path.match(/^\/scan\/([^/]+)$/);
  if (scan) {
    const asset = ASSETS.find((a) => a.qrToken === scan[1]);
    if (!asset)
      return send(res, 404, { error: { kind: "not_found", message: "Unknown code." } });
    const u = USERS.find((x) => x.id === asset.responsibleUserId);
    return send(res, 200, {
      data: {
        asset,
        responsiblePerson: u
          ? { id: u.id, name: u.name, role: u.role, position: u.position }
          : undefined,
        homeVenueName: nameOf(VENUES, asset.homeVenueId),
        currentVenueName: nameOf(VENUES, asset.currentVenueId),
        categoryName: nameOf(CATEGORIES, asset.categoryId),
      },
    });
  }

  const qr = path.match(/^\/assets\/([^/]+)\/qr$/);
  if (qr) {
    const asset = findAsset(qr[1]);
    return sendRaw(res, 200, "image/svg+xml", fauxQrSvg(asset?.qrToken ?? qr[1]));
  }

  const history = path.match(/^\/assets\/([^/]+)\/history$/);
  if (history) return send(res, 200, { data: HISTORY[history[1]] ?? [] });

  const transfer = path.match(/^\/assets\/([^/]+)\/transfer$/);
  if (transfer && req.method === "POST") {
    const asset = findAsset(transfer[1]);
    if (!asset) return send(res, 404, { error: { kind: "not_found", message: "Asset not found." } });
    pushHistory(asset.id, { type: "transfer", fromVenueId: asset.currentVenueId, toVenueId: body.toVenueId, notes: body.notes });
    asset.currentVenueId = body.toVenueId;
    asset.expectedReturnDate = body.expectedReturnDate || undefined;
    asset.updatedAt = iso(Date.now());
    return send(res, 200, { data: asset });
  }

  const status = path.match(/^\/assets\/([^/]+)\/status$/);
  if (status && req.method === "POST") {
    const asset = findAsset(status[1]);
    if (!asset) return send(res, 404, { error: { kind: "not_found", message: "Asset not found." } });
    pushHistory(asset.id, { type: "status_change", fromStatus: asset.status, toStatus: body.status, reason: body.reason });
    asset.status = body.status;
    asset.updatedAt = iso(Date.now());
    return send(res, 200, { data: asset });
  }

  const assign = path.match(/^\/assets\/([^/]+)\/assign$/);
  if (assign && req.method === "POST") {
    const asset = findAsset(assign[1]);
    if (!asset) return send(res, 404, { error: { kind: "not_found", message: "Asset not found." } });
    pushHistory(asset.id, { type: "custody_change", fromUserId: asset.responsibleUserId, toUserId: body.responsibleUserId, notes: body.notes });
    asset.responsibleUserId = body.responsibleUserId;
    asset.updatedAt = iso(Date.now());
    return send(res, 200, { data: asset });
  }

  const condition = path.match(/^\/assets\/([^/]+)\/condition$/);
  if (condition && req.method === "POST") {
    const asset = findAsset(condition[1]);
    if (!asset) return send(res, 404, { error: { kind: "not_found", message: "Asset not found." } });
    if (!["new", "good", "fair", "poor"].includes(body.condition))
      return send(res, 400, { error: { kind: "validation", fields: { condition: "Invalid condition." } } });
    if (body.condition !== asset.condition) {
      pushHistory(asset.id, { type: "condition_change", fromCondition: asset.condition, toCondition: body.condition, notes: body.notes });
      asset.condition = body.condition;
      asset.updatedAt = iso(Date.now());
    }
    return send(res, 200, { data: asset });
  }

  const one = path.match(/^\/assets\/([^/]+)$/);
  if (one) {
    const asset = findAsset(one[1]);
    if (asset) return send(res, 200, { data: asset });
    return send(res, 404, { error: { kind: "not_found", message: "Asset not found." } });
  }

  return send(res, 200, {
    data: [],
    meta: { pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } },
  });
});

server.listen(8080, () => console.log("mock api → http://localhost:8080/api/v1"));
