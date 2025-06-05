/**
 * server.js
 *
 * A more secure Express proxy for RuneScape's ItemDB detail.json endpoint.
 * 
 * Mitigations included:
 *   1. Restricted CORS (whitelisted origins only).
 *   2. Rate limiting (per-IP).
 *   3. Input validation (ID must be digits).
 *   4. In-memory caching (NodeCache with a short TTL).
 *   5. Helmet for basic security headers.
 *   6. Morgan for request logging.
 *   7. Generic error responses (no upstream status codes leaked).
 *   8. Optional API-key check.
 */

import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import rateLimit from "express-rate-limit";
import NodeCache from "node-cache";
import helmet from "helmet";
import morgan from "morgan";

const app = express();
const PORT = process.env.PORT || 3000;

// ─── 1. BASIC SECURITY HEADERS ─────────────────────────────────────────────────
app.use(helmet());

// ─── 2. REQUEST LOGGING ───────────────────────────────────────────────────────
app.use(morgan("combined"));

// ─── 3. CORS WITH WHITELIST ────────────────────────────────────────────────────
// Replace these with your actual front-end domains (or localhost during dev).
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://your-frontend-domain.com"
];

const corsOptions = {
  origin: (origin, callback) => {
    // If no origin (e.g. cURL, Postman), allow it. Otherwise only allow if in whitelist.
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy: This origin is not allowed."));
    }
  },
  methods: ["GET"],
  maxAge: 86400 // 24 hours preflight cache
};

app.use(cors(corsOptions));

// ─── 4. RATE LIMITER ───────────────────────────────────────────────────────────
// Limit each IP to 60 requests per minute.
const limiter = rateLimit({
  windowMs:  60 * 1000,   // 1 minute
  max:       60,          // limit each IP to 60 requests per windowMs
  statusCode: 429,
  message: { error: "Too many requests – please try again later." }
});
app.use("/api/", limiter);

// ─── 5. IN-MEMORY CACHE ────────────────────────────────────────────────────────
// Cache each item-ID response for 60 seconds (so repeated hits with the same ID
// within that window don’t re-fetch from RuneScape).
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

// ─── 6. OPTIONAL: API-KEY CHECK ─────────────────────────────────────────────────
// If you want to require an API key, set ENV var PROXY_API_KEY and uncomment below.
// Otherwise, remove or comment out this middleware entirely.
/*
app.use((req, res, next) => {
  const key = req.get("X-API-KEY");
  if (!process.env.PROXY_API_KEY) {
    // If no key is configured on the server, skip the check.
    return next();
  }
  if (!key || key !== process.env.PROXY_API_KEY) {
    return res.status(401).json({ error: "Unauthorized: invalid API key." });
  }
  next();
});
*/

// ─── 7. VALIDATE ITEM ID MIDDLEWARE ─────────────────────────────────────────────
function validateItemId(req, res, next) {
  const id = req.params.id;
  // Only allow 1–9 digits:
  if (!/^[0-9]{1,9}$/.test(id)) {
    return res.status(400).json({ error: "Invalid item ID format." });
  }
  next();
}

// ─── 8. MAIN ROUTE ──────────────────────────────────────────────────────────────
app.get("/api/item/:id", validateItemId, async (req, res) => {
  const itemId = req.params.id;
  const cacheKey = `item:${itemId}`;

  // 8a. Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  // 8b. If not cached, fetch from RuneScape API
  const targetUrl = `https://secure.runescape.com/m=itemdb_rs/api/catalogue/detail.json?item=${itemId}`;

  try {
    const upstream = await fetch(targetUrl, { method: "GET" });

    if (!upstream.ok) {
      // If RuneScape returns 404, 500, etc., treat it as a 502 Bad Gateway.
      console.error(
        `[Upstream ${upstream.status}] Fetching item ${itemId} failed.`
      );
      return res
        .status(502)
        .json({ error: "Cannot fetch item data at this time." });
    }

    const data = await upstream.json();

    // 8c. Store in cache (so subsequent calls within TTL don’t hit RS again)
    cache.set(cacheKey, data);

    // 8d. Return JSON to client
    return res.json(data);
  } catch (err) {
    // Log the actual error (stack trace) server-side, but send a generic response.
    console.error("Error fetching from RuneScape API:", err);
    return res
      .status(502)
      .json({ error: "Cannot fetch item data at this time." });
  }
});

// ─── 9. 404 HANDLER ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found." });
});

// ─── 10. START SERVER ──────────────────────────────────────────────────────────
// By default listens on all interfaces (0.0.0.0). If you only want localhost:
//    app.listen(PORT, "127.0.0.1", () => { … });
app.listen(PORT, () => {
  console.log(`RS3 proxy (secure) listening on http://localhost:${PORT}`);
});
