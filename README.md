# Shoreline Wishes

A birthday surprise on a sunlit beach: a driftwood stick carves 20 romantic wishes (English and Tanglish) into the sand, and foaming waves wash each one away before the next. Built for phones first.

## Make it yours

1. Copy `.env.example` to `.env` and fill in your partner's details:

   ```
   VITE_PARTNER_NAME="Your Love"
   VITE_BIRTH_DATE="2006-01-01"   # YYYY-MM-DD, the age is worked out automatically
   VITE_BIRTH_TIME="05:42"        # 24-hour HH:MM
   ```

2. Edit the wishes in `src/data/wishes.ts` if you like. Sand lines can only use letters, numbers and `! ? , . ' - & : ♥ ★`; the notes underneath can use anything, emoji included.

3. Run it:

   ```
   npm install
   npm run dev      # http://localhost:3000
   npm test
   ```

Add `?studio` to the URL (or flip "All features" in the wishes sheet) to edit wishes, tune the stick and waves, or write your own.

## Deploy to GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds and publishes on every push to `main`.

1. Add the three `.env` values as repository secrets (Settings → Secrets and variables → Actions), or run `gh secret set -f .env`.
2. Set Settings → Pages → Source to **GitHub Actions**.
3. Push to `main`. The site appears at `https://<user>.github.io/<repo>/`.

The details are baked into the published page, so anyone with the link can see them.
