/* OrderBoard — bilingual sweets / snacks catalog and units.
   Add your own items at the bottom of SWEETS — "fav: true" puts an
   item on the Quick Pick buttons on the order form.
   "alias" lists other spellings customers use in WhatsApp messages
   (laddu / burfi / pakoda…) so a pasted message still finds the item.
   "unit" is the default unit when a message gives only a number
   (e.g. "20 samosa" means 20 pieces; everything else defaults to lb). */
(function () {
  const SWEETS = [
    // --- ladoo family ---
    { en: "Besan Ladoo",       pa: "ਬੇਸਨ ਲੱਡੂ", alias: ["besan laddu","besan ladu","besan ke ladoo"],        fav: true },
    { en: "Boondi Ladoo",      pa: "ਬੂੰਦੀ ਲੱਡੂ", alias: ["bundi ladoo","boondi laddu","bundi laddu","boondi"],        fav: true },
    { en: "Motichoor Ladoo",   pa: "ਮੋਤੀਚੂਰ ਲੱਡੂ", alias: ["motichur ladoo","motichur","motichoor ladu","motichoor laddu","motichoor"] },
    { en: "Atta Ladoo",        pa: "ਆਟਾ ਲੱਡੂ", alias: ["aata ladoo","atte ke ladoo"] },
    { en: "Gond Ladoo",        pa: "ਗੋਂਦ ਲੱਡੂ", alias: ["gond laddu","gond ke ladoo","gond"] },
    { en: "Coconut Ladoo",     pa: "ਨਾਰੀਅਲ ਲੱਡੂ" },

    // --- jamun / syrup sweets ---
    { en: "Gulab Jamun",       pa: "ਗੁਲਾਬ ਜਾਮਨ", alias: ["gulabjamun","gulab jamon","gj","jamun"],       fav: true },
    { en: "Kala Jamun",        pa: "ਕਾਲਾ ਜਾਮਨ", alias: ["kala jamon","kalajamun"] },
    { en: "Rasgulla",          pa: "ਰਸਗੁੱਲਾ", alias: ["rasgula","rosogolla","rasagulla"],          fav: true },
    { en: "Rasmalai",          pa: "ਰਸਮਲਾਈ", alias: ["ras malai","rasmalaai"],           fav: true },
    { en: "Cham Cham",         pa: "ਚਮ ਚਮ", alias: ["chamcham","chum chum","chumchum"] },
    { en: "Jalebi",            pa: "ਜਲੇਬੀ", alias: ["jilebi","jalabi","jalebee"],            fav: true },
    { en: "Imarti",            pa: "ਇਮਰਤੀ", alias: ["jangiri","amriti"] },
    { en: "Balushahi",         pa: "ਬਾਲੂਸ਼ਾਹੀ", alias: ["balushai","badusha"] },
    { en: "Ghewar",            pa: "ਘੇਵਰ" },

    // --- barfi family ---
    { en: "Plain Barfi",       pa: "ਬਰਫ਼ੀ", alias: ["barfi","burfi","plain burfi","white barfi","milk barfi"],             fav: true },
    { en: "Kaju Katli",        pa: "ਕਾਜੂ ਕਤਲੀ", alias: ["kaju barfi","kaju burfi","kaju katri","kaju katri","kaju"],        fav: true },
    { en: "Pista Barfi",       pa: "ਪਿਸਤਾ ਬਰਫ਼ੀ", alias: ["pista burfi"] },
    { en: "Badam Barfi",       pa: "ਬਦਾਮ ਬਰਫ਼ੀ", alias: ["badam burfi","almond barfi"] },
    { en: "Coconut Barfi",     pa: "ਨਾਰੀਅਲ ਬਰਫ਼ੀ", alias: ["coconut burfi","nariyal barfi"] },
    { en: "Anjeer Barfi",      pa: "ਅੰਜੀਰ ਬਰਫ਼ੀ", alias: ["anjeer burfi","fig barfi","anjir barfi"] },
    { en: "Dry Fruit Barfi",   pa: "ਡਰਾਈ ਫਰੂਟ ਬਰਫ਼ੀ", alias: ["dryfruit barfi","dry fruit burfi"] },
    { en: "Khoya Barfi",       pa: "ਖੋਆ ਬਰਫ਼ੀ", alias: ["khoa barfi","khoya burfi"] },
    { en: "Milk Cake",         pa: "ਮਿਲਕ ਕੇਕ", alias: ["milkcake","milk cake barfi"],         fav: true },
    { en: "Kalakand",          pa: "ਕਲਾਕੰਦ", alias: ["kalakhand","kalaakand"] },
    { en: "Peda",              pa: "ਪੇੜਾ", alias: ["pera","pede","pedha"] },
    { en: "Mysore Pak",        pa: "ਮੈਸੂਰ ਪਾਕ" },

    // --- halwa / pinni ---
    { en: "Sooji Halwa",       pa: "ਸੂਜੀ ਦਾ ਹਲਵਾ", alias: ["suji halwa","sooji ka halwa","halwa"] },
    { en: "Gajar Halwa",       pa: "ਗਾਜਰ ਦਾ ਹਲਵਾ", alias: ["gajar ka halwa","gajrela","carrot halwa"] },
    { en: "Moong Dal Halwa",   pa: "ਮੂੰਗ ਦਾਲ ਹਲਵਾ", alias: ["moong halwa","mung dal halwa"] },
    { en: "Pinni",             pa: "ਪਿੰਨੀ", alias: ["pinnis","pinniyan","atta pinni"],            fav: true },
    { en: "Panjiri",           pa: "ਪੰਜੀਰੀ" },
    { en: "Kheer",             pa: "ਖੀਰ" },

    // --- dry / papdi ---
    { en: "Soan Papdi",        pa: "ਸੋਨ ਪਾਪੜੀ", alias: ["son papdi","soan papri","sohan papdi"] },
    { en: "Patisa",            pa: "ਪਤੀਸਾ" },
    { en: "Petha",             pa: "ਪੇਠਾ" },
    { en: "Shakkarpara",       pa: "ਸ਼ੱਕਰਪਾਰਾ" },
    { en: "Gur Papdi",         pa: "ਗੁੜ ਪਾਪੜੀ" },
    { en: "Mixed Sweets Box",  pa: "ਮਿਕਸ ਮਿਠਾਈ ਡੱਬਾ", alias: ["mix mithai","mixed mithai","mix sweets","mixed sweets","assorted sweets","assorted mithai","mithai"],  fav: true },

    // --- namkeen / savoury ---
    { en: "Samosa",            pa: "ਸਮੋਸਾ", alias: ["samose","samosey"], unit: "pcs",            fav: true },
    { en: "Pakora",            pa: "ਪਕੌੜਾ", alias: ["pakoda","pakode","pakore","pakoras"] },
    { en: "Kachori",           pa: "ਕਚੌਰੀ", alias: ["kachauri","kachoris"], unit: "pcs" },
    { en: "Mathi",             pa: "ਮੱਠੀ" },
    { en: "Namkeen Mixture",   pa: "ਨਮਕੀਨ ਮਿਕਸਚਰ", alias: ["namkeen","mixture","bhujia"] },
    { en: "Dhokla",            pa: "ਢੋਕਲਾ" },
    { en: "Paneer Pakora",     pa: "ਪਨੀਰ ਪਕੌੜਾ", alias: ["paneer pakoda","paneer pakode"], unit: "pcs" },
    { en: "Aloo Tikki",        pa: "ਆਲੂ ਟਿੱਕੀ", alias: ["tikki","aloo tikkis"], unit: "pcs" }
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
