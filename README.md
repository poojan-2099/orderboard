# 🍬 Malkits Sweets & Catering — Order Board

A free, no-server sweets-order board for the shop.

- **Front desk** takes the order on a computer or iPad.
- **Kitchen** sees it instantly on a TV, in **Punjabi (ਪੰਜਾਬੀ)** or English.
- Kitchen taps **ਪੂਰਾ ਹੋ ਗਿਆ / Mark Done** → the front desk is told on **WhatsApp**.
- Kitchen can leave **notes** on an order ("ਖੋਆ ਹੋਰ ਚਾਹੀਦਾ ਹੈ") that pop up at the front desk.
- Every order is kept forever in a searchable **history**, exportable to CSV.
- **One shop password** unlocks a screen once, so the board is not open to
  whoever finds the link.

Total cost: **$0**. Hosted on GitHub Pages, data in Supabase's free tier.

> **Is it safe to have this repository public?** Yes — but only once Step 6 is
> done. Nothing secret is in these files: the key in `config.js` is the
> *publishable* key, which is meant to be public, and on a static site it could
> not be hidden anyway. What protects the orders is the sign-in plus the
> database policies in Step 6, not secrecy about the key. Never put the
> `service_role` / secret key in this repo.

---

## Setup — about 25 minutes, once

You need: a GitHub account and a Supabase account. A Facebook account too, but
only if you want the fully automatic WhatsApp in Step 4 Option B — skip it to
start.

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

### Step 4 — Choose how the front desk gets told

Two ways. **Start with A.** You can switch to B later without changing anything else.

| | A — Tap to send | B — Meta Cloud API |
|---|---|---|
| Setup | about 1 minute | 30–40 minutes on Meta's site |
| When an order is done | The kitchen screen shows a green 📲 button; one tap opens WhatsApp with the whole message already written, they press send | WhatsApp arrives by itself |
| Needs | nothing | Meta app, verified number, approved template |

A is genuinely fine for one shop. Do B when you want the message to arrive with
nobody near a screen at all.

#### Option A — Tap to send (no setup)

1. Open the app → **⚙ gear → WhatsApp notification**.
2. Pick **Off — tap to send**.
3. Worth doing: type the front desk WhatsApp number (with country code) in the
   box. With a number saved the 📲 button opens that chat straight away;
   without one, WhatsApp asks who to send to every time.
4. **Save settings.** Press **👁 Preview message** to see exactly what gets sent.

How it works in the kitchen: they tap **ਪੂਰਾ ਹੋ ਗਿਆ (Mark Done)** and the screen
immediately asks them to pass it on, with one big green button. The finished
order also keeps a 📲 button on its card until it has been sent, so a missed
one is easy to spot; once sent, the card shows 📲 Sent.

The front desk screen beeps and shows the finished order either way, and has its
own 📲 button — so neither end depends on the other remembering.

That is the whole of Option A. Skip to **Step 5**.

> Still do **4g** below at some point — it adds two columns so the sender choice
> is shared by every screen instead of being remembered per device. Until then
> the app keeps the choice on each device, which works but has to be set on each
> one.

#### Option B — Meta WhatsApp Cloud API (fully automatic)

This is the official WhatsApp Business API. It is free at your volume: Meta gives
you a test sender number, up to **5 recipient numbers**, and 1,000 free
conversations a month. One shop finishing orders all day will not come close.

Budget about 30–40 minutes. Most of it is on Meta's site, and you only do it once.

> **You do not need the Graph API Explorer** at any point. The token it hands out
> is a user token that expires in hours; 4c below makes a permanent one.

> **Why the extra Edge Function step?** Your site is public, so anything it holds
> is public. The Meta token must never be in it. The Edge Function runs on
> Supabase's servers, holds the token as a secret, and is the only thing that can
> send. The app just tells it "order 104 is done".

#### 4a. Create the Meta app

1. Go to **https://developers.facebook.com** and log in with a Facebook account.
2. **My Apps → Create App.** Pick type **Business**. Give it any name
   (e.g. `Punjab Sweet House Orders`).
3. On the app dashboard find **WhatsApp** and click **Set up**.
4. You land on **WhatsApp → API Setup**. Two things here matter:
   - **Phone number ID** — a long number under the test sender. *This is what you
     need, not the phone number itself.*
   - **Temporary access token** — ignore it, it dies in 24 hours. We make a
     permanent one in 4c.

#### 4b. Allow your front desk number to receive messages

Still on **API Setup**, find the **To** dropdown → **Manage phone number list** →
add your front desk WhatsApp number (with country code). Meta sends it a code;
type the code in to verify.

> The free test sender will only deliver to numbers verified this way, up to 5 of
> them. That is why this step is required.

#### 4c. Make a permanent access token

Temporary tokens expire overnight, which would silently break notifications.

1. Go to **https://business.facebook.com/settings**
2. **Users → System Users → Add.** Name it `orderboard`, role **Admin**.
3. With it selected: **Add Assets → Apps →** pick the app you made → turn on
   **Full control** → Save.
