/* OrderBoard — all on-screen text in English + Punjabi (Gurmukhi) */
(function () {
  const S = {
    en: {
      appName: "Order Board",
      // nav
      navNew: "New Order", navBoard: "Kitchen", navDesk: "Front Desk",
      navLog: "History", navSettings: "Settings",
      // statuses
      stNew: "New", stCooking: "Making", stDone: "Done", stCancelled: "Cancelled",
      // new order form
      newOrderTitle: "Take New Order",
      orderDate: "Order date", dueDate: "Due date", dueTime: "Due time",
      customerName: "Customer name", customerPhone: "Phone (optional)",
      orderName: "Order name / occasion", orderNamePh: "e.g. Sharma Wedding",
      items: "Items", quantity: "Qty", unit: "Unit", itemLabel: "Item",
      itemNote: "Item note", addItem: "Add another item", removeItem: "Remove",
      quickPick: "Quick pick", notes: "Notes for kitchen",
      urgent: "Urgent", saveOrder: "Save Order", clearForm: "Clear",
      savedOk: "Order saved", requiredCustomer: "Please enter a customer name",
      requiredItems: "Please add at least one item",
      searchItem: "Type or pick an item",
      // board
      boardTitle: "Kitchen Orders", noOrders: "No pending orders",
      due: "Due", overdue: "OVERDUE", today: "Today", tomorrow: "Tomorrow",
      start: "Start", markDone: "Mark Done", comment: "Comment",
      reopen: "Reopen", tvMode: "TV mode", exitTv: "Exit TV mode",
      lastComment: "Last note",
      // comment modal
      addComment: "Add a note", commentPh: "Type a note…",
      presets: "Quick notes", yourName: "Your name", send: "Send", cancel: "Cancel",
      // desk
      deskTitle: "Front Desk", ongoing: "Ongoing", completedToday: "Completed today",
      waSent: "WhatsApp sent", waNotSent: "WhatsApp not sent",
      resendWa: "Send WhatsApp", openWhatsApp: "Open in WhatsApp",
      // kitchen -> front desk share
      shareWa: "Send to Front Desk", shareTitle: "Order done \u2014 tell the front desk",
      shareHint: "Tap the green button. WhatsApp opens with the message already written \u2014 just press send.",
      shareSent: "Sent", notNow: "Not now",
      newComments: "new notes", markSeen: "Mark all seen",
      // log
      logTitle: "Order History", from: "From", to: "To", status: "Status",
      all: "All", search: "Search", exportCsv: "Export CSV",
      orderNo: "Order", customer: "Customer", created: "Created",
      completed: "Completed", noResults: "No orders found",
      details: "Details", history: "Activity", close: "Close",
      edit: "Edit", del: "Delete",
      delConfirm: "Type the order number to delete this order:",
      // settings
      settingsTitle: "Settings",
      connection: "Database connection", connected: "Connected", notConnected: "Not connected",
      waSection: "WhatsApp notification (CallMeBot)",
      waPhone: "WhatsApp number (with country code)",
      waKey: "CallMeBot API key", waTest: "Send test message",
      waHelp: "Free setup: on WhatsApp, send \"I allow callmebot to send me messages\" to +34 644 59 71 67. The bot replies with your API key. Paste it above.",
      shopName: "Shop name", language: "Language", stationName: "This screen is",
      saveSettings: "Save settings", saved: "Saved",
      deviceSection: "This device",
      // unlock
      unlock: "Unlock", unlocking: "Unlocking\u2026",
      unlockSub: "Enter the shop password to open the board.",
      password: "Password",
      unlockFill: "Type the password.",
      unlockBad: "That password was refused. Either it is wrong, or no account exists under the email below \u2014 check it matches the user you created in Supabase.",
      unlockAccount: "Signing in as:",
      unlockUnconfirmed: "The shop account still needs confirming in Supabase \u2192 Authentication \u2192 Users.",
      unlockTooMany: "Too many tries. Wait a minute and try again.",
      unlockOffline: "No connection to the database. Check the internet, then try again.",
      unlockHelp: "Once per device \u2014 this screen stays unlocked afterwards.",
      lock: "Lock this screen", unlocked: "Unlocked", accountSection: "Site password",
      soundTest: "Test sound",
      // misc
      loading: "Loading…", offline: "Offline — changes will sync",
      errSave: "Could not save. Check your connection.",
      setupNeeded: "Setup needed: open Settings and add your Supabase keys.",
      items_n: (n) => n + (n === 1 ? " item" : " items"),
      qtyTotal: "Total"
    },
    pa: {
      appName: "ਆਰਡਰ ਬੋਰਡ",
      navNew: "ਨਵਾਂ ਆਰਡਰ", navBoard: "ਰਸੋਈ", navDesk: "ਫਰੰਟ ਡੈਸਕ",
      navLog: "ਪੁਰਾਣੇ ਆਰਡਰ", navSettings: "ਸੈਟਿੰਗ",
      stNew: "ਨਵਾਂ", stCooking: "ਬਣ ਰਿਹਾ", stDone: "ਪੂਰਾ", stCancelled: "ਰੱਦ",
      newOrderTitle: "ਨਵਾਂ ਆਰਡਰ ਲਿਖੋ",
      orderDate: "ਆਰਡਰ ਦੀ ਤਾਰੀਖ਼", dueDate: "ਦੇਣ ਦੀ ਤਾਰੀਖ਼", dueTime: "ਸਮਾਂ",
      customerName: "ਗਾਹਕ ਦਾ ਨਾਂ", customerPhone: "ਫ਼ੋਨ (ਮਰਜ਼ੀ ਨਾਲ)",
      orderName: "ਆਰਡਰ ਦਾ ਨਾਂ / ਮੌਕਾ", orderNamePh: "ਜਿਵੇਂ ਸ਼ਰਮਾ ਵਿਆਹ",
      items: "ਸਮਾਨ", quantity: "ਮਾਤਰਾ", unit: "ਇਕਾਈ", itemLabel: "ਮਿਠਾਈ",
      itemNote: "ਨੋਟ", addItem: "ਹੋਰ ਸਮਾਨ ਜੋੜੋ", removeItem: "ਹਟਾਓ",
      quickPick: "ਛੇਤੀ ਚੁਣੋ", notes: "ਰਸੋਈ ਲਈ ਨੋਟ",
      urgent: "ਜ਼ਰੂਰੀ", saveOrder: "ਆਰਡਰ ਸੇਵ ਕਰੋ", clearForm: "ਖਾਲੀ ਕਰੋ",
      savedOk: "ਆਰਡਰ ਸੇਵ ਹੋ ਗਿਆ", requiredCustomer: "ਗਾਹਕ ਦਾ ਨਾਂ ਲਿਖੋ",
      requiredItems: "ਘੱਟੋ-ਘੱਟ ਇੱਕ ਸਮਾਨ ਜੋੜੋ",
      searchItem: "ਮਿਠਾਈ ਲਿਖੋ ਜਾਂ ਚੁਣੋ",
      boardTitle: "ਰਸੋਈ ਦੇ ਆਰਡਰ", noOrders: "ਕੋਈ ਆਰਡਰ ਬਾਕੀ ਨਹੀਂ",
      due: "ਦੇਣਾ ਹੈ", overdue: "ਸਮਾਂ ਨਿਕਲ ਗਿਆ", today: "ਅੱਜ", tomorrow: "ਕੱਲ੍ਹ",
      start: "ਸ਼ੁਰੂ ਕਰੋ", markDone: "ਪੂਰਾ ਹੋ ਗਿਆ", comment: "ਟਿੱਪਣੀ",
      reopen: "ਦੁਬਾਰਾ ਖੋਲ੍ਹੋ", tvMode: "ਟੀਵੀ ਮੋਡ", exitTv: "ਟੀਵੀ ਮੋਡ ਬੰਦ",
      lastComment: "ਆਖ਼ਰੀ ਨੋਟ",
      addComment: "ਟਿੱਪਣੀ ਲਿਖੋ", commentPh: "ਇੱਥੇ ਲਿਖੋ…",
      presets: "ਤਿਆਰ ਟਿੱਪਣੀਆਂ", yourName: "ਤੁਹਾਡਾ ਨਾਂ", send: "ਭੇਜੋ", cancel: "ਰੱਦ ਕਰੋ",
      deskTitle: "ਫਰੰਟ ਡੈਸਕ", ongoing: "ਚੱਲ ਰਹੇ", completedToday: "ਅੱਜ ਪੂਰੇ ਹੋਏ",
      waSent: "ਵਟਸਐਪ ਭੇਜ ਦਿੱਤਾ", waNotSent: "ਵਟਸਐਪ ਨਹੀਂ ਗਿਆ",
      resendWa: "ਵਟਸਐਪ ਭੇਜੋ", openWhatsApp: "ਵਟਸਐਪ ਵਿੱਚ ਖੋਲ੍ਹੋ",
      shareWa: "ਫਰੰਟ ਡੈਸਕ ਨੂੰ ਭੇਜੋ",
      shareTitle: "ਆਰਡਰ ਪੂਰਾ ਹੋਇਆ — ਫਰੰਟ ਡੈਸਕ ਨੂੰ ਦੱਸੋ",
      shareHint: "ਹਰੇ ਬਟਨ ਦਬਾਓ। ਵਟਸਐਪ ਖੁੱਲ੍ਹੇਗਾ ਅਤੇ ਸੁਨੇਹਾ ਤਿਆਰ ਹੋਵੇਗਾ — ਬਸ ਭੇਜੋ ਦਬਾਓ।",
      shareSent: "ਭੇਜ ਦਿੱਤਾ", notNow: "ਹੁਣ ਨਹੀਂ",
      newComments: "ਨਵੀਆਂ ਟਿੱਪਣੀਆਂ", markSeen: "ਸਭ ਵੇਖ ਲਈਆਂ",
      logTitle: "ਪੁਰਾਣੇ ਆਰਡਰ", from: "ਤੋਂ", to: "ਤੱਕ", status: "ਹਾਲਤ",
      all: "ਸਾਰੇ", search: "ਖੋਜੋ", exportCsv: "CSV ਡਾਊਨਲੋਡ",
      orderNo: "ਆਰਡਰ", customer: "ਗਾਹਕ", created: "ਬਣਾਇਆ",
      completed: "ਪੂਰਾ ਹੋਇਆ", noResults: "ਕੋਈ ਆਰਡਰ ਨਹੀਂ ਮਿਲਿਆ",
      details: "ਵੇਰਵਾ", history: "ਗਤੀਵਿਧੀ", close: "ਬੰਦ ਕਰੋ",
      edit: "ਬਦਲੋ", del: "ਮਿਟਾਓ",
      delConfirm: "ਮਿਟਾਉਣ ਲਈ ਆਰਡਰ ਨੰਬਰ ਲਿਖੋ:",
      settingsTitle: "ਸੈਟਿੰਗ",
      connection: "ਡਾਟਾਬੇਸ ਕਨੈਕਸ਼ਨ", connected: "ਜੁੜ ਗਿਆ", notConnected: "ਨਹੀਂ ਜੁੜਿਆ",
      waSection: "ਵਟਸਐਪ ਸੂਚਨਾ (CallMeBot)",
      waPhone: "ਵਟਸਐਪ ਨੰਬਰ (ਦੇਸ਼ ਕੋਡ ਨਾਲ)",
      waKey: "CallMeBot API ਕੁੰਜੀ", waTest: "ਟੈਸਟ ਸੁਨੇਹਾ ਭੇਜੋ",
      waHelp: "ਮੁਫ਼ਤ ਸੈਟਅੱਪ: ਵਟਸਐਪ ਤੋਂ +34 644 59 71 67 ਉੱਤੇ \"I allow callmebot to send me messages\" ਭੇਜੋ। ਬੋਟ ਤੁਹਾਨੂੰ API ਕੁੰਜੀ ਭੇਜੇਗਾ। ਉਹ ਉੱਪਰ ਪਾਓ।",
      shopName: "ਦੁਕਾਨ ਦਾ ਨਾਂ", language: "ਭਾਸ਼ਾ", stationName: "ਇਹ ਸਕਰੀਨ ਹੈ",
      saveSettings: "ਸੈਟਿੰਗ ਸੇਵ ਕਰੋ", saved: "ਸੇਵ ਹੋ ਗਿਆ",
      deviceSection: "ਇਹ ਡਿਵਾਈਸ",
      unlock: "ਖੋਲ੍ਹੋ", unlocking: "ਖੁੱਲ੍ਹ ਰਿਹਾ ਹੈ…",
      unlockSub: "ਬੋਰਡ ਖੋਲ੍ਹਣ ਲਈ ਪਾਸਵਰਡ ਪਾਓ।",
      password: "ਪਾਸਵਰਡ",
      unlockFill: "ਪਾਸਵਰਡ ਲਿਖੋ।",
      unlockBad: "ਪਾਸਵਰਡ ਨਹੀਂ ਮੰਨਿਆ ਗਿਆ। ਜਾਂ ਤਾਂ ਪਾਸਵਰਡ ਗਲਤ ਹੈ, ਜਾਂ ਹੇਠਲੇ ਦਿੱਤੇ ਈਮੇਲ ਨਾਲ ਕੋਈ ਖਾਤਾ ਨਹੀਂ ਹੈ।",
      unlockAccount: "ਖਾਤਾ:",
      unlockUnconfirmed: "ਦੁਕਾਨ ਦਾ ਖਾਤਾ ਅਜੇ ਪੁਸ਼ਟ ਨਹੀਂ ਹੋਇਆ। ਮਾਲਕ ਨੂੰ ਦੱਸੋ।",
      unlockTooMany: "ਬਹੁਤ ਵਾਰ ਕੋਸਿਸ਼ ਕੀਤੀ। ਇਕ ਮਿੰਟ ਰੁਕ ਕੇ ਦੁਬਾਰਾ ਕਰੋ।",
      unlockOffline: "ਡਾਟਾਬੇਸ ਨਾਲ ਕਨੈਕਸ਼ਨ ਨਹੀਂ। ਇੰਟਰਨੈਟ ਵੇਖੋ।",
      unlockHelp: "ਹਰ ਡਿਵਾਈਸ ਤੇ ਇੱਕ ਵਾਰ — ਫਿਰ ਇਹ ਸਕਰੀਨ ਖੁੱਲ੍ਹੀ ਹੀ ਰਹੇਗੀ।",
      lock: "ਸਕਰੀਨ ਲਾਕ ਕਰੋ", unlocked: "ਖੁੱਲ੍ਹੀ ਹੈ", accountSection: "ਸਾਈਟ ਪਾਸਵਰਡ",
      soundTest: "ਆਵਾਜ਼ ਟੈਸਟ",
      loading: "ਲੋਡ ਹੋ ਰਿਹਾ…", offline: "ਆਫ਼ਲਾਈਨ — ਬਾਅਦ ਵਿੱਚ ਸੇਵ ਹੋਵੇਗਾ",
      errSave: "ਸੇਵ ਨਹੀਂ ਹੋਇਆ। ਕਨੈਕਸ਼ਨ ਵੇਖੋ।",
      setupNeeded: "ਸੈਟਅੱਪ ਲੋੜੀਂਦਾ: ਸੈਟਿੰਗ ਖੋਲ੍ਹ ਕੇ Supabase ਕੁੰਜੀਆਂ ਪਾਓ।",
      items_n: (n) => n + " ਸਮਾਨ",
      qtyTotal: "ਕੁੱਲ"
    }
  };

  const MONTHS = {
    en: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    pa: ["ਜਨਵਰੀ","ਫ਼ਰਵਰੀ","ਮਾਰਚ","ਅਪ੍ਰੈਲ","ਮਈ","ਜੂਨ","ਜੁਲਾਈ","ਅਗਸਤ","ਸਤੰਬਰ","ਅਕਤੂਬਰ","ਨਵੰਬਰ","ਦਸੰਬਰ"]
  };

  const DAYS = {
    en: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
    pa: ["ਐਤ","ਸੋਮ","ਮੰਗਲ","ਬੁੱਧ","ਵੀਰ","ਸ਼ੁੱਕਰ","ਸ਼ਨੀ"]
  };

  // Preset kitchen notes, shown as big tappable chips
  const PRESET_NOTES = [
    { en: "Started making",        pa: "ਬਣਾਉਣਾ ਸ਼ੁਰੂ ਕਰ ਦਿੱਤਾ" },
    { en: "Half done",             pa: "ਅੱਧਾ ਹੋ ਗਿਆ" },
    { en: "Ready for pickup",      pa: "ਪਿਕਅੱਪ ਲਈ ਤਿਆਰ ਹੈ" },
    { en: "Will be a bit late",    pa: "ਥੋੜ੍ਹੀ ਦੇਰ ਹੋ ਜਾਵੇਗੀ" },
    { en: "Need more khoya",       pa: "ਖੋਆ ਹੋਰ ਚਾਹੀਦਾ ਹੈ" },
    { en: "Need more ingredients", pa: "ਸਮਾਨ ਹੋਰ ਚਾਹੀਦਾ ਹੈ" },
    { en: "Item out of stock",     pa: "ਇਹ ਮਿਠਾਈ ਖ਼ਤਮ ਹੈ" },
    { en: "Please call customer",  pa: "ਗਾਹਕ ਨੂੰ ਫ਼ੋਨ ਕਰੋ" },
    { en: "Question for front desk", pa: "ਫਰੰਟ ਡੈਸਕ ਲਈ ਸਵਾਲ ਹੈ" },
    { en: "Quantity looks wrong",  pa: "ਮਾਤਰਾ ਗ਼ਲਤ ਲੱਗਦੀ ਹੈ" }
  ];

  let lang = (localStorage.getItem("ob_lang") ||
              (window.OB_CONFIG && window.OB_CONFIG.DEFAULT_LANG) || "pa");

  window.OB = window.OB || {};
  window.OB.i18n = {
    get lang() { return lang; },
    set(l) {
      lang = (l === "en" ? "en" : "pa");
      localStorage.setItem("ob_lang", lang);
      document.documentElement.setAttribute("lang", lang);
      document.documentElement.classList.toggle("lang-pa", lang === "pa");
    },
    other() { return lang === "pa" ? "en" : "pa"; },
    t(key, arg) {
      const v = (S[lang] && S[lang][key]) !== undefined ? S[lang][key] : S.en[key];
      if (v === undefined) return key;
      return typeof v === "function" ? v(arg) : v;
    },
    months() { return MONTHS[lang]; },
    days() { return DAYS[lang]; },
    presets() { return PRESET_NOTES; },
    statusLabel(s) {
      return { new: this.t("stNew"), cooking: this.t("stCooking"),
               done: this.t("stDone"), cancelled: this.t("stCancelled") }[s] || s;
    }
  };
})();
