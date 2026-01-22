# 🚀 Hướng Dẫn Deploy Mini ERP lên GitHub & Production

## 📋 Tổng Quan

Có 2 phương án deploy chính:
1. **🏆 Vercel** (KHUYẾN NGHỊ) - Deploy qua GitHub, FREE, tự động, nhanh nhất
2. **🔥 Firebase Hosting** - Tích hợp tốt với Firebase Firestore

**❌ KHÔNG khuyến nghị GitHub Pages** vì không hỗ trợ tốt React + Firebase.

---

## 🔐 Bước 1: Chuẩn Bị Code (ĐÃ HOÀN THÀNH)

✅ **Đã cập nhật:**
- `.gitignore` - Loại trừ file .env
- `src/firebase.js` - Sử dụng environment variables
- `.env` - Chứa Firebase credentials (KHÔNG commit lên Git)
- `.env.example` - Template cho người khác

---

## 📦 Bước 2: Push Code Lên GitHub

### 2.1. Kiểm Tra Git Status

```bash
cd /Users/jade/Desktop/mini-erp-frontend

# Kiểm tra xem đã init git chưa
git status
```

**Nếu báo "not a git repository":**
```bash
# Initialize git repository
git init
```

### 2.2. Add & Commit Code

```bash
# Add tất cả files (trừ những file trong .gitignore)
git add .

# Kiểm tra xem file .env có bị add không (PHẢI KHÔNG có .env)
git status

# Commit code
git commit -m "Initial commit - Mini ERP v2.0 with Firebase integration"
```

### 2.3. Link Với GitHub Remote

```bash
# Link với GitHub repository
git remote add origin https://github.com/markxipro12-netizen/vinhhoang.git

# Đổi branch sang main
git branch -M main

# Push code lên GitHub
git push -u origin main
```

**Nếu bị lỗi authentication:**
```bash
# Nếu dùng HTTPS, GitHub yêu cầu Personal Access Token
# Cách 1: Dùng SSH thay vì HTTPS
# Cách 2: Tạo Personal Access Token tại: https://github.com/settings/tokens
# Khi push, dùng token làm password
```

---

## 🏆 PHƯƠNG ÁN 1: VERCEL (KHUYẾN NGHỊ)

### ✅ Ưu Điểm
- ⚡ **Deploy tự động** khi push code
- 🆓 **Hoàn toàn FREE** cho hobby projects
- 🌐 **Tự động SSL** (HTTPS)
- 🎯 **Custom domain FREE**
- 🚀 **CDN toàn cầu** (nhanh)

### Bước 1: Đăng Ký Vercel

1. Truy cập: https://vercel.com/signup
2. Click **"Continue with GitHub"**
3. Authorize Vercel truy cập GitHub account

### Bước 2: Import Project

1. Vào Vercel Dashboard: https://vercel.com/new
2. Click **"Import Git Repository"**
3. Chọn repo: **markxipro12-netizen/vinhhoang**
4. Click **"Import"**

### Bước 3: Configure Project

Vercel tự động detect Vite, nhưng kiểm tra lại:

```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Root Directory: ./
```

### Bước 4: Add Environment Variables

**🔴 QUAN TRỌNG:** Phải add Firebase credentials vào Vercel!

1. Trong màn hình configure, kéo xuống phần **"Environment Variables"**
2. Add từng biến (copy từ file `.env`):

```
VITE_FIREBASE_API_KEY = AIzaSyAaYOCRxCc78u2E1CEmvgj6iYD5EqddLhU
VITE_FIREBASE_AUTH_DOMAIN = mini-erp-warehouse-6528e.firebaseapp.com
VITE_FIREBASE_PROJECT_ID = mini-erp-warehouse-6528e
VITE_FIREBASE_STORAGE_BUCKET = mini-erp-warehouse-6528e.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID = 971786813407
VITE_FIREBASE_APP_ID = 1:971786813407:web:019404c8292492e8e7ce6a
VITE_FIREBASE_MEASUREMENT_ID = G-423MQXSCBV
```

**Lưu ý:**
- Mỗi biến add riêng (Name = Value)
- Apply to: **All (Production, Preview, and Development)**

### Bước 5: Deploy!

1. Click **"Deploy"**
2. Đợi 1-2 phút build
3. Nhận link: `https://vinhhoang-xxxxx.vercel.app`

### Bước 6: Test

Truy cập link Vercel, test:
- ✅ Login với Firebase account
- ✅ Search sản phẩm
- ✅ Edit & Save
- ✅ View History
- ✅ Audit Log

### 🎯 Bước 7: Custom Domain (Optional)

#### Nếu Muốn Domain Riêng

1. Vào **Project Settings** → **Domains**
2. Add domain (VD: `erp.yourcompany.com`)
3. Update DNS records tại nhà cung cấp domain:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

4. Đợi DNS propagate (5-60 phút)
5. Vercel tự động setup SSL certificate

---

## 🔥 PHƯƠNG ÁN 2: FIREBASE HOSTING

### ✅ Ưu Điểm
- Tích hợp sẵn với Firebase Firestore (bạn đang dùng)
- FREE tier rộng (10GB/tháng)
- Google CDN cực nhanh

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
# Select account có quyền truy cập Firebase project
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
→ No (manual deploy)

? File dist/index.html already exists. Overwrite?
→ No
```

### Bước 4: Build

```bash
npm run build

# Output:
# ✓ built in 5s
# dist/index.html
# dist/assets/index-xxxxx.js
```

### Bước 5: Deploy

```bash
firebase deploy --only hosting