4. Click **Generate New Token.** Pick your app, then tick these two permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. **Generate**, then copy the token somewhere safe — Meta shows it only once.

#### 4d. Create the message template

WhatsApp does not let a business send free-form text to someone who has not
messaged them in the last 24 hours. Business-initiated messages must use an
approved template, so we need one.

1. **WhatsApp Manager → Message templates → Create template**
   (or from the app dashboard: **WhatsApp → Manage templates**).
2. Fill in:
   - **Name:** `order_ready`  *(lowercase, exactly this)*
   - **Category:** **Utility**  ← important; Marketing is slower to approve and costs more
   - **Language:** English (US)
3. Leave the header empty. For **Body**, paste exactly:

   ```
   Order #{{1}} is ready.

   Customer: {{2}}
   Items: {{3}}
   Finished by: {{4}}
   ```

4. Meta asks for sample values. Use: `104`, `Sharma ji`,
   `50 lb Gulab Jamun, 50 lb Besan Ladoo`, `Resham`.
5. **Submit.** Utility templates are usually approved within minutes.

#### 4e. Deploy the Edge Function

1. In **Supabase → Edge Functions → Create a new function** (the dashboard has a
   code editor, so you do not need to install anything).
2. Name it exactly **`notify-whatsapp`**.
3. Delete the sample code, then paste the entire contents of
   `supabase/functions/notify-whatsapp/index.ts` from this project.
4. **Deploy.**

#### 4f. Give the function its secrets

In **Supabase → Edge Functions → Secrets** (on some dashboards:
*Project Settings → Edge Functions*), add three:

| Name | Value |
|---|---|
| `WA_TOKEN` | the permanent token from 4c |
| `WA_PHONE_ID` | the Phone number ID from 4a |
| `WA_TO` | front desk number, **digits only**, e.g. `15551112222` |

Optional: `WA_TEMPLATE` (default `order_ready`) and `WA_LANG` (default `en_US`)
if you named your template differently.

