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
   Then commit this file. These two values are designed to be
   public (see README > Security).
   ============================================================ */

window.OB_CONFIG = {
  SUPABASE_URL:  "https://udtwbludzpssruwpqhjs.supabase.co/rest/v1/",
  SUPABASE_ANON: "sb_publishable_s8ruZzvUCu1jw8eHm0U02Q_MAM5Jzbf",

  // Default language for every screen: "pa" (Punjabi) or "en" (English)
  DEFAULT_LANG: "en",

  // Kitchen board: play a beep when a new order arrives
  SOUND_ON_NEW_ORDER: true,

  // Fallback refresh in seconds, in case the live connection drops
  POLL_SECONDS: 15
};
