/* OrderBoard — one password for the whole site.

   Why this exists: the site is public and so is its key, so without a lock
   anyone who finds the URL can read and change orders.

   How it works: there is exactly ONE account, and its email sits in config.js.
   The unlock screen therefore asks only for a password, which is what the shop
   wanted — nobody has to remember a username. Underneath it is still a real
   Supabase sign-in, so the password is checked by Supabase's servers and the
   database policies only accept requests carrying the resulting session.

   That last part is what makes this worth anything. A password compared in
   JavaScript would be sitting in the page source for anyone to read. This one
   never reaches the browser at all.

   Each device unlocks once and stays unlocked; Supabase refreshes the session
   in the background.

   The unlock screen is only half the job: the other half is the SQL migration
   that stops the "anon" role from touching the tables. Both, or neither. */
(function () {
  const OB = (window.OB = window.OB || {});

  const auth = {
    user: null,
    token: "",
    _checked: false,

    /* The owner can switch the gate off in config.js — useful if an account
       problem ever locks the shop out mid-service. It leaves the data open,
       so it is meant as a spare key, not a setting to live with. */
    required() {
      return !(typeof OB_CONFIG !== "undefined" && OB_CONFIG.REQUIRE_LOGIN === false);
    },

    /* True when the app should show the sign-in screen instead of a view. */
    gateActive() {
      return !!(OB.db.ready && this.required() && !this.user);
    },

    signedIn() { return !!this.user; },
    email() { return (this.user && this.user.email) || ""; },

    /* Read whatever session this browser already has. */
    async restore() {
      this._checked = true;
      if (!OB.db.client) { this.user = null; return null; }
      try {
        const { data, error } = await OB.db.client.auth.getSession();
        if (error) throw error;
        this.user = (data && data.session && data.session.user) || null;
        this.token = (data && data.session && data.session.access_token) || "";
      } catch (e) {
        console.warn("[OB] could not read session", e.message || e);
        this.user = null;
      }
      return this.user;
    },

    /* The one shop account. Its email is fixed in config.js so the unlock
       screen only ever asks for the password. */
    adminEmail() {
      return ((typeof OB_CONFIG !== "undefined" && OB_CONFIG.ADMIN_EMAIL) || "").trim();
    },

    async signIn(password, emailOverride) {
      if (!OB.db.client) return { ok: false, error: "Not connected to the database" };
      const email = (emailOverride || this.adminEmail()).trim();
      if (!email) {
        return { ok: false, error: "ADMIN_EMAIL is not set in config.js" };
      }
      try {
        const { data, error } = await OB.db.client.auth.signInWithPassword({
          email: email,
          password: String(password || "")
        });
        if (error) return { ok: false, error: error.message, status: error.status };
        this.user = (data && data.user) || null;
        return { ok: true, user: this.user };
      } catch (e) {
        return { ok: false, error: e.message || String(e) };
      }
    },

    async signOut() {
      try { await OB.db.client.auth.signOut(); } catch (e) { /* ignore */ }
      this.user = null;
      this.token = "";
    }
  };

  OB.auth = auth;
})();
