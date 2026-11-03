# CSC 407 Project Submission Guide

Submit your project as a **zip file** through the GitHub website. No git, no command line, no tokens needed.

Repository: https://github.com/CSC-407/class-project

> **Do NOT clone this repo or try to push to it directly. You do not have permission. Always fork first.**

---

## Before you start

1. Have a GitHub account and be logged in at github.com (use a browser, not the mobile app. On a phone, switch to "Desktop site").
2. Zip your project:
   - **Delete `node_modules`, `vendor`, `venv`, `.env`, and any passwords or API keys** from the project folder first.
   - Right-click the project folder and choose **Compress / Send to > Compressed (zipped) folder**.
   - Name it `ProjectName.zip`.
   - The zip must be **under 25 MB**. If it is bigger, you removed too little (usually `node_modules`).
3. Include a `README.md` inside your project that explains what it does and how to run it.

---

## Step 1: Fork the repository

1. Open https://github.com/CSC-407/class-project
2. Click **Fork** (top right).
3. Owner: your own account. Click **Create fork**.
4. You are now on *your* copy: the URL should contain **your username**.

## Step 2: Create your folder

1. In your fork, open the `submissions` folder.
2. Click **Add file > Create new file**.
3. In the file name box, type exactly:

   ```
   FULLNAME_MATRICNUMBER/README.md
   ```

   Example: `BENJAMIN_DUNU_23SCXXXX/README.md`

   Typing the `/` is what creates the folder.
4. In the content area, write your name, matric number, and project title.
5. Click **Commit changes**, then **Commit changes** again.

## Step 3: Upload your zip

1. Open your new `FULLNAME_MATRICNUMBER` folder in your fork.
2. Click **Add file > Upload files**.
3. Drag in your `.zip` file and wait for it to finish uploading.
4. Commit message: `Add [Your Name] project submission`.
5. Click **Commit changes**.

Check that the zip now appears inside your folder.

## Step 4: Open the Pull Request

1. Go back to the main page of your fork.
2. Click **Contribute > Open pull request** (or the yellow **Compare & pull request** button).
3. Confirm at the top:
   - **base repository:** `CSC-407/class-project`, branch `main`
   - **head repository:** your fork
4. **Title** (use this format):

   ```
   [SUBMISSION] Full Name - Matric Number - Project Name
   ```

   Example: `[SUBMISSION] Benjamin Dunu - 23SCXXXX - School Fees Management System`
5. **Description**, copy and fill in:

   ```
   Full name:
   Matric number:
   GitHub username:
   Project title:
   Brief description of what the system does:
   How to run the project (dependencies/setup):
   Known limitations or incomplete features:
   ```
6. Click **Create pull request**.
7. Copy the link of your PR. This is your proof of submission.

---

## Checklist

- [ ] I forked the repo (I did not clone or push to the original)
- [ ] My folder is `submissions/FULLNAME_MATRICNUMBER/`
- [ ] My zip is inside my folder and under 25 MB
- [ ] No `node_modules`, `.env`, passwords or API keys in the zip
- [ ] My project has a README explaining how to run it
- [ ] The PR base is `CSC-407/class-project`, not my fork
- [ ] My PR title and description are complete
- [ ] I copied my PR link

## Common problems

| Problem | Fix |
|---|---|
| I can't find a "New folder" button | There isn't one. Create a file named `FOLDER/README.md` (Step 2). |
| I can't see the `submissions` folder in my fork | On your fork's page click **Sync fork > Update branch**. |
| Upload fails or hangs | Zip is too big. Remove `node_modules` and re-zip (limit 25 MB). |
| I can't find where to open the PR | Go to your fork's main page and click **Contribute > Open pull request**. |
| "No changes to compare" | Your upload was not committed. Redo Step 3 and click Commit. |
| The PR shows my own fork as base | Change base repository to `CSC-407/class-project`. |
| I accidentally changed someone else's files | Do not submit. Delete your fork and start again. |

Rules: submit only your own work, do not edit or delete anyone else's folder.
