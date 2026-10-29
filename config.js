/* ============================================================
   OrderBoard — connection settings
   ------------------------------------------------------------
   Fill in these two values from your Supabase project.

   SUPABASE_URL  — Dashboard > Settings (gear) > "Data API" > Project URL.
                   Shortcut: it is always https://<ref>.supabase.co, where
                   <ref> is the code in your browser's address bar at
                   supabase.com/dashboard/project/<ref>

   SUPABASE_ANON — Dashboard > Settings (gear) > "API Keys".
                   Use the "Publishable key" (starts with sb_publishable_).
                   On older projects this is instead under the
                   "Legacy API keys" tab, called "anon" / "public"
                   (a long string starting with eyJ...). Either one works.
                   NEVER use the "secret" or "service_role" key here.
   Then commit this file. These two values are designed to be public: the
   database only lets a signed-in user read or write anything.
   ============================================================ */

window.OB_CONFIG = {
  // One password for the whole site. Everybody — front desk and kitchen — types
  // the same one, once per device, and the screen stays unlocked afterwards.
  //
  // The password itself is NOT here, and must never be: this file is public.
  // It belongs to the single Supabase account named below, which is created in
  // Supabase -> Authentication -> Users. That is what makes it real security
  // rather than a password checked in JavaScript that anyone could read past.
  // To change the password, change it on that account in Supabase; nothing
  // here needs editing.
  REQUIRE_LOGIN: true,
  ADMIN_EMAIL: "admin@malkits.local",

  // Shown on the sign-in screen and in the header before the database has been
  // read. The real name lives in the database (Settings -> Shop name).
  SHOP_NAME: "Malkits Sweets & Catering",

  SUPABASE_URL:  "https://udtwbludzpssruwpqhjs.supabase.co",
  SUPABASE_ANON: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkdHdibHVkenBzc3J1d3BxaGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNzM5NjUsImV4cCI6MjEwODY0OTk2NX0.s_wfJMR8BICadiXzb7ctWg1bo1apRX-y0RjY49Q6OME",

  // Default language for every screen: "pa" (Punjabi) or "en" (English)
  DEFAULT_LANG: "en",

  // Kitchen board: play a beep when a new order arrives
  SOUND_ON_NEW_ORDER: true,

  // Fallback refresh in seconds, in case the live connection drops
  POLL_SECONDS: 15
};
