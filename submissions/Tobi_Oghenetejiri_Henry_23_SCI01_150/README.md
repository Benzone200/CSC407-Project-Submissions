Customer Feedback Management System

A web-based Customer Feedback Management System built with Python and Flask. The application allows customers to register, log in, submit feedback, and track their previous submissions. Administrators can view all customer feedback and access basic statistics.

Features

User Features

- User registration and login.
- Secure password hashing.
- Submit feedback with ratings from 1 to 5.
- Categorize feedback into Product, Service, Delivery, Pricing, Website, and Other.
- View previously submitted feedback.
- Secure logout.

Administrator Features

- View feedback submitted by all users.
- View total feedback submissions.
- Calculate average customer ratings.
- View feedback statistics by category.

Security Features

- CSRF protection.
- SQL injection prevention using parameterized queries.
- Password hashing.
- Account lockout after repeated failed login attempts.
- Session management and cookie protection.
- Security response headers.
- Input validation and sanitization.
- Request size restrictions.

Technologies Used

- Python – Main programming language.
- Flask – Web application framework.
- SQLite – Database management.
- HTML/CSS – User interface.
- Jinja2 – Template rendering.

Project Structure

Customer-Feedback-System/
│
├── app.py
├── security.py
├── feedback.db
├── .secret_key
│
├── templates/
│   ├── index.html
│   ├── register.html
│   ├── login.html
│   ├── dashboard.html
│   ├── admin.html
│   └── error.html
│
├── static/
│   └── style.css
│
├── requirements.txt
└── README.md

Note: Some files, such as templates and static assets, are required by the application but are not shown in the supplied Python code.

Installation and Setup

1. Clone the repository:

git clone YOUR_REPOSITORY_URL

2. Navigate into the project directory:

cd Customer-Feedback-System

3. Create a virtual environment:

python -m venv venv

4. Activate the virtual environment:

Linux/macOS:

source venv/bin/activate

Windows:

venv\Scripts\activate

5. Install dependencies:

pip install -r requirements.txt

6. Run the application:

python app.py

7. Open your browser and visit:

http://127.0.0.1:5000

Environment Variables

The application supports the following environment variables:

Variable| Purpose
SECRET_KEY| Sets the Flask session secret key.
ADMIN_PASSWORD| Sets the initial administrator password.
DB_PATH| Specifies the SQLite database location.
PRODUCTION| Enables secure session cookies when set to "1".

If no administrator password is supplied, the application generates a random one and prints it to the console during initial setup.

Database

The application uses SQLite with two main tables:

- Users: Stores user accounts, password hashes, roles and login attempt information.
- Feedback: Stores feedback categories, ratings, messages and submission dates.

Purpose

The project demonstrates the development of a basic feedback management platform while implementing important web application security practices.

It provides a practical example of user authentication, database management, role-based access, input validation and secure web development.
