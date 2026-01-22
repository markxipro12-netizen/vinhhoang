# 🔥 Firebase Hosting - Deploy Guide

## 🎯 Tại Sao Chọn Firebase Hosting?

Vì bạn đã dùng Firebase Firestore, deploy lên Firebase Hosting là **lựa chọn tốt nhất**:
- ✅ Tích hợp sẵn với Firebase project
- ✅ FREE tier rộng (10GB/tháng)
- ✅ Google CDN cực nhanh
- ✅ Custom domain miễn phí
- ✅ Auto SSL certificate

---

## 🚀 Deploy trong 5 Phút

### Bước 1: Install Firebase CLI

```bash
# Install globally
npm install -g firebase-tools

# Verify installation
firebase --version
# Output: 13.x.x
```

### Bước 2: Login

```bash
firebase login

# Browser sẽ mở → Chọn Google account
# Select account: (account có quyền truy cập Firebase project)
# Allow Firebase CLI access
# Success! Logged in as your-email@gmail.com
```

### Bước 3: Init Hosting

```bash
cd /Users/jade/Desktop/mini-erp-frontend

firebase init hosting
```

**Trả lời các câu hỏi:**

```
? Select a default Firebase project:
→ Use an existing project
→ mini-erp-warehouse-6528e (Mini ERP Warehouse)

? What do you want to use as your public directory?
→ dist

? Configure as a single-page app (rewrite all urls to /index.html)?
→ Yes

? Set up automatic builds and deploys with GitHub?
→ No (manual deploy first, setup GitHub later nếu cần)

? File dist/index.html already exists. Overwrite?
→ No
```

**Firebase tạo 2 files:**
- `firebase.json` - Config
- `.firebaserc` - Project settings

### Bước 4: Build

```bash
npm run build

# Output:
# ✓ built in 5s
# dist/index.html                  x.xx kB
# dist/assets/index-xxxxx.js      xxx.xx kB
```

### Bước 5: Deploy

```bash
firebase deploy --only hosting

# Output:
# ✔ Deploy complete!
#
# Project Console: https://console.firebase.google.com/project/mini-erp-warehouse-6528e/overview
# Hosting URL: https://mini-erp-warehouse-6528e.web.app
```

### Bước 6: Test

Truy cập: `https://mini-erp-warehouse-6528e.web.app`

---

## 🌐 Custom Domain (Optional)

### Bước 1: Vào Firebase Console

1. Truy cập: https://console.firebase.google.com/
2. Chọn project: **mini-erp-warehouse-6528e**
3. Hosting → **Add custom domain**

### Bước 2: Nhập Domain

```
Example: erp.yourcompany.com
hoặc: yourcompany.com
```

### Bước 3: Verify Ownership

Firebase yêu cầu add TXT record để verify:

```
Type: TXT
Name: @ (or your-domain.com)
Value: firebase=xxxxxxxxxxxxxxxxx
```

Vào DNS provider (Namecheap, Cloudflare, etc.) → Add record → Save

### Bước 4: Add A/AAAA Records

Sau khi verify, add records để point domain đến Firebase:

```
Type: A
Name: @
Value: (IP do Firebase cung cấp)

Type: A
Name: @
Value: (IP thứ 2 do Firebase cung cấp)
```

### Bước 5: Đợi Propagate

- Thời gian: 10 phút - 24 giờ
- Check: https://dnschecker.org/

### Bước 6: SSL Auto Setup