> `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically —
> do not add those yourself.

#### 4g. Add the two new database columns

In **Supabase → SQL Editor → New query**, paste the contents of
`supabase/migrations/2026-10-27-whatsapp-provider.sql` and **Run**.

> ⚠️ Run the **migration**, not `schema.sql`. Re-running `schema.sql` drops and
> recreates the tables, which would delete every order you have.

#### 4h. Test it

Open the app → **⚙ gear icon → WhatsApp notification** → choose **Meta Cloud API**
→ **Save settings** → **Send test message**.

A WhatsApp should arrive within seconds. If it does not, the black box on that
screen shows Meta's actual error with a plain-English explanation of what to fix.

<details>
<summary><b>If the test fails — common causes</b></summary>

| What you see | What it means |
|---|---|
| `Missing secrets: …` | The function deployed but 4f is incomplete. |
| `404` / not found | Function name is not exactly `notify-whatsapp`, or not deployed. |
| Template not found | Template is still pending approval, or the name does not match `WA_TEMPLATE`. |
| Re-engagement / recipient error | The front desk number is not verified — redo 4b. |
| Token / OAuth / expired | You used the 24-hour temporary token. Redo 4c. |
| `401` from Supabase | In Edge Functions → your function → Details, either keep **Verify JWT** on and use your anon key, or switch it off. |

</details>

> **Don't want to do any of this right now?** Set the sender to **Off — tap to
> send** in the same screen. The kitchen marking an order done still beeps the
> front desk and shows a banner with a one-tap button that opens WhatsApp with
> the whole message already written. It is one extra tap and needs no setup.

### Step 5 — Set up the screens

Open the app on each device and go to **Settings → This device**:

| Device | Language | "This screen is" | Open this page |
|---|---|---|---|
| Front desk computer | English | `Front Desk` | **New Order** |
| Kitchen TV / iPad | ਪੰਜਾਬੀ | `Kitchen` | **Kitchen** → tap **ਟੀਵੀ ਮੋਡ** |

Each screen is also unlocked once with the shop password (Step 6) and stays
unlocked afterwards.

On the kitchen screen, tapping **ਟੀਵੀ ਮੋਡ (TV mode)** hides the menus, goes
fullscreen, and makes the text large enough to read across the room. It stays
in TV mode even after a refresh.

**Tip for the iPad:** open the page in Safari, tap the Share button →
*Add to Home Screen*. It then opens like a real app, with no browser bars.

---

### Step 6 — Lock it down (do this before sharing the link)

Until this step is done, anybody who finds the site URL can read and change
orders. There is **one password for the whole site** — front desk and kitchen
type the same one, once per device.

**6a. Create the shop account.**

Supabase → **Authentication → Users → Add user → Create new user**.

- Email: `admin@malkits.local` — it must match `ADMIN_EMAIL` in `config.js`.
  It never receives mail; it is only the account's name, and staff never type it.
- Password: pick the one the shop will use. Make it long rather than clever.
- Tick **Auto Confirm User**, or the account cannot sign in until a
  confirmation email is clicked.

Write the password somewhere the staff can see it, such as taped inside a
cupboard door. Changing it later is one click in the same screen
(**Reset password**) and needs no code change — screens already unlocked stay
unlocked.

**6b. Switch off public sign-up.**

Supabase → **Authentication → Sign In / Providers → Email** → turn **off**
*Allow new users to sign up*. Without this a stranger could register their own
account and walk straight in.

**6c. Unlock each screen once.**

Open the app. It asks for the password, and that device stays unlocked
afterwards — once per screen, not once per shift. **⚙ Settings → Site password
→ 🔒 Lock this screen** locks it again if you ever need to.

**6d. Then run the lockdown migration.**

Supabase → **SQL Editor → New query** → paste all of
`supabase/migrations/2026-10-28-require-login.sql` → **Run**.

It prints a small table at the end. Every row should say `{authenticated}` and
none should say `anon`. That is the proof it worked: the database now refuses
any request that does not carry an unlocked session, so the public key on its
own opens nothing.

> ⚠ Run the **migration**, never `schema.sql`. `schema.sql` is only for a brand
> new, empty project — it drops the tables and would delete every order.

> **If the password ever stops working mid-service**, the bottom of that file
> has a commented-out rollback block that re-opens access, and setting
> `REQUIRE_LOGIN: false` in `config.js` removes the lock screen. That is a spare
> key for a bad afternoon, not a way to run the shop — it leaves the board open
> to anyone with the link.

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
- **ਪੂਰਾ ਹੋ ਗਿਆ (Mark Done)** — finishes the order. In tap-to-send mode the
  screen then shows one green **📲 ਫਰੰਟ ਡੈਸਕ ਨੂੰ ਭੇਜੋ (Send to Front Desk)**
  button — tapping it opens WhatsApp with the message already written. With the
  Meta sender set up, the WhatsApp goes by itself and there is no button.

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

**Nothing depends on one screen.** In tap-to-send mode the kitchen gets the
📲 button and the front desk screen also beeps, shows the finished order and
keeps its own 📲 button — so either end can pass it on. With the Meta sender
configured, the front desk screen also notices within a minute if the kitchen
tablet failed to send and sends it itself.

**Screens stay unlocked.** The session is kept on the device and renewed in the
background, so a kitchen TV left on for weeks does not start asking for the
password again. Locking it is in **⚙ Settings → Site password**.

**Supabase free projects pause after 7 days of no activity.** Any normal week of
orders keeps it awake. If you close the shop for a week, sign in to
supabase.com and click **Restore** — your data is not lost.

**Free tier limits** (Supabase): 500 MB database, 2 GB bandwidth/month. An order
is roughly 1 KB, so this holds hundreds of thousands of orders.

---

## Security — how this is protected

**What is public.** The site, and the publishable key in `config.js`. That key
is designed to be public and cannot be hidden on a static site anyway — anyone
can read it in the page source. It identifies the project; on its own it grants
nothing.

**What protects the orders.** Two things working together:

1. **The lock screen** — one shop password, no session, no app.
2. **The database policies** (Step 6d) — the order tables only answer requests
   carrying a real session. This is the half that actually matters. A policy is
   enforced by Postgres on the server, so it holds even for somebody poking at
   the API directly with the public key and ignoring the app entirely.

**Why the password is not in `config.js`.** It would be readable by anyone who
viewed the page source, and a password compared in JavaScript can simply be
skipped past. Instead the password belongs to a single Supabase account: it is
checked on Supabase's servers, and what comes back is the session the policies
above demand. Nothing secret is ever shipped to the browser.

**Never put these in this repository:** the `service_role` / secret Supabase key,
or a Meta access token. Both grant full access and bypass every policy above.
The Meta token belongs in a Supabase Edge Function secret (`WA_TOKEN`), which is
why Step 4 Option B routes through a function instead of sending from the
browser. `diagnose.html` refuses to run and tells you to rotate the key if it
ever finds a `service_role` key in the config.

**Checking it is really on.** Open `diagnose.html` **without** unlocking. The
database tables check should fail with *permission denied*. That failure is the
security working. Unlock on that page and it should pass.

**If the password gets out**, reset it in Supabase → Authentication → Users.
Screens that are already unlocked keep working; new ones need the new password.
Nothing needs redeploying.

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
js/auth.js             the shop password / lock / unlock
js/notify.js           WhatsApp senders + browser alerts
js/view-login.js       the unlock screen
js/view-new.js         order entry form
js/view-board.js       kitchen board / TV screen
js/view-desk.js        front desk live view
js/view-log.js         history, search, export
js/view-settings.js    settings
js/app.js              router, shared state, startup
diagnose.html          connection checker, for when something looks broken
supabase/schema.sql    ← run this once, on a brand new project only
supabase/migrations/   ← run these on an existing project, in date order
supabase/functions/    the Edge Function for Step 4 Option B
```

No build step, no npm, no framework. Edit a file, push, done.

## Running it on your own computer

```bash
cd orderboard
python3 -m http.server 8777
```

Then open http://localhost:8777
