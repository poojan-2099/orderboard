/* OrderBoard — bilingual sweets / snacks catalog and units.
   Add your own items at the bottom of SWEETS — "fav: true" puts an
   item on the Quick Pick buttons on the order form. */
(function () {
  const SWEETS = [
    // --- ladoo family ---
    { en: "Besan Ladoo",       pa: "ਬੇਸਨ ਲੱਡੂ",        fav: true },
    { en: "Boondi Ladoo",      pa: "ਬੂੰਦੀ ਲੱਡੂ",        fav: true },
    { en: "Motichoor Ladoo",   pa: "ਮੋਤੀਚੂਰ ਲੱਡੂ" },
    { en: "Atta Ladoo",        pa: "ਆਟਾ ਲੱਡੂ" },
    { en: "Gond Ladoo",        pa: "ਗੋਂਦ ਲੱਡੂ" },
    { en: "Coconut Ladoo",     pa: "ਨਾਰੀਅਲ ਲੱਡੂ" },

    // --- jamun / syrup sweets ---
    { en: "Gulab Jamun",       pa: "ਗੁਲਾਬ ਜਾਮਨ",       fav: true },
    { en: "Kala Jamun",        pa: "ਕਾਲਾ ਜਾਮਨ" },
    { en: "Rasgulla",          pa: "ਰਸਗੁੱਲਾ",          fav: true },
    { en: "Rasmalai",          pa: "ਰਸਮਲਾਈ",           fav: true },
    { en: "Cham Cham",         pa: "ਚਮ ਚਮ" },
    { en: "Jalebi",            pa: "ਜਲੇਬੀ",            fav: true },
    { en: "Imarti",            pa: "ਇਮਰਤੀ" },
    { en: "Balushahi",         pa: "ਬਾਲੂਸ਼ਾਹੀ" },
    { en: "Ghewar",            pa: "ਘੇਵਰ" },

    // --- barfi family ---
    { en: "Plain Barfi",       pa: "ਬਰਫ਼ੀ",             fav: true },
    { en: "Kaju Katli",        pa: "ਕਾਜੂ ਕਤਲੀ",        fav: true },
    { en: "Pista Barfi",       pa: "ਪਿਸਤਾ ਬਰਫ਼ੀ" },
    { en: "Badam Barfi",       pa: "ਬਦਾਮ ਬਰਫ਼ੀ" },
    { en: "Coconut Barfi",     pa: "ਨਾਰੀਅਲ ਬਰਫ਼ੀ" },
    { en: "Anjeer Barfi",      pa: "ਅੰਜੀਰ ਬਰਫ਼ੀ" },
    { en: "Dry Fruit Barfi",   pa: "ਡਰਾਈ ਫਰੂਟ ਬਰਫ਼ੀ" },
    { en: "Khoya Barfi",       pa: "ਖੋਆ ਬਰਫ਼ੀ" },
    { en: "Milk Cake",         pa: "ਮਿਲਕ ਕੇਕ",         fav: true },
    { en: "Kalakand",          pa: "ਕਲਾਕੰਦ" },
    { en: "Peda",              pa: "ਪੇੜਾ" },
    { en: "Mysore Pak",        pa: "ਮੈਸੂਰ ਪਾਕ" },

    // --- halwa / pinni ---
    { en: "Sooji Halwa",       pa: "ਸੂਜੀ ਦਾ ਹਲਵਾ" },
    { en: "Gajar Halwa",       pa: "ਗਾਜਰ ਦਾ ਹਲਵਾ" },
    { en: "Moong Dal Halwa",   pa: "ਮੂੰਗ ਦਾਲ ਹਲਵਾ" },
    { en: "Pinni",             pa: "ਪਿੰਨੀ",            fav: true },
    { en: "Panjiri",           pa: "ਪੰਜੀਰੀ" },
    { en: "Kheer",             pa: "ਖੀਰ" },

    // --- dry / papdi ---
    { en: "Soan Papdi",        pa: "ਸੋਨ ਪਾਪੜੀ" },
    { en: "Patisa",            pa: "ਪਤੀਸਾ" },
    { en: "Petha",             pa: "ਪੇਠਾ" },
    { en: "Shakkarpara",       pa: "ਸ਼ੱਕਰਪਾਰਾ" },
    { en: "Gur Papdi",         pa: "ਗੁੜ ਪਾਪੜੀ" },
    { en: "Mixed Sweets Box",  pa: "ਮਿਕਸ ਮਿਠਾਈ ਡੱਬਾ",  fav: true },

    // --- namkeen / savoury ---
    { en: "Samosa",            pa: "ਸਮੋਸਾ",            fav: true },
    { en: "Pakora",            pa: "ਪਕੌੜਾ" },
    { en: "Kachori",           pa: "ਕਚੌਰੀ" },
    { en: "Mathi",             pa: "ਮੱਠੀ" },
    { en: "Namkeen Mixture",   pa: "ਨਮਕੀਨ ਮਿਕਸਚਰ" },
    { en: "Dhokla",            pa: "ਢੋਕਲਾ" },
    { en: "Paneer Pakora",     pa: "ਪਨੀਰ ਪਕੌੜਾ" },
    { en: "Aloo Tikki",        pa: "ਆਲੂ ਟਿੱਕੀ" }
  ];

  const UNITS = [
    { v: "lb",     en: "lb",     pa: "ਪੌਂਡ" },
    { v: "kg",     en: "kg",     pa: "ਕਿਲੋ" },
    { v: "gm",     en: "gm",     pa: "ਗ੍ਰਾਮ" },
    { v: "pcs",    en: "pcs",    pa: "ਪੀਸ" },
    { v: "dozen",  en: "dozen",  pa: "ਦਰਜਨ" },
    { v: "box",    en: "box",    pa: "ਡੱਬਾ" },
    { v: "tray",   en: "tray",   pa: "ਟ੍ਰੇ" },
    { v: "plate",  en: "plate",  pa: "ਪਲੇਟ" }
  ];

  function norm(s) {
    return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  window.OB = window.OB || {};
  window.OB.catalog = {
    sweets: SWEETS,
    units: UNITS,
    favourites() { return SWEETS.filter((s) => s.fav); },

    /* Find a catalog entry from whatever the user typed —
       matches the English name or the Punjabi name. */
    find(text) {
      const n = norm(text);
      if (!n) return null;
      return SWEETS.find((s) => norm(s.en) === n || norm(s.pa) === n) ||
             SWEETS.find((s) => norm(s.en).startsWith(n) || norm(s.pa).startsWith(n)) ||
             null;
    },

    unitLabel(v, lang) {
      const u = UNITS.find((x) => x.v === v);
      return u ? (lang === "pa" ? u.pa : u.en) : v;
    },

    /* The name to display for a line item in the given language.
       Falls back to whatever was typed if there is no translation. */
    itemLabel(item, lang) {
      if (lang === "pa") return item.item_pa || item.item_en;
      return item.item_en || item.item_pa;
    }
  };
})();
