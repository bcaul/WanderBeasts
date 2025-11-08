# Quick Start: Merging with GitHub Fork

## Immediate Steps

### 1. Commit Your Current Changes

You have uncommitted changes (deleted files, code modifications). Commit them first:

```bash
# Stage all changes (including deletions)
git add -A

# Commit with a descriptive message
git commit -m "Clean up codebase: remove temporary files and debug logs

- Remove 64+ temporary/obsolete files
- Clean up excessive debug console.log statements  
- Update completion count to /50
- Fix image blurriness with pixel-perfect rendering
- Remove failing sprite creatures (27 working creatures remain)"
```

### 2. Push to Your Repository

```bash
git push origin main
```

### 3. Set Up Upstream Remote (If Forking)

If this repository is a fork of another repository:

```bash
# Add upstream remote (replace with actual upstream URL)
git remote add upstream https://github.com/ORIGINAL_OWNER/Pokemon_Gone.git

# Verify remotes
git remote -v
```

### 4. Sync with Upstream

**Windows (PowerShell):**
```powershell
.\sync-upstream.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x sync-upstream.sh
./sync-upstream.sh
```

**Manual sync:**
```bash
git fetch upstream
git merge upstream/main
git push origin main
```

## Common Scenarios

### Scenario A: Your repo IS a fork
1. Add upstream remote (Step 3 above)
2. Sync regularly with `sync-upstream.ps1` or manual commands
3. Create feature branches for changes
4. Submit PRs to upstream

### Scenario B: Your repo is the MAIN repo
1. Others will fork your repo
2. They'll add YOUR repo as upstream
3. They'll submit PRs to you
4. You merge their PRs on GitHub

### Scenario C: Merging changes from a contributor's fork
1. Add their fork as a remote: `git remote add contributor https://github.com/username/Pokemon_Gone.git`
2. Fetch: `git fetch contributor`
3. Review: `git checkout -b review-contributor contributor/main`
4. Merge: `git checkout main && git merge contributor/main`
5. Or use GitHub PRs (recommended)

## Handling Merge Conflicts

If you get conflicts:

```bash
# See conflicted files
git status

# Resolve conflicts in your editor
# Look for: <<<<<<< HEAD ... ======= ... >>>>>>> upstream/main

# After resolving:
git add .
git commit -m "Resolve merge conflicts"
git push origin main
```

## Best Practices

1. ✅ Always commit before merging
2. ✅ Use feature branches for major changes
3. ✅ Sync with upstream regularly (weekly)
4. ✅ Use meaningful commit messages
5. ✅ Test before merging
6. ✅ Use GitHub PRs for code review

## Need Help?

- See `MERGE_WITH_FORK.md` for detailed instructions
- Check GitHub documentation: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks
- Git merge help: `git help merge`

