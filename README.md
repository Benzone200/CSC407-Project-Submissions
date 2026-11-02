# CSC PROJECT SUBMISSION GUIDE

How to submit your individual project to the class GitHub repository

This guide explains how every student should submit their project code. Follow the folder naming and Pull Request instructions so the lecturer can identify and review your work.

## Important submission rules

- Submit only your own project code in your own folder.
- Use your full name and matric number in your folder name and submission details.
- Do not edit, delete, or move another student’s folder.
- Do not upload passwords, API keys, .env files, private credentials, or unnecessary node_modules/vendor folders.
- Submit a Pull Request (PR) to the main class repository. Do not submit only a link to your fork.
- Check that your project files are uploaded and readable before submitting.

## Part A — Create your own copy (Fork)

1. Sign in to your GitHub account. If you do not have one, create an account first.
2. Open the class repository link provided by the class representative.
3. Click the Fork button near the top-right of the repository page.
4. Choose your own GitHub account as the owner and click Create fork.
5. You now have your own copy of the class repository. Make changes only in your fork.

## Part B — Create your project folder

Inside your fork, open the submissions folder. Create a new folder using this format:

```
FULLNAME_MATRICNUMBER
```

Example: `BENJAMIN_DUNU_23SCXXXX`

Inside your folder, add your project folder and all required project files. Example:

```
submissions/
└── FULLNAME_MATRICNUMBER/
    └── Project-Name/
        ├── README.md
        ├── source code files
        └── other required project files
```

If your lecturer has specified a different folder structure or required files, follow the lecturer’s instructions.

## Part C — Upload your project

### Method 1: Upload through GitHub website (simpler)

1. Open your forked repository on GitHub.
2. Navigate to submissions and then to your own FULLNAME_MATRICNUMBER folder.
3. Use Add file → Upload files. If your folder does not exist yet, create it by adding a file (such as README.md) inside it.
4. Drag and drop your project files into the upload area. GitHub’s web upload may not upload folders exactly as expected; upload the files and folder structure carefully, or use GitHub Desktop for larger projects.
5. Enter a commit message such as “Add [Your Name] project submission”.
6. Commit the changes to your fork’s main branch (or the branch you are using).

### Method 2: GitHub Desktop or Git command line

For larger projects, GitHub Desktop or Git is usually more reliable.

Clone your fork (first time only):

```bash
git clone https://github.com/YOUR-USERNAME/CLASS-REPO.git
```

Enter the repository folder:

```bash
cd CLASS-REPO
```

Create a branch:

```bash
git checkout -b submit-yourname-matricnumber
```

Add your project files, then stage them:

```bash
git add submissions/YOURNAME_MATRICNUMBER
```

Commit:

```bash
git commit -m "Submit YOURNAME project"
```

Push your branch:

```bash
git push -u origin submit-yourname-matricnumber
```

Replace YOUR-USERNAME, CLASS-REPO, YOURNAME, and MATRICNUMBER with your actual details.

## Part D — Create your Pull Request (PR)

1. Open your fork on GitHub after your files have been pushed.
2. Click Contribute or Pull requests, then choose Open pull request / New pull request. GitHub may show a Compare & pull request button.
3. Confirm the base repository is the original class repository (not your fork). The base branch should normally be main.
4. Confirm the compare/head repository is your fork and select the branch containing your submission.
5. Use the PR title format below and complete the description.
6. Click Create pull request. Copy the PR link and keep it as proof of submission.

### Required Pull Request title and description

PR title format:

```
[SUBMISSION] Full Name — Matric Number — Project Name
```

Example:

```
[SUBMISSION] Benjamin Dunu — 23SCXXXX — School Fees Management System
```

Include the following in your PR description:

- Full name:
- Matric number:
- GitHub username:
- Project title:
- Brief description of what the system does:
- How to run the project (including any dependencies/setup steps):
- Any known limitations or incomplete features:

## Final checklist before submitting

- [ ] My folder name includes my full name and matric number.
- [ ] My project is inside my own folder under submissions/.
- [ ] My README explains the project and how to run it.
- [ ] I have not included passwords, API keys, or private credentials.
- [ ] The PR targets the original class repository and the correct base branch.
- [ ] My PR title and description contain my identifying details.
- [ ] I have copied my Pull Request link for submission.

## Troubleshooting

If GitHub says there are no changes to compare, confirm that your project was committed and pushed to your fork, and that you selected the correct branch.

If you cannot open a PR, check that you are comparing your fork against the original class repository and that your fork is public or otherwise accessible to the lecturer.

If you accidentally edit another student’s files, do not submit the PR until you remove those unrelated changes.

## Official GitHub help

- Fork a repository: https://docs.github.com/en/pull-requests/how-tos/work-with-forks/fork-a-repo
- Create a Pull Request: https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/creating-a-pull-request
- Create a Pull Request from a fork: https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/creating-a-pull-request-from-a-fork
