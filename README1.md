# 🍬 Order Board

A free, no-server sweets-order board for a restaurant / sweet shop.

- **Front desk** takes the order on a computer or iPad.
- **Kitchen** sees it instantly on a TV, in **Punjabi (ਪੰਜਾਬੀ)** or English.
- Kitchen taps **ਪੂਰਾ ਹੋ ਗਿਆ / Mark Done** → the front desk gets a **WhatsApp message**.
- Kitchen can leave **notes** on an order ("ਖੋਆ ਹੋਰ ਚਾਹੀਦਾ ਹੈ") that pop up at the front desk.
- Every order is kept forever in a searchable **history**, exportable to CSV.

Total cost: **$0**. Hosted on GitHub Pages, data in Supabase's free tier,
WhatsApp through CallMeBot's free service.

---

## Setup — about 20 minutes, once

You need three free accounts: GitHub, Supabase, and a WhatsApp number you already have.

### Step 1 — Create the database (Supabase)

1. Go to **https://supabase.com** → *Start your project* → sign in with GitHub.
2. Click **New project**.
   - Name: `orderboard`
   - Database password: pick anything and save it somewhere (you won't need it day to day)
   - Region: pick the one closest to your shop
   - Click **Create new project** and wait ~2 minutes.
3. In the left sidebar click **SQL Editor** → **New query**.
4. Open the file `supabase/schema.sql` from this project, copy **the whole thing**,
   paste it into the editor, and press **Run**.
   You should see *"Success. No rows returned."*
5. Now collect two values. **Supabase renamed these recently**, so the names
   depend on how old your project is — the table below covers both.

   | What you need | Where it is now | What it looks like |
   |---|---|---|
   | **Project URL** | gear icon **Settings → Data API** | `https://abcdefgh.supabase.co` |
   | **The key** | gear icon **Settings → API Keys** → **Publishable key** | `sb_publishable_AbCd1234...` |
   | *(older projects)* | **Settings → API Keys → Legacy API keys** tab → row marked **`anon` `public`** | `eyJhbGciOiJIUzI1...` |

   **Either key works.** Use whichever one your dashboard shows.

   > ⚠️ Do **not** use the key marked **secret**, **service_role**, or
   > **Secret key**. That one bypasses all security rules and must never go in
   > a file you publish to GitHub.

   **Can't find the Project URL anywhere?** You can build it yourself. Look at
   your browser's address bar while you're in the project — it reads
   `supabase.com/dashboard/project/abcdefgh`. That `abcdefgh` part is your
   project ref, so your URL is `https://abcdefgh.supabase.co`.

### Step 2 — Put your keys in the app

Open `config.js` and paste the two values:

```js
window.OB_CONFIG = {
  SUPABASE_URL:  "https://abcdefgh.supabase.co",
  SUPABASE_ANON: "sb_publishable_AbCd1234...",   // or the legacy eyJhbGciOi... key
  ...
};
```

Save the file.

> Don't want to edit the file by hand? You can skip it: open the app, go to
> **Settings**, and paste both values there instead. That stores them on that
> one device only, which is handy for testing before you commit anything.

> The publishable/anon key is *meant* to be public — it only grants the access
> your database rules allow, which is why Step 1's policies matter. Read
> **Security** at the bottom before you go live.

### Step 3 — Put it on the internet (GitHub Pages)

1. Create a new repository on GitHub, e.g. `orderboard`.
2. Upload every file in this folder (or `git push` it).
3. In the repository go to **Settings → Pages**.
4. Under *Build and deployment*, set **Source: Deploy from a branch**,
   **Branch: `main`**, folder **`/ (root)`**, then **Save**.
5. Wait a minute. Your app is live at:
   `https://YOUR-USERNAME.github.io/orderboard/`

Using git from the terminal:

```bash
git init
git add .
git commit -m "Order Board"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/orderboard.git
git push -u origin main
```

### Step 4 — Turn on WhatsApp notifications (CallMeBot)

CallMeBot sends a WhatsApp message to **one** number, for free.

1. On the phone that should receive the alerts, save this contact:
   **+34 644 59 71 67**
2. From WhatsApp, send that contact exactly this message:
   ```
   I allow callmebot to send me messages
   ```
3. Within a minute the bot replies with your **API key** (a number like `123456`).
4. Open your app → **Settings** → *WhatsApp notification*:
   - **WhatsApp number**: your full number with country code, e.g. `+15551112222`
   - **CallMeBot API key**: the number the bot sent you
   - Click **Save settings**, then **Send test message**.

You should get a WhatsApp message within seconds. If you don't, click
**🔎 Open test URL** — that opens CallMeBot's reply in a new tab so you can read
the actual error.

> The key is stored in your database so the kitchen's tablet can send too —
> nobody has to set anything up on the kitchen screen.

### Step 5 — Set up the screens

Open the app on each device and go to **Settings → This device**:

| Device | Language | "This screen is" | Open this page |
|---|---|---|---|
| Front desk computer | English | `Front Desk` | **New Order** |
| Kitchen TV / iPad | ਪੰਜਾਬੀ | `Kitchen` | **Kitchen** → tap **ਟੀਵੀ ਮੋਡ** |

On the kitchen screen, tapping **ਟੀਵੀ ਮੋਡ (TV mode)** hides the menus, goes
fullscreen, and makes the text large enough to read across the room. It stays
in TV mode even after a refresh.

**Tip for the iPad:** open the page in Safari, tap the Share button →
*Add to Home Screen*. It then opens like a real app, with no browser bars.

---

## Day-to-day use

### Front desk — taking an order

1. Open **New Order**.
2. Fill in the customer name, the due date and time.
3. Add the items. You can tap a **Quick pick** button for a common sweet, or
   type the name — it autocompletes in both English and Punjabi.
   One customer can have as many items as you like
   (50 lb gulab jamun **and** 50 lb besan ladoo **and** …).
4. Add a note for the kitchen if needed, flag it **Urgent** if it is.
5. **Save Order.** It appears on the kitchen TV instantly.

### Kitchen — working an order

The board has three columns: **ਨਵਾਂ (New)** → **ਬਣ ਰਿਹਾ (Making)** → **ਪੂਰਾ (Done)**.

- **ਸ਼ੁਰੂ ਕਰੋ (Start)** — moves it to *Making*, so the front desk knows it's underway.
- **ਟਿੱਪਣੀ (Comment)** — leave a note. There are ten ready-made notes you can tap
  (ਅੱਧਾ ਹੋ ਗਿਆ, ਖੋਆ ਹੋਰ ਚਾਹੀਦਾ ਹੈ, ਦੇਰ ਹੋ ਜਾਵੇਗੀ …) so nobody has to type.
- **ਪੂਰਾ ਹੋ ਗਿਆ (Mark Done)** — finishes the order and fires the WhatsApp message.

Orders that are past their due time turn red and say **ਸਮਾਂ ਨਿਕਲ ਗਿਆ (OVERDUE)**.
Urgent orders sort to the top.

### Front desk — staying on top of it

The **Front Desk** page shows everything in progress, with kitchen notes
highlighted. It also beeps and shows a banner when a new note arrives. Click the
🔔 button once to allow desktop notifications.

### History

**ਪੁਰਾਣੇ ਆਰਡਰ / History** — filter by date, status, or search by customer, phone,
order number, or item name. **Details** shows the full activity log of an order:
who created it, every status change, every note, and when WhatsApp went out.
**Export CSV** opens in Excel or Google Sheets, with Punjabi text intact.

---

## Language

The **ਪੰ / EN** button in the top-right switches the whole app between Punjabi
(Gurmukhi) and English. Each device remembers its own choice, so the kitchen TV
can be in Punjabi while the front desk is in English — it's the same data.

Item names are stored in both languages, so the front desk can type
"Gulab Jamun" and the kitchen sees **ਗੁਲਾਬ ਜਾਮਨ**.

### Adding your own sweets

Open `js/catalog.js` and add a line to the list:

```js
{ en: "Pista Roll",  pa: "ਪਿਸਤਾ ਰੋਲ",  fav: true },
```

`fav: true` puts it on the **Quick pick** buttons on the order form.
Save, commit, push — it's live.

If you type an item that isn't in the list, it still saves fine; it just won't
have a translation.

---

## Good to know

**It works offline-ish.** If the internet drops while saving an order, the app
keeps it on the device and sends it automatically when the connection comes back.
You'll see *"ਆਫ਼ਲਾਈਨ — ਬਾਅਦ ਵਿੱਚ ਸੇਵ ਹੋਵੇਗਾ"* instead of an error.

**WhatsApp has a backstop.** If the kitchen tablet can't reach CallMeBot, the
front desk screen notices within a minute and sends it instead. If it still
fails, the Front Desk page shows a **ਵਟਸਐਪ ਭੇਜੋ (Send WhatsApp)** button, plus a
*Open in WhatsApp* link that opens WhatsApp with the message already typed.

**Supabase free projects pause after 7 days of no activity.** Any normal week of
orders keeps it awake. If you close the shop for a week, sign in to
supabase.com and click **Restore** — your data is not lost.

**Free tier limits** (Supabase): 500 MB database, 2 GB bandwidth/month. An order
is roughly 1 KB, so this holds hundreds of thousands of orders.

---

## Security — please read before going live

This app has **no login screen**, which is what makes it simple for non-technical
kitchen staff. The trade-off: anyone who knows your GitHub Pages URL can open the
board, add orders, and read the history. The database rules allow it on purpose.

For a small shop with a URL you only share internally, that is usually fine. If
you want it locked down, there are two easy options:

1. **Keep the URL private** and make the GitHub repository private
   (GitHub Pages on a private repo requires a paid plan).
2. **Add a login.** In Supabase: *Authentication → Providers → Email*, create one
   account per staff member, then in the SQL editor replace `to anon` with
   `to authenticated` in each of the four policies. You'd then add a sign-in
   screen to the app — ask for help with this if you want it.

Also note the CallMeBot key is stored in the database so every screen can send.
If it ever gets misused, message the CallMeBot number again to get a new key.

---

## Files

```
index.html             the app shell
config.js              ← your Supabase keys go here
css/styles.css         all styling, including TV mode
js/i18n.js             every piece of on-screen text, English + Punjabi
js/catalog.js          ← add your own sweets here
js/util.js             dates, toasts, modals, sound, CSV
js/db.js               Supabase reads/writes, live updates, offline queue
js/notify.js           WhatsApp (CallMeBot) + browser alerts
js/view-new.js         order entry form
js/view-board.js       kitchen board / TV screen
js/view-desk.js        front desk live view
js/view-log.js         history, search, export
js/view-settings.js    settings
js/app.js              router, shared state, startup
supabase/schema.sql    ← run this once in Supabase
```

No build step, no npm, no framework. Edit a file, push, done.

## Running it on your own computer

```bash
cd orderboard
python3 -m http.server 8777
```

Then open http://localhost:8777
