#!/bin/bash
# sync-upstream.sh - Sync your fork with upstream repository

set -e  # Exit on error

echo "🔍 Checking git status..."
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  You have uncommitted changes. Please commit or stash them first."
    echo "   Run: git stash  (to save changes)"
    echo "   Or:  git commit -am 'Your commit message'  (to commit changes)"
    exit 1
fi

echo "📥 Fetching upstream changes..."
git fetch upstream

echo "🔀 Merging upstream/main into main..."
git checkout main
git merge upstream/main

if [ $? -eq 0 ]; then
    echo "✅ Merge successful!"
    echo "📤 Pushing to origin..."
    git push origin main
    echo "🎉 Sync complete!"
else
    echo "❌ Merge conflicts detected. Please resolve them manually:"
    echo "   1. Resolve conflicts in the files listed above"
    echo "   2. Run: git add ."
    echo "   3. Run: git commit -m 'Resolve merge conflicts'"
    echo "   4. Run: git push origin main"
    exit 1
fi

