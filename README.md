# AI and Young People: Balancing Technology and Humanity — project website

Static site (HTML + CSS + vanilla JS) for GitHub Pages. English only.
All texts, numbers, links and video IDs live in **`js/content.js`** — that is the only file you normally edit.

## Folder structure

```
index.html
css/style.css
js/content.js      <- edit texts, YouTube IDs, Firebase URL here
js/main.js         <- logic (no need to edit)
images/hero/hero.jpg            (optional)
images/gallery/photo-1.jpg ...
images/days/day1 ... day7/photo-1.jpg ...
images/countries/romania|moldova|jordan|ukraine|georgia|poland/photo-1.jpg ...
images/logos/eu-cofunded.png, logo-youth-emblem.png, logo-youth.png, favicon.png
files/Schedule_AI_and_Young_People.xlsx   (download button in Programme)
.nojekyll
```

## Photos

- Name files `photo-1.jpg`, `photo-2.jpg`, ... (lowercase). Formats: jpg, jpeg, png, webp (not HEIC). Max ~1600 px wide.
- GitHub Pages is **case-sensitive**: `photo-1.jpg` works, `Photo-1.JPG` does not.
- The site finds photos automatically. A missing number in the middle is skipped; the search stops after 3 missing numbers in a row (or after `photoMax`).
- Programme days show a short description and a photo slider (no pop-ups). Use landscape photos for the sliders.
- To add photos to the Gallery, put them into `images/gallery/` as `photo-N.jpg`.
- To use specific file names instead, add `photos: ["a.jpg", "b.jpg"]` to a day, country or `gallery` entry in `content.js`.
- **Consent:** publish only photos of people who gave consent. This is the site owner's responsibility.

## YouTube videos

Paste the 11-character ID (the part after `v=`) into `youtube: ""` for a day, a country, or an item in `videos`. A full YouTube link also works. Empty = hidden (days/countries) or "Coming soon" (videos).

## Download counter (Firebase, optional)

Without Firebase the counter starts at 378 and adds only clicks made in the *current browser*. For a shared counter:

1. Go to https://console.firebase.google.com and create a project.
2. Build → **Realtime Database** → Create database → start in **test mode**.
3. Open the **Rules** tab and use:
   ```json
   {
     "rules": {
       ".read": false,
       "brochureDownloads": { ".read": true, ".write": true }
     }
   }
   ```
   (everyone can read and write only the `brochureDownloads` node.) Publish the rules.
4. Copy the database URL (e.g. `https://your-project-default-rtdb.europe-west1.firebasedatabase.app`) into `downloads.firebaseUrl` in `js/content.js` (no trailing slash).
5. In the Firebase console Data tab, set `brochureDownloads` = `378`.

One browser is counted at most once per 24 hours; the brochure link always opens.

## Publish on GitHub Pages

1. Create a repository and upload all files (including the empty `.nojekyll`).
2. Settings → Pages → Branch: `main`, folder `/ (root)` → Save.
3. The site appears at `https://<user>.github.io/<repo>/`.

`.nojekyll` stops GitHub from running Jekyll, which would ignore folders and files starting with an underscore.

For social-media previews, change `og:image` in `index.html` to the full `https://...` URL of `hero.jpg`.

## Contacts, partners, network text

Edit `contacts`, `partners`, `network` (the "AI & Youth Ambassadors Network" block) and `about` in `js/content.js`. All texts are written in the past tense because the site is a report; things still to come are phrased as "we will continue…".
