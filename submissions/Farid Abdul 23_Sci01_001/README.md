# MediTrack: hospital patient management system

Flask + SQLite web app with registration/login, role-based access (admin/user), patient records with search and filters, a profile page, and a public Security page.

## Run locally
```
pip install -r requirements.txt
flask --app app create-admin yourname      # first admin account
flask --app app run --debug
```
Open http://127.0.0.1:5000. Staff who register get the `user` role; admins promote others from the Users page.

## Run the automated tests
```
python -m pytest -v
```

## Test plan
| Area | How it is covered |
|---|---|
| Functional | `test_register_login_logout`, `test_create_and_filter_patients`, `test_edit_persists` |
| Login/registration | duplicate user, wrong password, lockout after 5 failures, redirect when signed out |
| Form validation | parametrised tests for bad passwords, emails, dates, phones, departments, long text |
| Security | SQL injection (login and search), XSS escaping, CSRF, headers, cookie flags, hashed passwords, role and ownership checks |
| Error handling | friendly 400/403/404/500 pages, server errors logged |
| Database | rows persist, edits save, filters query correctly, constraints block duplicates |
| Usability (manual) | a classmate registers, adds a patient and finds them by search without help; note confusion points |
| Responsive (manual) | Chrome DevTools device mode at 375px, 768px, 1280px: menu collapses, tables stack, forms stay usable |

## Files
`app.py` (all routes, security, CLI) · `templates/` · `static/style.css` · `tests/test_app.py` · `DEPLOY.md`
