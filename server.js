import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, "dist");

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_CHAT_ID;

const VISITOR_COOLDOWN_MS = 10 * 60 * 1000;
const visitorLastByIp = new Map();

app.use(express.json({ limit: "16kb" }));

function escapeMarkdown(text) {
  return String(text).replace(/([_*`[\]])/g, "\\$1");
}

function parseDeviceLabel(userAgent) {
  if (!userAgent || typeof userAgent !== "string") return null;
  const ua = userAgent;
  if (/iPhone/i.test(ua)) return "📱 Телефон — iPhone";
  if (/iPad/i.test(ua))   return "📱 Планшет — iPad";
  // Android: try to extract model name between OS version and closing paren
  const m = ua.match(/Android\s[\d.]+;\s*([^)]+)/);
  if (m) {
    let model = m[1].trim().replace(/\s+Build\/\S+/, "").trim();
    // Reduced UA sends single letter "K" — not useful
    if (model && model.length > 1) {
      if (/^SM-/i.test(model)) return "📱 Телефон — Samsung (" + model + ")";
      return "📱 Телефон — " + model;
    }
    return "📱 Телефон — Android";
  }
  if (/Mobile|Android/i.test(ua)) return "📱 Телефон";
  if (/Macintosh|Mac OS X/i.test(ua)) return "🖥 Комп'ютер (Mac)";
  if (/Windows/i.test(ua))            return "🖥 Комп'ютер (Windows)";
  if (/Linux/i.test(ua))              return "🖥 Комп'ютер (Linux)";
  return null;
}

function clientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

async function sendTelegram(text, parseMode) {
  if (!TG_TOKEN || !TG_CHAT) {
    throw new Error("Telegram credentials are not configured");
  }

  const body = { chat_id: TG_CHAT, text };
  if (parseMode) body.parse_mode = parseMode;

  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!data.ok) {
    console.error("Telegram API error:", data);
    throw new Error(data.description || "Telegram send failed");
  }
  return data;
}

function formatBookingMessage({ name, phone, car, booking }) {
  const now = new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kiev" });
  const lines = [
    "📋 *Нова заявка — Alen Studio*",
    "──────────────────",
    "👤 Ім'я: " + escapeMarkdown(name),
    "📞 Телефон: " + escapeMarkdown(phone),
  ];

  if (car) lines.push("🚗 Марка авто: " + escapeMarkdown(car));
  if (booking) {
    lines.push("📦 Послуга: " + escapeMarkdown(booking.name));
    if (booking.chips?.length) {
      lines.push("🔧 Включає: " + escapeMarkdown(booking.chips.join(", ")));
    }
    lines.push("💰 Вартість: " + escapeMarkdown(booking.price) + " грн");
  }
  lines.push("⏰ Час: " + now);

  return lines.join("\n");
}

function formatVisitorMessage({ page, referrer, device, userAgent }) {
  const now = new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kiev" });
  const refLine = referrer ? "🔗 Реферер: " + referrer : "🔗 Прямий захід";
  const deviceLabel =
    parseDeviceLabel(userAgent) ||
    (device === "mobile" ? "📱 Телефон" : "🖥 Комп'ютер");

  return (
    "🔔 Новий відвідувач на сайті!\n" +
    "⏰ Час: " + now + "\n" +
    "📄 Сторінка: " + page + "\n" +
    refLine + "\n" +
    "💻 Пристрій: " + deviceLabel
  );
}

app.post("/api/booking", async (req, res) => {
  try {
    const { name, phone, car, booking } = req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ ok: false, error: "name_required" });
    }
    if (!phone || typeof phone !== "string") {
      return res.status(400).json({ ok: false, error: "phone_required" });
    }

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      return res.status(400).json({ ok: false, error: "phone_invalid" });
    }

    if (car != null && typeof car !== "string") {
      return res.status(400).json({ ok: false, error: "car_invalid" });
    }

    if (booking != null) {
      if (typeof booking !== "object" || !booking.name || !booking.price) {
        return res.status(400).json({ ok: false, error: "booking_invalid" });
      }
      if (booking.chips != null && !Array.isArray(booking.chips)) {
        return res.status(400).json({ ok: false, error: "booking_invalid" });
      }
    }

    const text = formatBookingMessage({
      name: name.trim(),
      phone: phone.trim(),
      car: car?.trim() || undefined,
      booking: booking
        ? {
            name: String(booking.name),
            chips: booking.chips?.map(String),
            price: String(booking.price),
          }
        : undefined,
    });

    await sendTelegram(text, "Markdown");
    res.json({ ok: true });
  } catch (err) {
    console.error("Booking error:", err.message);
    res.status(503).json({ ok: false, error: "send_failed" });
  }
});

app.post("/api/visitor", async (req, res) => {
  try {
    const ip = clientIp(req);
    const last = visitorLastByIp.get(ip) || 0;
    if (Date.now() - last < VISITOR_COOLDOWN_MS) {
      return res.json({ ok: true, skipped: true });
    }

    const { page, referrer, device, userAgent } = req.body || {};
    if (!page || typeof page !== "string") {
      return res.status(400).json({ ok: false, error: "page_required" });
    }
    if (referrer != null && typeof referrer !== "string") {
      return res.status(400).json({ ok: false, error: "referrer_invalid" });
    }
    if (device !== "mobile" && device !== "desktop") {
      return res.status(400).json({ ok: false, error: "device_invalid" });
    }

    const text = formatVisitorMessage({
      page,
      referrer: referrer || undefined,
      device,
      userAgent: typeof userAgent === "string" ? userAgent.slice(0, 500) : undefined,
    });

    await sendTelegram(text);
    visitorLastByIp.set(ip, Date.now());
    res.json({ ok: true });
  } catch (err) {
    console.error("Visitor notification error:", err.message);
    res.status(503).json({ ok: false, error: "send_failed" });
  }
});

app.use(
  "/_assets",
  express.static(path.join(DIST, "_assets"), {
    maxAge: "365d",
    immutable: true,
  })
);
app.use(
  "/assets",
  express.static(path.join(DIST, "assets"), {
    maxAge: "1d",
  })
);
app.use(
  "/draco",
  express.static(path.join(DIST, "draco"), {
    maxAge: "365d",
    immutable: true,
  })
);
app.use(
  "/logos",
  express.static(path.join(DIST, "logos"), {
    maxAge: "7d",
  })
);
app.use(express.static(DIST, { index: false }));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(DIST, "index.html"), (err) => {
    if (err) next(err);
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  if (!TG_TOKEN || !TG_CHAT) {
    console.warn(
      "Warning: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set — Telegram notifications are disabled."
    );
  }
});
