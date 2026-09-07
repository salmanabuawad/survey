# استبيان للمعلمات في رياض الأطفال — KidSphere / Inas

Arabic-first, RTL, mobile-first survey app for kindergarten teachers, with a
password-protected dashboard for results and question editing.

Live: **https://survey.kortexd.com** · Dashboard: **https://survey.kortexd.com/admin**

Survey version: `inas-kindergarten-teachers-ar-v1`

---

## How questions are versioned

Questions live in the database and admins can edit, add, delete and reorder
them. **An edit never rewrites history.** Changing a question's text, hint, type
or options:

1. marks the current row `archived` — it keeps every answer already given to it,
2. creates a new `live` row in the same *lineage*, starting at zero answers.

```
q5 v1  "…بحاجة إلى دعم أكبر"    archived   40 answers   ← frozen, still in results and CSV
q5 v2  "…بحاجة إلى دعم إضافي"   live        0 answers   ← what teachers see now
```

Nobody's answer is ever re-attributed to wording they did not read. The
dashboard shows each version as its own chart, badged `نسخة N · حالي` or
`· مؤرشف`, and the CSV export gets one column per version.

Deleting is soft: the row becomes `deleted`, disappears from the survey, and
keeps its answers in the results and the export. It can be restored as long as
no newer version of that lineage is live.

**Reordering and moving a question between sections are deliberately not
versioned** — they change where a question sits, not what it asks. Question
numbers are derived from section and position order at render time, so they
shift when you reorder; `lineage_key` (`q1`…`q27`, then `q28`…) is the stable
identifier and is what the dashboard filters key off.

Every version-forking edit is gated behind an explicit confirmation in the UI,
so archiving a version is never a surprise.

### The locked original

`src/lib/survey-content.ts` holds Inas's questionnaire exactly as approved. It is
no longer what the app renders — it is the **seed** and the reference point:

- `npm run verify:content` diffs it against the locked Arabic source in
  `content/SURVEY_SOURCE_AR.md` and fails on any drift. The deploy script runs
  it before every build, so the original can never be quietly altered in code.
- `npm run db:seed` writes version 1 of every question from it. Idempotent and
  non-destructive: it does nothing once any question row exists, so it can never
  overwrite an admin's edits. The app runs the same seed on first request.
- `npm run db:diff-live` reports how far the live questionnaire has drifted from
  the original. Drift is expected now that editing is allowed, so this is
  informational and always exits 0.

```
$ npm run db:diff-live
Live questionnaire is identical to the locked original — 10 sections, 27 questions, all at version 1.
```

### Question types

The seed derives these from the source rather than inventing them:

| Type | Questions |
| --- | --- |
| Free text | 6, 25, 26, 27 |
| Multiple selection | 5, 9, 10, 12, 14, 15, 17, 20, 22, 23 |
| Single choice | all others |

Q5 is the only one the source explicitly marks multi-select
(«يمكن اختيار أكثر من إجابة»), and that line is shown verbatim. The rest are
checklists and carry a neutral «اختيار متعدد» UI badge.

An option ending in `__________` (e.g. `أخرى: __________`) reveals a text input
when picked. **The visible label keeps its underscores**; what the teacher types
is stored separately in `other_text`. The editor infers that behaviour from the
underscores, so adding one to a new option is all it takes.

### Required vs optional

Free-text questions are optional; every other question is required. A teacher
with nothing to add is not blocked from submitting the structured answers the
analysis depends on. See `isRequired` in `src/lib/validation.ts`.

### The flow

An introduction screen carrying Inas's opening text and the anonymity notice,
then **one question per screen** advanced with التالي / السابق, then the
thank-you screen.

Each question screen keeps its section title above the card, so the question
never loses its context, and a row of ten dots — one per section, not per
question — shows which section you are in, marks completed sections, and jumps
to a section's first question. `التالي` refuses to advance past an unanswered
required question and says so inline; the message clears the moment an answer is
given.

Answers and the current position autosave to `localStorage` on every change and
restore on reload, so a teacher can close the tab and come back.

---

## Anonymity

The questionnaire states it is anonymous, and the implementation holds to that:

- No name, phone, email, ID number or child name is requested or stored — there
  is no column for any of them.
- **No IP address, user agent or request header is persisted.** The submission
  handler reads only the JSON body.