# Output:
# ✔ Deploy complete!
#
# Hosting URL: https://mini-erp-warehouse-6528e.web.app
```

### Bước 6: Test

Truy cập: `https://mini-erp-warehouse-6528e.web.app`

---

## 🔄 Auto Deploy Khi Push Code

### Với Vercel (Tự Động)

Sau khi setup xong, **mỗi khi push code lên GitHub**, Vercel tự động:
1. Detect thay đổi
2. Build project
3. Deploy lên production

```bash
# Sửa code
git add .
git commit -m "Update feature X"
git push

# Vercel tự động deploy!
# Check tại: https://vercel.com/dashboard
```

### Với Firebase Hosting (Manual)

Mỗi lần update code:

```bash
# Build
npm run build

# Deploy
firebase deploy --only hosting
```

**Hoặc setup GitHub Actions** (xem `FIREBASE_HOSTING_GUIDE.md`)

---

## 🐛 Troubleshooting

### Lỗi 1: Firebase Config Undefined

**Error:** "Firebase configuration missing! Check your .env file"

**Fix:**
1. Kiểm tra file `.env` có tồn tại không
2. Kiểm tra tất cả biến có prefix `VITE_` không
3. Với Vercel: Add environment variables trên Vercel Dashboard
4. Restart dev server: `npm run dev`

### Lỗi 2: Build Failed

**Error:** "Cannot find module 'vite'"

```bash
# Fix: Clear cache và reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Lỗi 3: Routing 404 Error

**Error:** Refresh trang bị 404

- ✅ **Vercel**: Tự động handle (không cần làm gì)
- ✅ **Firebase Hosting**: Đã config trong `firebase.json` (rewrites)
- ❌ **GitHub Pages**: Không hỗ trợ tốt

### Lỗi 4: Permission Denied on GitHub Push

**Error:** "remote: Permission to markxipro12-netizen/vinhhoang.git denied"

**Fix:**
```bash
# Cách 1: Dùng Personal Access Token
# Tạo token tại: https://github.com/settings/tokens
# Khi push, username = GitHub username, password = token

# Cách 2: Dùng SSH
# Setup SSH key: https://docs.github.com/en/authentication/connecting-to-github-with-ssh
```

---

## 📊 So Sánh Deployment

| Tiêu Chí | Vercel | Firebase Hosting |
|----------|--------|------------------|
| **Giá** | FREE | FREE (10GB/tháng) |
| **Setup Time** | 5 phút | 10 phút |
| **Custom Domain** | ✅ FREE | ✅ FREE |
| **Auto Deploy** | ✅ (from GitHub) | ⚠️ Manual hoặc GitHub Actions |
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Ease of Use** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## ✅ Checklist

### Trước Khi Deploy
- [x] Code đã được update để dùng environment variables
- [x] File `.env` đã được tạo (chứa Firebase config)
- [x] File `.gitignore` đã loại trừ `.env`
- [ ] Test local: `npm run dev` → Mọi thứ hoạt động
- [ ] Build thành công: `npm run build`
- [ ] Code đã push lên GitHub

### Deploy
- [ ] Chọn platform: Vercel hoặc Firebase Hosting
- [ ] Add environment variables (với Vercel)
- [ ] Deploy thành công
- [ ] Test production site:
  - [ ] Login hoạt động
  - [ ] Search hoạt động
  - [ ] Edit & Save hoạt động
  - [ ] History hoạt động
  - [ ] Audit Log hoạt động

### Sau Deploy
- [ ] (Optional) Setup custom domain
- [ ] Share URL với team
- [ ] Update README.md với production URL

---

## 🚀 Quick Commands

```bash
# ============================================
# GIT COMMANDS
# ============================================

# 1. Initialize git (nếu chưa có)
git init

# 2. Add all files
git add .

# 3. Commit
git commit -m "Initial commit - Mini ERP v2.0"

# 4. Link với GitHub
git remote add origin https://github.com/markxipro12-netizen/vinhhoang.git

# 5. Push to GitHub
git branch -M main
git push -u origin main

# ============================================
# UPDATE CODE (sau khi setup xong)
# ============================================

# Sửa code → Add → Commit → Push
git add .
git commit -m "Update: your changes here"
git push

# Với Vercel: Tự động deploy!
# Với Firebase: npm run build && firebase deploy --only hosting

# ============================================
# BUILD & DEPLOY
# ============================================

# Build local
npm run build

# Deploy Firebase Hosting
firebase deploy --only hosting

# Deploy Vercel (qua GitHub)
# → Push code → Vercel tự động deploy
```

---

## 📞 Support

### Nếu Cần Hỗ Trợ:
- **Vercel Documentation**: https://vercel.com/docs
- **Firebase Hosting**: https://firebase.google.com/docs/hosting
- **GitHub Help**: https://docs.github.com/

---

## 🎉 Kết Luận

**Khuyến nghị cuối cùng:**
1. 🏆 **Dùng Vercel** - Nhanh, FREE, tự động deploy từ GitHub
2. 🔐 **Đảm bảo .env không commit lên Git** (đã setup trong .gitignore)
3. 🌐 **Add custom domain** nếu muốn (FREE với cả Vercel và Firebase)
4. 🔄 **Mỗi lần update code** chỉ cần `git push` → Vercel tự động deploy

**Tổng thời gian:**
- Setup Git + GitHub: **5 phút**
- Deploy lên Vercel: **5 phút**
- **Total: 10 phút** 🎉

---

**Good luck! 🚀**

*Cập nhật: 2026-01-22*
