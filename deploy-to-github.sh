#!/bin/bash

# Mini ERP - Deploy to GitHub Script
# Author: Vinh Hoang
# Date: 2026-01-22

echo "🚀 Mini ERP - Deploy to GitHub"
echo "================================"
echo ""

# Step 1: Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    echo "Download from: https://git-scm.com/downloads"
    exit 1
fi

echo "✅ Git is installed: $(git --version)"
echo ""

# Step 2: Initialize Git repository
if [ ! -d .git ]; then
    echo "📦 Initializing Git repository..."
    git init
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository already exists"
fi
echo ""

# Step 3: Add all files
echo "📝 Adding files to Git..."
git add .
echo ""

# Step 4: Check if .env is excluded
echo "🔍 Checking if .env is properly excluded..."
if git status | grep -q ".env"; then
    echo "⚠️  WARNING: .env file is being tracked!"
    echo "This file contains sensitive Firebase credentials and should NOT be committed."
    echo "Please check .gitignore file."
    exit 1
else
    echo "✅ .env is properly excluded from Git"
fi
echo ""

# Step 5: Show status
echo "📋 Files to be committed:"
git status --short
echo ""

# Step 6: Commit
read -p "Enter commit message (press Enter for default): " commit_msg
if [ -z "$commit_msg" ]; then
    commit_msg="Initial commit - Mini ERP v2.0 with Firebase integration"
fi

echo "💾 Committing with message: $commit_msg"
git commit -m "$commit_msg"
echo ""

# Step 7: Add remote
echo "🔗 Adding GitHub remote..."
git remote remove origin 2>/dev/null # Remove if exists
git remote add origin https://github.com/markxipro12-netizen/vinhhoang.git
echo "✅ Remote added: https://github.com/markxipro12-netizen/vinhhoang.git"
echo ""

# Step 8: Set branch to main
echo "🌿 Setting branch to main..."
git branch -M main
echo ""

# Step 9: Push to GitHub
echo "🚀 Pushing to GitHub..."
echo ""
echo "⚠️  IMPORTANT: GitHub Authentication Required"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "When prompted:"
echo "  Username: markxipro12-netizen"
echo "  Password: [Your Personal Access Token]"
echo ""
echo "Don't have a token? Create one at:"
echo "https://github.com/settings/tokens"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ SUCCESS! Code pushed to GitHub!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📦 Repository: https://github.com/markxipro12-netizen/vinhhoang"
    echo ""
    echo "🎯 Next Steps:"
    echo "1. Go to: https://vercel.com/new"
    echo "2. Import repository: markxipro12-netizen/vinhhoang"
    echo "3. Add environment variables (see GITHUB_DEPLOY_GUIDE.md)"
    echo "4. Deploy!"
    echo ""
    echo "📚 Full guide: GITHUB_DEPLOY_GUIDE.md"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo ""
    echo "❌ Push failed. Please check your credentials and try again."
    echo ""
    echo "Troubleshooting:"
    echo "1. Make sure you're using Personal Access Token as password"
    echo "2. Token must have 'repo' scope"
    echo "3. Username must be: markxipro12-netizen"
    echo ""
    echo "Create token at: https://github.com/settings/tokens"
fi
