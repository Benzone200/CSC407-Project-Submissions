# Course-Desk: Online Course Registration System

Course-Desk is a web app where university students create an account, register the courses they want for the semester, and see whether the admin has approved them. An admin dashboard lets staff set the registration deadline, upload courses, and approve or reject registrations.

FULL NAME  - Abdulyekeen Habeebullah
Matric number -  23/SCI01/003

## Features

Students
- Sign up (email, password, then student ID, department and level) and log in with student ID
- Dashboard with registered courses, available courses, units used and recent registrations
- Register Courses: add or remove courses for their own level and department, with a unit limit
- See each course as Pending, Approved or Rejected (with the admin's reason if rejected)
- Course History of approved courses, grouped by session and semester
- Settings: edit profile and change password

Admin
- Registrations: approve or reject selected registrations, filter and search
- Courses: add a course, or upload many with a CSV file; courses can be limited to chosen departments and levels
- Settings: session, semester, registration deadline, open/closed switch, maximum units

Technology

- Front end: HTML, CSS, JavaScript (no framework)
- Back end: Node.js, Express
- Database: SQLite (built into Node, no separate install)
- Passwords hashed with bcrypt; logins use JSON Web Tokens

How to run

1. Install **Node.js 22.13 or newer** from https://nodejs.org
2. Open a terminal in the `server` folder:

       cd server
       npm install
       npm start

   On Windows PowerShell, if `npm` is blocked, use `npm.cmd install` and `npm.cmd start` instead.
3. Open http://localhost:3000/login.html (students) or http://localhost:3000/admin-login.html (admin).

The database file `server/coursedesk.db` is created automatically on first run, with 8 sample 300-level courses.

Default admin login (for testing only):** username `admin`, password `admin12345`.
To use your own, set `ADMIN_USER` and `ADMIN_PASSWORD` before the first start.

Try it

1. Log in as admin, open **Settings**, set a future deadline and tick "Registration is open".
2. Create a student account (use level 300 to see the sample courses) and register some courses. They show as Pending.
3. Back in the admin **Registrations** tab, tick them and click Approve selected.
4. The student now sees them as Approved, and they appear in Course History.

Folder structure

    public/   front end pages, CSS and JavaScript (served by the server)
    server/   Express API and database (server.js, package.json)

Known limitations

- "Change photo" in Settings only previews the image; it is not saved
- Changing a password does not ask for the current password
- One admin account is created automatically; there is no screen for adding more admins
- The registration deadline uses the clock of the computer running the server