Firebase tự động tạo SSL certificate (Let's Encrypt)
- Thời gian: 5-60 phút
- Status: "Provisioning" → "Connected"

---

## 🔄 Auto Deploy với GitHub Actions

### Setup GitHub Actions

#### 1. Tạo Firebase Token

```bash
firebase login:ci

# Output: Your Firebase token
# Copy token này
```

#### 2. Add GitHub Secret

1. GitHub repo → Settings → Secrets and variables → Actions
2. New repository secret:
   - Name: `FIREBASE_TOKEN`
   - Value: (paste token from step 1)

#### 3. Tạo Workflow File

```yaml
# File: .github/workflows/firebase-deploy.yml
name: Deploy to Firebase Hosting

on:
  push:
    branches:
      - main

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_TOKEN }}'
          channelId: live
          projectId: mini-erp-warehouse-6528e
```

#### 4. Push & Auto Deploy

```bash
git add .
git commit -m "Setup Firebase auto deploy"
git push

# GitHub Actions tự động:
# 1. Build project
# 2. Deploy lên Firebase
# 3. Done!
```

---

## 📊 Firebase Hosting Features

### Preview Channels (Staging Environment)

Deploy preview trước khi deploy production:

```bash
# Deploy to preview channel
firebase hosting:channel:deploy preview

# Output: https://mini-erp-warehouse-6528e--preview-xxxxx.web.app

# Test OK → Deploy to production
firebase deploy --only hosting
```

### Rollback

Quay lại version cũ nếu có lỗi:

```bash
# List deployment history
firebase hosting:clone --only hosting

# Rollback to previous version
firebase hosting:rollback
```

### Custom Headers

```json
// firebase.json
{
  "hosting": {
    "public": "dist",
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|webp)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=7200"
          }
        ]
      }
    ]
  }
}
```

### Redirects

```json
// firebase.json
{
  "hosting": {
    "redirects": [
      {
        "source": "/old-path",
        "destination": "/new-path",
        "type": 301
      }
    ]
  }
}
```

---

## 💰 Chi Phí & Limits

### Spark Plan (FREE)

```
Storage: 10 GB
Bandwidth: 360 MB/day (~10 GB/month)
Custom domain: ✅ Unlimited
SSL: ✅ Auto
```

**Đủ cho:**
- 5,000-10,000 page views/tháng
- Small team (5-20 users)
- Internal tools

### Blaze Plan (Pay as you go)

```
Storage: $0.026/GB/month
Bandwidth: $0.15/GB
```

**Ước tính:**
- 100,000 page views/tháng
- ~30GB bandwidth
- Cost: ~$5/tháng

---

## 🔒 Security

### Firebase Security Rules (Already setup)

```javascript
// Firestore rules đã có
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### Hosting Security Headers

```json
// firebase.json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "SAMEORIGIN"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          }
        ]
      }
    ]
  }
}
```

---

## 📈 Monitoring

### Firebase Console

1. Hosting → Usage
   - Bandwidth usage
   - Storage used
   - Request count

2. Performance Monitoring
   ```bash
   npm install firebase

   // Add to src/firebase.js
   import { getPerformance } from 'firebase/performance';
   const perf = getPerformance(app);
   ```

### Google Analytics

Already integrated with Firebase:
- Hosting → Integrations → Google Analytics
- Auto track: Page views, User engagement

---

## 🐛 Troubleshooting

### Error: "Firebase project not found"

```bash
# Re-login
firebase logout
firebase login

# Re-init
firebase use mini-erp-warehouse-6528e
```

### Error: "Build failed"

```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Error: "Permission denied"

```bash
# Check authentication
firebase login --reauth

# Verify project access
firebase projects:list
```

### 404 on Page Refresh

**Cause:** React Router không được config đúng

**Fix:** Already setup trong `firebase.json`:
```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

---

## 🎯 Complete firebase.json

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|woff|woff2)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=604800"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=86400"
          }
        ]
      }
    ]
  }
}
```

---

## 📝 Checklist

### Before First Deploy
- [ ] `npm run build` thành công
- [ ] Test local: `npm run dev`
- [ ] Firebase CLI installed
- [ ] Logged in: `firebase login`
- [ ] Project initialized: `firebase init hosting`

### Deploy
- [ ] Build: `npm run build`
- [ ] Deploy: `firebase deploy --only hosting`
- [ ] Test site: Visit hosting URL
- [ ] Check all features work
- [ ] Test authentication
- [ ] Test Firestore connection

### After Deploy
- [ ] (Optional) Setup custom domain
- [ ] (Optional) Setup GitHub Actions
- [ ] Share URL with team
- [ ] Update documentation

---

## 🚀 Quick Commands

```bash
# Deploy
npm run build && firebase deploy --only hosting

# Preview before deploy
firebase hosting:channel:deploy preview

# View deployment history
firebase hosting:list

# Rollback to previous version
firebase hosting:rollback

# View logs
firebase hosting:logs

# Delete old deployments
firebase hosting:clone --except DEPLOYMENT_ID
```

---

## 📞 Support

### Documentation
- Firebase Hosting: https://firebase.google.com/docs/hosting
- Firebase CLI: https://firebase.google.com/docs/cli

### Community
- Firebase Discord: https://discord.gg/firebase
- Stack Overflow: Tag với `firebase-hosting`

---

## 🎉 Summary

**Firebase Hosting là lựa chọn hoàn hảo nếu:**
- ✅ Đã dùng Firebase Firestore (như project này)
- ✅ Muốn FREE tier rộng
- ✅ Cần performance cao (Google CDN)
- ✅ Muốn tích hợp chặt chẽ với Firebase ecosystem

**Deploy time:**
- First deploy: 5 phút
- Subsequent deploys: 1-2 phút

**Total cost:**
- FREE cho traffic < 10GB/tháng
- ~$1-5/tháng cho traffic vừa phải

---

**Happy Deploying! 🚀**

*Cập nhật: 2026-01-22*
