/* OrderBoard — turn a pasted WhatsApp / text message into an order.

   Runs entirely in the browser: no AI service, no API key, works offline.
   It understands messages like

       [15/11/26, 4:30 PM] Harpreet Kaur: Hi, need for Saturday 5pm
       5 lb besan laddu
       3lbs kaju barfi, 2 lb jalebi
       20 samosa
       less sweet please

   and returns { customer_name, customer_phone, order_name, due_date,
   due_time, urgent, notes, items[], skipped[], found{} }.
   Anything it is not sure about is left blank (and listed in `skipped`)
   so the front desk can check it before saving. */
(function () {
  const OB = (window.OB = window.OB || {});

  /* ---------- vocabulary ---------- */

  const UNIT_WORDS = [
    [/^(lbs?|pounds?|#|ਪੌਂਡ|ਪਾਊਂਡ)$/, "lb"],
    [/^(kgs?|kilos?|kilograms?|ਕਿਲੋ)$/, "kg"],
    [/^(g|gm|gms|grams?|ਗ੍ਰਾਮ)$/, "gm"],
    [/^(pcs?|pieces?|nos?|piece|ਪੀਸ)$/, "pcs"],
    [/^(dozens?|dz|doz|ਦਰਜਨ)$/, "dozen"],
    [/^(box|boxes|packets?|pkts?|dabba|dabbe|ਡੱਬਾ|ਡੱਬੇ)$/, "box"],
    [/^(trays?)$/, "tray"],
    [/^(plates?)$/, "plate"]
  ];
  const UNIT_RE_SRC = "lbs?|pounds?|#|kgs?|kilos?|kilograms?|gms?|grams?|g|pcs?|pieces?|nos?|dozens?|dz|doz|box(?:es)?|packets?|pkts?|dabba|dabbe|trays?|plates?|ਪੌਂਡ|ਪਾਊਂਡ|ਕਿਲੋ|ਗ੍ਰਾਮ|ਪੀਸ|ਦਰਜਨ|ਡੱਬਾ|ਡੱਬੇ";

  const NUM_WORDS = {
    half: 0.5, quarter: 0.25, a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
    fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, hundred: 100
  };
  const FRAC = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };

  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

  const OCCASIONS = [
    "baby shower", "birthday party", "birthday", "wedding", "engagement", "roka", "shagun",
    "anniversary", "diwali", "lohri", "rakhi", "gurpurab", "akhand path", "sehaj path",
    "path", "kirtan", "party", "housewarming", "graduation", "christmas", "eid", "puja", "pooja"
  ];

  // words that carry no meaning for the order — dropped from item names
  const FILLER = new Set(("i we need want would like to get please pls plz can could you send " +
    "make order ordering also and of the for me us my our some kindly add want required " +
    "give have will take book x each total hi hello hey ok okay thanks thank i'm im i’m looking " +
    "is it possible just wondering hoping items item list details pickup pick up order: ji").split(" "));

  // a line that is only one of these is chit-chat, not order content
  const CHAT_RE = /^(hi+|hello|hey|hlo|sat\s*sri\s*akal|ssa|good\s+(morning|afternoon|evening)|thanks?|thank\s*you|thx|ty|ok(ay)?|k|sure|yes|no|please|pls|regards|bye|done|noted|perfect|great|cool|[\s\p{Extended_Pictographic}.!,]*)$/iu;

  // a leftover line with these words is probably an instruction for the kitchen
  const NOTE_HINT = /\b(less|extra|no|not|without|sugar\s*free|sugarfree|separate(ly)?|pack\w*|gift\w*|deliver\w*|address|paid|deposit|advance|cash|fresh|soft|hot|cut|decorat\w*|label\w*|ribbon|eggless|veg|small|big|large|medium|mild|spicy|crispy)\b/i;

  // words that cannot be a person's name ("I'm looking…", "this is for…")
  const NOT_NAME = new Set(("looking ordering wondering going trying planning calling writing " +
    "for the a an to my our your about regarding re order interested not here just also from " +
    "available open sorry fine good great ok okay sure ready done in on at with need want " +
    "hoping asking texting messaging coming").split(" "));

  /* ---------- small helpers ---------- */

  const GURMUKHI_DIGITS = /[੦-੯]/g;
  function asciiDigits(s) {
    return s.replace(GURMUKHI_DIGITS, (d) => String(d.charCodeAt(0) - 0x0A66));
  }

  function compact(s) {
    return String(s || "").toLowerCase().normalize("NFC").replace(/[^\p{L}\p{M}\d]+/gu, "");
  }

  // light spelling clean-up so laddu / burfi / samosas all look alike
  function canonWord(w) {
    w = w.toLowerCase();
    w = w.replace(/^(laddoo|laddu|ladu|laddus|ladoos|laddoos|laddo)$/, "ladoo")
         .replace(/^(burfi|barfee|burfee|barfis|burfis)$/, "barfi")
         .replace(/^(jamuns|jamoon|jamon)$/, "jamun")
         .replace(/^(jalebis|jalebee|jilebi|jalabi)$/, "jalebi")
         .replace(/^(samosas|samose|samosay)$/, "samosa")
         .replace(/^(pakoras|pakode|pakoda|pakore|pakodas)$/, "pakora")
         .replace(/^(rasgullas|rasgulle)$/, "rasgulla")
         .replace(/^(pinnis|pinniyan|pinnian)$/, "pinni")
         .replace(/^(kachoris|kachauri)$/, "kachori")
         .replace(/^(pedas|pede|pera|pedha)$/, "peda");
    return w;
  }

  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = new Array(n + 1), cur = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      cur[0] = i;
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1,
                          prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      const t = prev; prev = cur; cur = t;
    }
    return prev[n];
  }

  function similarity(a, b) {
    if (!a || !b) return 0;
    return 1 - lev(a, b) / Math.max(a.length, b.length);
  }

  function titleCase(s) {
    return s.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }

  function iso(d) {
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"),
            String(d.getDate()).padStart(2, "0")].join("-");
  }

  function hhmm(h, m) {
    return String(h).padStart(2, "0") + ":" + String(m || 0).padStart(2, "0");
  }

  /* ---------- catalog matching ---------- */

  let KEYS = null;   // [{ key: compacted name, entry }]
  function keys() {
    if (KEYS) return KEYS;
    KEYS = [];
    OB.catalog.sweets.forEach((s) => {
      [s.en, s.pa].concat(s.alias || []).forEach((name) => {
        const k = name.split(/\s+/).map(canonWord).join("");
        KEYS.push({ key: compact(k), entry: s, words: name.split(/\s+/).length });
      });
    });
    return KEYS;
  }

  /* Find the catalog item inside a list of words. Tries every run of 1-4
     words, so "fresh kaju barfi sugar free" finds Kaju Katli and leaves
     "fresh … sugar free" over as the item note. */
  function matchItem(words) {
    let best = null;
    for (let len = Math.min(4, words.length); len >= 1; len--) {
      for (let i = 0; i + len <= words.length; i++) {
        const run = words.slice(i, i + len).map(canonWord);
        const w = compact(run.join(""));
        if (w.length < 2) continue;
        const wr = len === 2 ? compact(run[1] + run[0]) : "";   // "ladoo besan"
        keys().forEach((k) => {
          let sc = Math.max(similarity(w, k.key), wr ? similarity(wr, k.key) - 0.01 : 0);
          if (k.key.length <= 3 && w !== k.key) sc = 0;   // "gj" must be exact
          if (sc < 0.8) return;
          // prefer exact, then longer runs, then closer spelling
          const rank = sc * 10 + len + (sc === 1 ? 5 : 0);
          if (!best || rank > best.rank) best = { entry: k.entry, rank: rank, start: i, len: len };
        });
      }
      if (best && best.rank >= 15) break;   // an exact match — stop looking
    }
    return best;
  }

  /* ---------- pieces of the message ---------- */

  // [15/11/26, 4:30:12 PM] Name: text     (iPhone)
  // 15/11/26, 4:30 pm - Name: text        (Android)
  const WA_PREFIX = /^‎?\[?\d{1,4}[\/.\-]\d{1,2}[\/.\-]\d{2,4},?\s+\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*(?:[ap]\.?\s?m\.?)?\]?\s*(?:-\s*)?([^:]{1,40}?):\s?(.*)$/i;

  const PHONE_RE = /(?:\+?\d[\d\s().\-]{8,}\d)/;

  function findPhone(s) {
    const m = s.match(PHONE_RE);
    if (!m) return null;
    const digits = m[0].replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) return null;
    return { text: m[0], value: m[0].trim().startsWith("+") ? "+" + digits : digits };
  }

  function nextDow(today, dow, forceNext) {
    const d = new Date(today);
    let diff = (dow - d.getDay() + 7) % 7;
    if (forceNext && diff === 0) diff = 7;
    d.setDate(d.getDate() + diff);
    return d;
  }

  // a calendar date that is already behind us means next year
  function futureDate(today, month, day, year) {
    if (month < 0 || month > 11 || day < 1 || day > 31) return null;
    let y = year ? (year < 100 ? 2000 + year : year) : today.getFullYear();
    let d = new Date(y, month, day);
    if (!year && d < today) d = new Date(y + 1, month, day);
    return d;
  }

  const MON_RE = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
  const DAY_RE = "(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs?(?:day)?)?|fri(?:day)?|sat(?:urday)?)";

  /* Returns { date: Date, text: matched words } or null. */
  function findDate(s, today) {
    let m;
    if ((m = s.match(/\b(day\s+after\s+tomorrow|parso)\b/i))) {
      const d = new Date(today); d.setDate(d.getDate() + 2); return { date: d, text: m[0] };
    }
    if ((m = s.match(/\b(tomorrow|tmrw?|tmr|tomm?orow|kal)\b/i))) {
      const d = new Date(today); d.setDate(d.getDate() + 1); return { date: d, text: m[0] };
    }
    if ((m = s.match(/\b(today|tonight|aaj)\b/i))) return { date: new Date(today), text: m[0] };

    // Nov 20 / November 20th / Nov 20, 2026
    if ((m = s.match(new RegExp("\\b" + MON_RE + "\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b", "i")))) {
      const d = futureDate(today, MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()), +m[2], m[3] ? +m[3] : 0);
      if (d) return { date: d, text: m[0] };
    }
    // 20 Nov / 20th of November
    if ((m = s.match(new RegExp("\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?" + MON_RE + "\\b(?:,?\\s+(\\d{4}))?", "i")))) {
      const d = futureDate(today, MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()), +m[1], m[3] ? +m[3] : 0);
      if (d) return { date: d, text: m[0] };
    }
    // 11/20 or 20/11 — customers write both ways, so take whichever reading
    // is the nearest upcoming date (an order is rarely months away).
    // Not "1/2 lb" — a fraction followed by a unit.
    if ((m = s.match(new RegExp("(?:^|[^\\d.])(\\d{1,2})[\\/\\-](\\d{1,2})(?:[\\/\\-](\\d{2,4}))?(?![\\d\\/])(?!\\s*(?:" + UNIT_RE_SRC + ")\\b)", "i")))) {
      let a = +m[1], b = +m[2];
      const y = m[3] ? +m[3] : 0;
      const looksDate = y || a > 2 || b > 4;   // "1/2", "3/4" alone are fractions
      if (looksDate) {
        // [month, day] readings that are real calendar dates
        const valid = [[a, b], [b, a]]
          .filter(([mo, dy]) => mo >= 1 && mo <= 12)
          .map(([mo, dy]) => { const d = futureDate(today, mo - 1, dy, y);
                               return d && d.getDate() === dy ? d : null; })
          .filter(Boolean);
        valid.sort((x, z) => Math.abs(x - today) - Math.abs(z - today));
        if (valid[0]) return { date: valid[0], text: m[0].replace(/^[^\d]/, "") };
      }
    }
    // (next) Saturday
    if ((m = s.match(new RegExp("\\b(?:(next|this|coming)\\s+)?" + DAY_RE + "\\b", "i")))) {
      const dow = DAYS.indexOf(m[2].slice(0, 3).toLowerCase());
      return { date: nextDow(today, dow, /next/i.test(m[1] || "")), text: m[0] };
    }
    // "on the 20th"
    if ((m = s.match(/\b(?:on\s+(?:the\s+)?)?(\d{1,2})(st|nd|rd|th)\b(?!\s*(?:lb|kg|pc|box))/i))) {
      const day = +m[1];
      let d = new Date(today.getFullYear(), today.getMonth(), day);
      if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, day);
      if (day >= 1 && day <= 31) return { date: d, text: m[0] };
    }
    return null;
  }

  /* Returns { time: "HH:MM", text } or null. */
  function findTime(s) {
    let m;
    if ((m = s.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)(?=\W|$)/i))) {
      let h = +m[1] % 12;
      if (/p/i.test(m[3])) h += 12;
      if (h < 24) return { time: hhmm(h, m[2]), text: m[0] };
    }
    if ((m = s.match(/\b(noon|midday|dopahar)\b/i))) return { time: "12:00", text: m[0] };
    // "at 5", "by 4:30", "17:00" — shop hours: 1-7 means afternoon
    if ((m = s.match(/\b(?:(at|by|around|before|after)\s+)?(\d{1,2})[:.](\d{2})\b(?!\s*(?:lb|kg|pc|box))/i)) ||
        (m = s.match(/\b(at|by|around|before|after)\s+(\d{1,2})()\b(?!\s*(?:lb|kg|pc|box|\/|o'?clock))/i)) ||
        (m = s.match(/\b()(\d{1,2})()\s*o'?clock\b/i))) {
      let h = +m[2];
      if (h > 23) return null;
      if (h >= 1 && h <= 7) h += 12;
      return { time: hhmm(h, m[3] || 0), text: m[0] };
    }
    return null;
  }

  function parseNum(tok) {
    if (tok == null) return null;
    tok = String(tok).toLowerCase().trim();
    if (FRAC[tok] !== undefined) return FRAC[tok];
    if (NUM_WORDS[tok] !== undefined) return NUM_WORDS[tok];
    let m;
    if ((m = tok.match(/^(\d+)\s*([½¼¾⅓⅔])$/))) return +m[1] + FRAC[m[2]];
    if ((m = tok.match(/^(\d+)\s+(\d+)\/(\d+)$/))) return +m[1] + (+m[2]) / (+m[3]);
    if ((m = tok.match(/^(\d+)\/(\d+)$/))) return (+m[2]) ? (+m[1]) / (+m[2]) : null;
    const n = parseFloat(tok);
    return isFinite(n) ? n : null;
  }

  function unitOf(tok) {
    if (!tok) return null;
    const t = tok.toLowerCase().replace(/\.$/, "");
    for (const [re, v] of UNIT_WORDS) if (re.test(t)) return v;
    return null;
  }

  const NUM_SRC = "(\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+\\s*[½¼¾⅓⅔]|[½¼¾⅓⅔]|\\d+(?:\\.\\d+)?|\\.\\d+|half|quarter|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|hundred|an?(?=\\s+(?:" + UNIT_RE_SRC + ")\\b))";
  const QTY_RE = new RegExp("(?:^|[\\s(:\\-=x×*,])" + NUM_SRC + "\\s*(?:x\\s*)?(" + UNIT_RE_SRC + ")?\\.?(?=[\\s),.:\\-]|$|[\\p{L}])", "iu");

  /* One chunk of text -> an item, or null if it doesn't look like one. */
  function parseItem(chunk) {
    let s = " " + chunk.replace(/^\s*(?:[-*•▪◦·>]+|\d{1,2}[.)](?=\s+\D*\d))\s*/, "") + " ";

    // item note in brackets: "Jalebi 2 lb (extra crispy)"
    let note = "";
    s = s.replace(/\(([^)]*)\)/g, (_, n) => { note += (note ? ", " : "") + n.trim(); return " "; });

    const q = s.match(QTY_RE);
    let qty = null, unit = null;
    if (q) {
      qty = parseNum(q[1]);
      unit = unitOf(q[2]);
      s = s.slice(0, q.index) + " " + s.slice(q.index + q[0].length);
    }
    // a unit written after the name: "ladoo 5 - lbs" or "jalebi lb 2"
    if (q && !unit) {
      const u2 = s.match(new RegExp("(?<![\\p{L}\\p{M}])(" + UNIT_RE_SRC + ")(?![\\p{L}\\p{M}])", "iu"));
      if (u2 && unitOf(u2[1])) { unit = unitOf(u2[1]); s = s.replace(u2[0], " "); }
    }
    // "a dozen samosa" / "dozen ladoo"
    if (!q) {
      const dz = s.match(/\b(?:a\s+)?(dozen|box|tray|plate)\b/i);
      if (dz) { qty = 1; unit = unitOf(dz[1]); s = s.replace(dz[0], " "); }
    }

    const words = s.replace(/[.,:;=\-–—!?*]+/g, " ").split(/\s+/).filter(Boolean)
      .filter((w) => !FILLER.has(w.toLowerCase()));
    if (!words.length) return null;

    const hit = matchItem(words);
    if (hit) {
      const before = words.slice(0, hit.start).join(" ");
      const rest = [NOTE_HINT.test(before) ? before : "",
                    words.slice(hit.start + hit.len).join(" ")].filter(Boolean).join(" ");
      if (rest) note = rest + (note ? ", " + note : "");
      return {
        qty: qty == null ? 1 : qty,
        unit: unit || hit.entry.unit || "lb",
        item_en: hit.entry.en, item_pa: hit.entry.pa,
        note: note, matched: true, guessedQty: qty == null, raw: chunk.trim()
      };
    }
    // not in the catalog: only trust it if it clearly has a quantity AND unit
    if (qty != null && unit) {
      const name = titleCase(words.join(" "));
      if (!/\p{L}/u.test(name) || name.length < 3) return null;
      return { qty: qty, unit: unit, item_en: name, item_pa: "", note: note,
               matched: false, raw: chunk.trim() };
    }
    return null;
  }

  function looksLikeName(s) {
    const w = s.trim().replace(/[.,!]+$/, "").split(/\s+/);
    if (w.length < 1 || w.length > 4) return false;
    if (!w.every((x) => /^[\p{L}][\p{L}\p{M}'.\-]*$/u.test(x))) return false;
    if (NOT_NAME.has(w[0].toLowerCase()) || FILLER.has(w[0].toLowerCase())) return false;
    if (CHAT_RE.test(s.trim())) return false;
    if (matchItem(w)) return false;
    if (w.some((x) => unitOf(x) || DAYS.includes(x.slice(0, 3).toLowerCase()) && x.length <= 9)) return false;
    return true;
  }

  function cleanName(s) {
    return titleCase(s.trim().replace(/[.,!:;]+$/, "").split(/\s+/).slice(0, 4).join(" "));
  }

  /* ---------- main ---------- */

  function parse(text, now) {
    const today = now ? new Date(now) : new Date();
    today.setHours(0, 0, 0, 0);

    const out = {
      customer_name: "", customer_phone: "", order_name: "",
      due_date: "", due_time: "", urgent: false, notes: "",
      items: [], skipped: [],
      found: {}   // which fields the message actually contained
    };
    const notes = [];
    const senders = [];
    let nameFrom = 0;   // how sure we are about the name: 4 label, 3 intro, 2 sender, 1 lone line
    const setName = (v, level) => {
      if (!v || level <= nameFrom) return;
      out.customer_name = cleanName(v); nameFrom = level; out.found.customer_name = true;
    };

    let lines = asciiDigits(String(text || ""))
      .replace(/\r/g, "").replace(/[‎‏‪-‮]/g, "")
      .split("\n").map((l) => l.trim()).filter(Boolean);

    lines.forEach((orig) => {
      let line = orig.replace(/\s+/g, " ");

      // WhatsApp copy: strip "[date, time] Sender:" and remember the sender
      const wa = line.match(WA_PREFIX);
      if (wa) {
        senders.push(wa[1].trim());
        line = wa[2].trim();
        if (!line || /^<(media omitted|attached)/i.test(line)) return;
      }

      // labelled fields: "Name: …", "Phone - …", "Pickup: …"
      let m;
      if ((m = line.match(/^(?:customer\s*name|cust(?:omer)?|name|naam)\s*[:\-–=]\s*(.+)$/i))) {
        const ph = findPhone(m[1]);
        if (ph) { out.customer_phone = ph.value; out.found.customer_phone = true; m[1] = m[1].replace(ph.text, " "); }
        setName(m[1].replace(/[,\-–]+\s*$/, ""), 4);
        return;
      }
      if ((m = line.match(/^(?:occasion|event|order\s*name|function)\s*[:\-–=]\s*(.+)$/i))) {
        out.order_name = titleCase(m[1].trim()); out.found.order_name = true; return;
      }
      if ((m = line.match(/^(?:notes?|remarks?|instructions?|comments?)\s*[:\-–=]\s*(.+)$/i))) {
        notes.push(m[1].trim()); return;
      }

      // phone number anywhere
      const ph = findPhone(line);
      if (ph) {
        if (!out.customer_phone) { out.customer_phone = ph.value; out.found.customer_phone = true; }
        line = line.replace(ph.text, " ");
        line = line.replace(/\b(phone|ph|mobile|mob|cell|number|no|contact|tel|whatsapp)\b\.?\s*[:\-#]?\s*/ig, " ");
      }

      // date + time anywhere on the line
      const dt = findDate(line, today);
      if (dt) {
        if (!out.due_date) { out.due_date = iso(dt.date); out.found.due_date = true; }
        line = line.replace(dt.text, " ");
      }
      const tm = findTime(line);
      if (tm) {
        if (!out.due_time) { out.due_time = tm.time; out.found.due_time = true; }
        line = line.replace(tm.text, " ");
      }
      if (dt || tm) {
        line = line.replace(/\b(pick\s*-?\s*up|pickup|collect(?:ion)?|due|delivery|deliver|ready|needed|need(?:ed)?\s+it|want\s+it|by|on|at|for|date|time|in\s+the\s+(?:morning|evening|afternoon)|morning|evening|afternoon)\b\s*[:\-]?/ig, " ");
      }

      if (/\b(urgent|asap|jaldi|rush|emergency)\b/i.test(line)) {
        out.urgent = true;
        line = line.replace(/\b(urgent(?:ly)?|asap|jaldi|rush|emergency)\b/ig, " ");
      }

      for (const occ of OCCASIONS) {
        const re = new RegExp("\\b(?:for\\s+(?:a|my|our|the)?\\s*)?((?:[\\p{L}']+\\s+)?" + occ.replace(/\s+/g, "\\s+") + ")\\b", "giu");
        const all = Array.from(line.matchAll(re));
        if (all.length) {
          const named = (x) => { const f = x[1].split(/\s+/)[0].toLowerCase();
                                 return x[1].split(/\s+/).length > 1 && !FILLER.has(f) && !NOT_NAME.has(f); };
          const om = all.find(named) || all[0];
          if (!out.order_name) {
            const words = om[1].split(/\s+/);
            // keep "Sharma wedding", drop "my wedding" / "daughter's" stays
            const keepFirst = words.length > 1 && !FILLER.has(words[0].toLowerCase()) &&
                              !NOT_NAME.has(words[0].toLowerCase());
            out.order_name = titleCase(keepFirst ? om[1] : occ);
            out.found.order_name = true;
          }
          all.forEach((x) => { line = line.replace(x[0], " "); });
          break;
        }
      }

      // "this is Harpreet", "my name is …", "I'm …"
      const intro = line.match(/\b(?:this\s+is|my\s+name\s+is|my\s+name['’]?s|i\s+am|i['’]m|it['’]s|name\s+is|from)\s+([\p{L}][\p{L}\p{M}'.\-]*(?:\s+[\p{L}][\p{L}\p{M}'.\-]*){0,2})/iu);
      if (intro) {
        const words = intro[1].split(/\s+/);
        const keep = [];
        for (const w of words) {
          if (NOT_NAME.has(w.toLowerCase()) || FILLER.has(w.toLowerCase()) || matchItem([w])) break;
          keep.push(w);
        }
        if (keep.length) {
          setName(keep.join(" "), 3);
          const prefix = intro[0].slice(0, intro[0].length - intro[1].length);
          line = line.replace(prefix + intro[1].split(" ").slice(0, keep.length).join(" "), " ");
        }
      }

      // signature: "Thanks, Harpreet" / "- Harpreet"
      const sig = line.match(/^(?:thanks?(?:\s+you)?|thx|regards|best|cheers|ty)[\s,!.\-]+(.+)$/i) ||
                  line.match(/^[-–~]\s*(.+)$/);
      if (sig && looksLikeName(sig[1])) { setName(sig[1], 2); return; }

      line = line.replace(/\s+/g, " ").trim();
      if (!line.split(/[\s.,:;!?\-–]+/).some((w) => w && !FILLER.has(w.toLowerCase()))) return;
      if (CHAT_RE.test(line.replace(/[^\p{L}\s]/gu, "").trim())) return;

      // item(s): a line may hold several — "5 lb ladoo, 2 lb jalebi and 20 samosa"
      const parts = line.split(/\s*(?:,|;|\band\b|&|\+(?!\d)|\s\/\s|\||\.(?=\s|$))\s*/i).filter((p) => p.trim());
      const got = parts.map(parseItem);
      if (got.some(Boolean)) {
        got.forEach((it, i) => {
          if (it) out.items.push(it);
          else if (parts[i].replace(/[^\p{L}]/gu, "").length > 2 && !CHAT_RE.test(parts[i])) {
            // "5 lb ladoo, less sweet" — attach to the item before it
            const prev = out.items[out.items.length - 1];
            if (!nameFrom && looksLikeName(parts[i])) setName(parts[i], 1);
            else if (prev && NOTE_HINT.test(parts[i])) prev.note = (prev.note ? prev.note + ", " : "") + parts[i].trim();
            else if (NOTE_HINT.test(parts[i])) notes.push(parts[i].trim());
          }
        });
        return;
      }

      if (!nameFrom && looksLikeName(line)) { setName(line, 1); return; }
      if (NOTE_HINT.test(line)) { notes.push(line); return; }
      out.skipped.push(orig);
    });

    // WhatsApp sender name, when the message didn't say who it was
    if (senders.length && nameFrom < 2) {
      const counts = {};
      senders.forEach((s) => { counts[s] = (counts[s] || 0) + 1; });
      const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
      const ph = findPhone(top);
      if (ph) { if (!out.customer_phone) { out.customer_phone = ph.value; out.found.customer_phone = true; } }
      else if (!/^(you|me)$/i.test(top)) setName(top.replace(/[~]/g, ""), 2);
    }

    out.notes = notes.join("\n");
    out.found.notes = !!out.notes;
    return out;
  }

  OB.parse = { order: parse, matchItem: matchItem };
})();