- Response ids are server-generated UUIDs, not derived from anything about the
  respondent.
- The page is `noindex`.
- A privacy helper sits under every free-text box:
  «يرجى عدم ذكر أسماء الأطفال أو معلومات تكشف هويتهم.»

nginx does receive IP addresses at the TCP level and writes them to its own
access log, as any web server does; nothing links those entries to a response
row. Set `access_log off;` in the vhost if even that is unwanted.

---

## Stack

Next.js 16 (App Router) · TypeScript · React 19 · Tailwind CSS v4 ·
PostgreSQL 16 · Prisma · Zod · Recharts · IBM Plex Sans Arabic

UI primitives under `src/components/ui/` are written in the shadcn/ui
copy-in-your-repo style rather than pulled from the registry, so there is no
generator step and no unused surface.

---

## Local setup

Requires Node 20+ and a PostgreSQL 14+ database.

```bash
git clone https://github.com/salmanabuawad/survey.git
cd survey
npm install
cp .env.example .env      # then fill it in
npx prisma migrate deploy
npm run db:seed
npm run dev               # http://localhost:3000
```

`.env`:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. Append `?sslmode=require` for Supabase/Neon. |
| `ADMIN_PASSWORD` | Password for `/admin`. Use something long and random. |
| `SESSION_SECRET` | Signs the admin cookie. `openssl rand -base64 48`. |
| `PORT` | Port the server listens on (3020 in production). |

| Script | What it does |
| --- | --- |
| `npm run verify:content` | Diff the locked seed against the Arabic source. Fails on drift. |
| `npm run db:seed` | Seed version 1 of every question. No-op if any exist. |
| `npm run db:diff-live` | Report drift between the live questionnaire and the original. |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run build` | `prisma generate && next build` |

---

## The dashboard

`/admin` — one shared password, an HMAC-signed httpOnly session cookie valid for
8 hours. There is no user table.

**`/admin/dashboard`** — results:

- total submissions, submissions per day (zero-filled, so a quiet day shows as
  zero rather than vanishing)
- average **and median** completion time — the mean alone is easily dragged by a
  tab left open overnight
- per-question-version distributions with counts and percentages
- horizontal bar charts, labels on the right, bars growing right-to-left, and a
  category axis that wraps long Arabic labels across up to three lines instead
  of truncating them
- filters on framework type, age group, group size and experience, kept in the
  URL so a filtered view can be bookmarked and shared
- a searchable viewer for the free-text answers

Percentages are **of respondents, not of picks** — on a multi-select question a
column reads "63% of teachers chose this", and the total can exceed 100%.

**`/admin/questions`** — the editor: add, edit, delete, restore and reorder,
grouped by section, with archived versions and deleted questions collapsed at
the bottom.

### CSV export

`تصدير CSV` respects the active filters. One row per response, one column per
question **version**, in questionnaire order:

```
response_id, submitted_at, survey_version, completion_seconds, 1. …, 2. …, …
```

A version only holds values for responses collected while it was live, so an
edit shows up as one column ending and the next beginning. Columns are suffixed
`[نسخة N]` only where a lineage actually has more than one version.

Multi-select cells join their labels with ` | `. Text typed into «أخرى» is
appended to the option it belongs to. The file starts with a UTF-8 BOM so Excel
opens the Arabic correctly instead of as mojibake.

---

## Data model

Four tables — see `prisma/schema.prisma`.

`section` and `question` hold the questionnaire. A `question` row is one
*version*: rows sharing a `lineage_id` are the same question over time,
distinguished by `version` and `status` (`live` / `archived` / `deleted`).

`survey_response` holds one row per submission, plus copies of the four profile
answers so the dashboard can filter without joining every answer.

`survey_answer` holds one row per question per response. It points at the exact
question **version** answered, and also snapshots `question_text`,
`question_number` and `question_type` as they were rendered. The snapshot is
redundant on purpose: it survives even if the question row is later hard-deleted,
and it is what the export reads.

Responses and their answers are written in a single transaction: a response row
without its answers would look like a completed submission with every value
missing.

---

## Production deployment

Ubuntu 24.04 at `185.229.226.37`, alongside the other sites on that host.

| | |
| --- | --- |
| App directory | `/opt/survey` |
| Service | `survey.service` (systemd, runs as `www-data`) |
| Port | `127.0.0.1:3020`, not exposed directly |
| Database | `kidsphere_survey`, role `survey_app` |
| nginx vhost | `/etc/nginx/sites-available/survey.kortexd.com` |
| TLS | Let's Encrypt, auto-renewing |
| Secrets | `/opt/survey/.env`, `0640 root:www-data` |
| Backups | `/root/survey-backups/` |

### Deploying a change

Source is shipped as a tarball, so the box needs no deploy key:

```bash
tar --exclude=node_modules --exclude=.next --exclude=.git --exclude=.env \
    -czf /tmp/survey-src.tgz . \
  && scp /tmp/survey-src.tgz root@185.229.226.37:/tmp/ \
  && ssh root@185.229.226.37 'tar -xzf /tmp/survey-src.tgz -C /opt/survey \
       && bash /opt/survey/scripts/deploy/deploy.sh'
