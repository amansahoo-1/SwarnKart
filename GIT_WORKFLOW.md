## 🚀 SwarnKart Git Workflow

---

"The Complete Checklist for Error-Free Collaboration"

------🌟 Core Branches----------

| Branch | Purpose            | Protection Level        |
| ------ | ------------------ | ----------------------- |
| `main` | Production (Live)  | High (Admin merge only) |
| `dev`  | Staging (Pre-Prod) | Medium (Team review)    |

## 📜 Golden Commandments

1. you shall never push directly\*\* to `main` or `dev`
2. you shall always branch\*\* from `dev` (except hotfixes)
3. you shall test before PR\*\* (No broken `dev`!)
4. you shall delete branches\*\* post-merge

------------🛠️ Complete Step-by-Step----------------

1. 🏁 Starting Work

---

Sync dev (ALWAYS do this first!)
.................................

git checkout dev
git pull origin dev

Create branch (pick one):
.........................

git checkout -b feature/auth-flow # New feature
git checkout -b fix/button-alignment # Bug fix
git checkout -b chore/ci-update # Maintenance

2. 💻 Making Changes
   .....................

After editing files:
git add . # Stage all changes
----OR-----
git add path/to/specific/files

Commit with semantic message:
..............................

git commit -m "feat(auth): add Google login"

## Message Formats:

- `feat`: New feature (`feat(scope): description`)
- `fix`: Bug fix (`fix(button): correct alignment`)
- `chore`: Maintenance (`chore(deps): update packages`)

3. 📤 First Push
   .................

git push -u origin your-branch-name # -u = Set upstream for future pushes

    later pushes can be done with:
    ..............................

    git push

4. 🧪 Pre-PR Checklist

---

1. Run tests:

   ```bash
   npm test
   ```

2. Check for conflicts:

---

git fetch origin
git diff --name-only dev..your-branch-name

3. Update your branch (if needed):

---

git pull --rebase origin dev

4. Lint your code:

---

npm run lint

5. 📝 Creating the PR

---

1. Go to GitHub/GitLab → Pull Requests → New
2. Set:

   - Base -> `dev`
   - Compare -> Your branch

3. PR Template:

---

What's changed

- [x] Added Google Auth
- [x] Updated login page

## Testing Steps

1. Click Google login button
2. Verify redirect works

## Screenshots

| Before | After  |
| ------ | ------ |
| ![old] | ![new] |

6.  🔎 Review Process

---

Reviewers should:

1. Test locally:

   git checkout pr-branch
   npm run dev

2. Verify no console errors
3. Check for linting issues

4. ✅ Post-Merge

---

Cleanup ritual
git checkout dev
git pull origin dev

Delete your branch locally
git branch -d your-branch-name

> ✅ Remote branch auto-deletes if GitHub setting is enabled

## 🚨 Emergency Hotfix Protocol

ONLY for production-critical bugs:
git checkout main
git pull origin main
git checkout -b hotfix/payment-failure

After fixing:
git push -u origin hotfix/payment-failure

Must create 2 PRs:

1. `hotfix/*` → `main` (merge immediately)
2. `main` → `dev` (sync the fix)

## 🧼 Hygiene Maintenance

Weekly Cleanup

Clean up stale local branches (safe):
git fetch -p && git branch --merged dev | grep -v 'main\|dev' | xargs git branch -d

## Forgotten Branch Recovery

Find "lost" or orphaned branches:
git fsck --lost-found

## ⚡ Pro Power-Ups

Magic Rebase (Interactive)

git checkout your-branch
git fetch origin
git rebase -i origin/dev

## PR from CLI (GitHub CLI)

gh pr create --base dev --head your-branch --title "Your PR Title" --body "Description"

## 📜 Appendix: Branch Protection Rules

| Branch | Rules Enforced                                                                |
| ------ | ----------------------------------------------------------------------------- |
| `main` | - Require 2 approvals <br> - Require CI to pass <br> - Require linear history |
| `dev`  | - Require 1 approval <br> - Block force pushes                                |

## 🛡️ Pre-Commit Branch Name Guard

Add this to `.git/hooks/pre-commit` to enforce naming conventions:

#!/bin/sh
branch=$(git rev-parse --abbrev-ref HEAD)
if ! [[$branch =~ ^(feature|fix|hotfix|chore)/.+]]; then
echo "❌ ERROR: Branch must start with feature|fix|hotfix|chore/"
exit 1
fi

-----Let your Git workflow be as flawless as your code! 🚀-----
