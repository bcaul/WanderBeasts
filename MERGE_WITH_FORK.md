# Merging with GitHub Fork - Step-by-Step Guide

This guide will help you merge your Pokemon_Gone codebase smoothly with a GitHub fork.

## Scenario 1: Your repo is a fork of another repository

If you forked this repository from an upstream source and want to sync changes:

### Step 1: Add the upstream remote

```bash
# Add the upstream repository as a remote
git remote add upstream <UPSTREAM_REPO_URL>

# Verify remotes
git remote -v
# You should see:
# origin    https://github.com/bcaul/Pokemon_Gone.git (your fork)
# upstream  https://github.com/ORIGINAL_OWNER/Pokemon_Gone.git (upstream)
```

### Step 2: Commit your current changes

```bash
# Stage all your changes (including deletions)
git add -A

# Commit with a descriptive message
git commit -m "Clean up codebase: remove temporary files and debug logs

- Remove 64+ temporary/obsolete files (extraction scripts, fix docs, duplicate SQL)
- Clean up excessive debug console.log statements
- Keep only essential files: source code, migrations, final SQL script
- Update completion count to /50
- Fix image blurriness with pixel-perfect rendering CSS
- Remove failing sprite creatures (Hogriks, Cryscross, etc.)
- Final working set: 27 creatures with valid sprites"
```

### Step 3: Fetch upstream changes

```bash
# Fetch the latest changes from upstream
git fetch upstream

# Check what branch you're on
git branch
```

### Step 4: Merge upstream changes

**Option A: Merge (Creates a merge commit)**
```bash
# Merge upstream/main into your main branch
git merge upstream/main

# If there are conflicts, resolve them, then:
git add .
git commit -m "Merge upstream/main into main"
```

**Option B: Rebase (Cleaner history, but rewrites history)**
```bash
# Rebase your changes on top of upstream
git rebase upstream/main

# If there are conflicts, resolve them, then:
git add .
git rebase --continue

# If you want to abort:
git rebase --abort
```

### Step 5: Push to your fork

```bash
# Push to your fork
git push origin main

# If you rebased and need to force push (be careful!):
# git push origin main --force-with-lease
```

## Scenario 2: You want to fork this repo and keep it synced

If you want someone else to fork YOUR repository:

### Step 1: Ensure your repo is clean and up-to-date

```bash
# Commit all current changes
git add -A
git commit -m "Clean up codebase and finalize working sprite set"

# Push to your repository
git push origin main
```

### Step 2: Create a comprehensive README

Make sure your `README.md` includes:
- Setup instructions
- Environment variables
- Database migration steps
- Known issues/troubleshooting

### Step 3: Document the fork relationship

Create a `.github/FORK_SYNC.md` file with instructions for contributors.

## Scenario 3: Merging changes from a fork into your main repo

If you have multiple forks/contributors:

### Step 1: Add fork as a remote

```bash
# Add the fork as a remote
git remote add fork-username https://github.com/username/Pokemon_Gone.git

# Fetch their changes
git fetch fork-username

# Create a branch to review their changes
git checkout -b review-fork-username fork-username/main
```

### Step 2: Review and test changes

```bash
# Review the changes
git log --oneline --graph

# Test the changes locally
npm install
npm run dev
```

### Step 3: Merge into main

```bash
# Switch back to main
git checkout main

# Merge the fork branch
git merge fork-username/main

# Or use a pull request (recommended)
# Create a PR on GitHub instead
```

## Handling Merge Conflicts

If you encounter conflicts during merge:

### Step 1: Identify conflicted files

```bash
# See which files have conflicts
git status
```

### Step 2: Resolve conflicts

Open conflicted files and look for conflict markers:
```
<<<<<<< HEAD
Your changes
=======
Upstream changes
>>>>>>> upstream/main
```

### Step 3: Resolve and commit

```bash
# After resolving conflicts in your editor
git add <resolved-file>

# Continue the merge
git commit -m "Resolve merge conflicts with upstream"
```

## Best Practices

1. **Always commit your changes before merging**
   - Don't merge with uncommitted changes
   - Use `git stash` if needed: `git stash` then `git stash pop` after merge

2. **Use feature branches for major changes**
   ```bash
   git checkout -b feature/my-feature
   # Make changes
   git commit -m "Add feature"
   git push origin feature/my-feature
   # Create PR on GitHub
   ```

3. **Keep your fork synced regularly**
   ```bash
   # Weekly sync script
   git fetch upstream
   git merge upstream/main
   git push origin main
   ```

4. **Use meaningful commit messages**
   - Clear, descriptive messages
   - Reference issues/PRs when applicable

5. **Test before merging**
   - Run tests: `npm test` (if you have tests)
   - Test locally: `npm run dev`
   - Check for linting errors: `npm run lint`

## Automated Sync Script

Create a `sync-upstream.sh` script:

```bash
#!/bin/bash
# sync-upstream.sh

echo "Fetching upstream changes..."
git fetch upstream

echo "Merging upstream/main into main..."
git checkout main
git merge upstream/main

echo "Pushing to origin..."
git push origin main

echo "Sync complete!"
```

Make it executable:
```bash
chmod +x sync-upstream.sh
./sync-upstream.sh
```

## Troubleshooting

### "Your branch is ahead of 'origin/main'"

This is normal after merging. Just push:
```bash
git push origin main
```

### "Updates were rejected because the tip of your current branch is behind"

Someone else pushed changes. Pull first:
```bash
git pull origin main
# Resolve conflicts if any
git push origin main
```

### "Merge conflict in package-lock.json"

This is common. Regenerate it:
```bash
# Accept one version
git checkout --theirs package-lock.json
# Or regenerate
rm package-lock.json
npm install
git add package-lock.json
git commit -m "Resolve package-lock.json conflict"
```

## Next Steps

1. **Commit your current changes** (deleted files, code cleanup)
2. **Push to your repository**
3. **Set up upstream remote** (if applicable)
4. **Sync regularly** with upstream
5. **Create PRs** for major changes

## Quick Reference

```bash
# See current status
git status

# See remotes
git remote -v

# Fetch from upstream
git fetch upstream

# Merge upstream
git merge upstream/main

# Push to your fork
git push origin main

# Create a new branch
git checkout -b feature-name

# See commit history
git log --oneline --graph --all
```