```

`scripts/deploy/deploy.sh` installs dependencies, **verifies the content lock**,
migrates, builds, assembles the standalone bundle, restarts and smoke-tests.
`.env` is never in the tarball and is left untouched.

Two things that will bite you if you edit that script:

- `npm ci` must run **with** dev dependencies — Tailwind, TypeScript, `tsx` and
  the Prisma CLI are all build-time.
- Do **not** export `NODE_ENV=production` before `next build`; Turbopack then
  fails to resolve the PostCSS plugin. `next build` sets it itself, and the
  runtime gets it from the systemd unit.

Take a backup before any schema change:

```bash
sudo -u postgres pg_dump -Fc kidsphere_survey > /root/survey-backups/$(date +%F-%H%M).dump
```

`scripts/restore-responses.ts` restores responses exported from the
pre-versioning schema, mapping each answer's `question_key` onto the seeded
version 1 of that lineage. It skips responses whose id already exists, so it is
safe to re-run.

Logs: `journalctl -u survey -f`

---

## Deploying elsewhere

### Vercel + Supabase / Neon

1. Push the repo to GitHub and import it into Vercel.
2. Create a Postgres database on Supabase or Neon and copy the pooled connection
   string.
3. In Vercel → Settings → Environment Variables set `DATABASE_URL` (with
   `?sslmode=require`), `ADMIN_PASSWORD` and `SESSION_SECRET`.
4. Build command `npm run build` — it runs `prisma generate` first, which
   Vercel's build cache otherwise skips.
5. Apply migrations once from your machine, pointed at the hosted database:
   `DATABASE_URL='…' npx prisma migrate deploy`. The first request seeds the
   questions, or run `npm run db:seed` yourself.
6. Remove `output: "standalone"` from `next.config.ts` — Vercel does its own
   packaging. It is only there for the self-hosted systemd service.

### Any other Node host

`npm ci && npm run build`, then run `.next/standalone/server.js` with `PORT`,
`HOSTNAME` and the three environment variables set. Copy `.next/static` to
`.next/standalone/.next/static` and `public` to `.next/standalone/public`
first — Next does not do this for you.

---

## Accessibility

- `<html lang="ar" dir="rtl">`, structural RTL throughout (logical properties,
  no mirrored margins)
- every input has a real label or `aria-label` carrying the exact question text;
  the «أخرى» input is labelled with its own option text
- questions are grouped in `<fieldset>` with a `<legend>`
- validation messages use `role="alert"` and are wired via `aria-describedby`;
  invalid fields get `aria-invalid`
- visible focus ring on every interactive element, tap targets ≥ 44px
- the progress bar is a real `role="progressbar"`; section dots announce their
  section name and completion state
- `prefers-reduced-motion` is respected
- verified with no horizontal scroll at 360px and 390px

---

## Known issues

`npm audit` reports a high-severity advisory in `deepmerge-ts`, reached through
`@prisma/config` ← `prisma`. That is the Prisma **CLI**, used at build time only;
it is not in the request path, and `@prisma/client` (the runtime) is unaffected.
Clearing it requires a Prisma 8 major upgrade — worth doing on its own, not as
part of a deploy.

A teacher with the survey open when an admin edits it will have the edited
question's saved draft answer dropped on reload, and a submit from that stale tab
is rejected with a message asking them to reload. Answers to *untouched*
questions survive.
