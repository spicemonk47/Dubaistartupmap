# Connecting form submissions to the map

Every submission lands in a Google Sheet and is emailed to you. Set **Status → Approved** and the company shows up on the live map automatically. No server, free.

## One-time setup (≈5 min)

1. **Create a sheet:** go to sheets.new and name it "DXB Startup Map".
2. **Add the script:** Extensions → Apps Script, delete the sample code, paste in all of `apps-script.gs`, and save.
3. **Deploy:** Deploy → New deployment → ⚙ → **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click Deploy, approve the permissions (Google warns "unverified app": Advanced → Go to project), then copy the **Web app URL** (ends in `/exec`).
4. **Connect the site:** in `data.js`, set
   ```js
   window.SHEET_ENDPOINT = "https://script.google.com/macros/s/XXXX/exec";
   ```
5. Push to GitHub.

The `Submissions` and `Newsletter` tabs are created automatically on the first submission.

## Importing submissions you've already received

Anything submitted before the sheet was connected went to your inbox (subject "… Startup Map — new submission"). To pull it all into the sheet:

1. In the Apps Script editor, choose **importFromGmail** in the function dropdown and click **Run**.
2. Allow Gmail access when asked.
3. Every past submission becomes a **Pending** row, and past newsletter signups go into the Newsletter tab. Approve the ones you want on the map.

Imported emails get the Gmail label `DXB-imported`, so running it again won't create duplicates.

## Daily workflow

- You get an email for every submission.
- Open the sheet and change **Status** to `Approved` (it's a dropdown).
- Reload the site and the company is on the map, with its logo pulled from its website domain.
- To fix a typo, edit the cell directly.

## Notes

- Submitters' emails stay private; the site only reads Company, Website, Type, District, Sector, Stage and Description.
- A submission with District = "Other" stays in the sheet but isn't plotted. Change it to a known district, or add the new district to `DISTRICTS` in `data.js`.
- Duplicates (same name as an existing entry) are ignored.
- If you edit the script later: Deploy → Manage deployments → ✎ → Version: **New version**. The URL stays the same.
- Leave `SHEET_ENDPOINT` empty to fall back to plain email via FormSubmit.
