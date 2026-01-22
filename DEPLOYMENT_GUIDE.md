# 🚀 Hướng Dẫn Deploy Mini ERP

## 📋 Tổng Quan

Có 3 phương án deploy chính:
1. **🏆 Vercel** (KHUYẾN NGHỊ - Nhanh nhất, FREE, tự động SSL + domain)
2. **GitHub Pages** (Free nhưng chỉ cho static sites, không phù hợp với React + Firebase)
3. **Google Cloud Run** (Tốn phí, phức tạp hơn)

---

## 🏆 PHƯƠNG ÁN 1: VERCEL (KHUYẾN NGHỊ)

### ✅ Ưu Điểm
- ⚡ **Deploy trong 2 phút**
- 🆓 **Hoàn toàn FREE** cho hobby projects
- 🌐 **Tự động SSL** (HTTPS)
- 🔧 **Auto build** mỗi khi push code
- 🎯 **Custom domain FREE** (kết nối domain riêng)
- 🚀 **CDN toàn cầu** (nhanh ở mọi nơi)

### 📦 Bước 1: Chuẩn Bị

#### 1.1. Tạo Git Repository
```bash
cd /Users/jade/Desktop/mini-erp-frontend

# Initialize git (nếu chưa có)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Mini ERP v2.0"
```

#### 1.2. Push lên GitHub
```bash
# Tạo repo mới trên GitHub: https://github.com/new
# Đặt tên: mini-erp-frontend

# Link local repo với GitHub
git remote add origin https://github.com/YOUR_USERNAME/mini-erp-frontend.git

# Push code
git branch -M main
git push -u origin main
```

### 🚀 Bước 2: Deploy lên Vercel

#### 2.1. Đăng Ký Vercel
1. Truy cập: https://vercel.com/signup
2. Sign up bằng **GitHub account**
3. Authorize Vercel truy cập repos

#### 2.2. Import Project
1. Click **"Add New Project"**
2. Chọn repo **"mini-erp-frontend"**
3. Click **"Import"**

#### 2.3. Configure Build Settings
Vercel tự động detect Vite, nhưng kiểm tra lại:

```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

#### 2.4. Deploy!
1. Click **"Deploy"**
2. Đợi 1-2 phút
3. Nhận link: `https://mini-erp-frontend-xxxxx.vercel.app`

### 🎯 Bước 3: Custom Domain (Optional)

#### 3.1. Nếu Đã Có Domain
1. Vào **Project Settings** → **Domains**
2. Add domain của bạn (VD: `erp.yourcompany.com`)
3. Thêm DNS records theo hướng dẫn của Vercel:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

#### 3.2. Nếu Chưa Có Domain - Mua Domain Giá Rẻ
**🏆 Khuyến nghị:**
- **Tên miền .com**: $12/năm - [Namecheap](https://www.namecheap.com/)
- **Tên miền .xyz**: $1-2/năm - [Porkbun](https://porkbun.com/)
- **Tên miền .vn**: 400k-600k/năm - [INET](https://inet.vn/)

**Bước mua:**
1. Search domain (VD: `mini-erp-2026.com`)
2. Add to cart → Checkout
3. Sau khi mua, vào DNS Settings
4. Thêm records như bước 3.1

### 🔄 Bước 4: Auto Deploy

**Tự động deploy khi push code:**
```bash
# Sửa code
git add .
git commit -m "Update feature X"
git push

# Vercel tự động build & deploy!
# Check tại: https://vercel.com/dashboard
```

---

## 🐙 PHƯƠNG ÁN 2: GITHUB PAGES (KHÔNG KHUYẾN NGHỊ)

### ⚠️ Vấn Đề
GitHub Pages chỉ serve **static files**, không hỗ trợ:
- Client-side routing (React Router)
- Environment variables
- Server-side rendering

### ✅ Nếu Vẫn Muốn Dùng

#### Bước 1: Cài Package
```bash
npm install --save-dev gh-pages
```

#### Bước 2: Update package.json
```json
{
  "name": "mini-erp-frontend",
  "homepage": "https://YOUR_USERNAME.github.io/mini-erp-frontend",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

#### Bước 3: Update vite.config.js
```javascript
export default defineConfig({
  base: '/mini-erp-frontend/',  // Add this
  plugins: [react()],
})
```

#### Bước 4: Deploy
```bash
npm run deploy
```

Truy cập: `https://YOUR_USERNAME.github.io/mini-erp-frontend`

### ⚠️ Hạn Chế
- URL không đẹp (có `/mini-erp-frontend/`)
- Không custom domain miễn phí
- Routing có thể bị lỗi

---

## ☁️ PHƯƠNG ÁN 3: GOOGLE CLOUD RUN

### 💰 Chi Phí
- ~$5-20/tháng tùy traffic
- FREE $300 credits cho 3 tháng đầu (new users)

### 📦 Bước 1: Tạo Dockerfile
```dockerfile
# File: Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 📝 Bước 2: Tạo nginx.conf
```nginx
# File: nginx.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/css application/javascript application/json;
}
```

### 🚀 Bước 3: Deploy
```bash
# Install Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Login
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Build & Deploy
gcloud run deploy mini-erp \
  --source . \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated
```

### 🌐 Bước 4: Custom Domain
1. Vào Google Cloud Console → Cloud Run
2. Chọn service → **Manage Custom Domains**
3. Map domain của bạn
4. Update DNS records theo hướng dẫn

---

## 🎯 So Sánh Chi Tiết

| Tiêu Chí | Vercel | GitHub Pages | Google Cloud Run |
|----------|--------|--------------|------------------|
| **Giá** | FREE | FREE | $5-20/tháng |
| **Setup Time** | 2 phút | 10 phút | 30-60 phút |
| **Custom Domain** | ✅ FREE | ⚠️ Phức tạp | ✅ Có |
| **Auto SSL** | ✅ | ✅ | ✅ |
| **Auto Deploy** | ✅ | ✅ | ⚠️ Manual |
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Ease of Use** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Support** | Excellent | Limited | Good |

---

## 🔧 Environment Variables (Quan Trọng!)

### ⚠️ Bảo Mật Firebase Config

**KHÔNG commit Firebase config lên GitHub!**

#### Bước 1: Tạo .env File
```bash
# File: .env
VITE_FIREBASE_API_KEY=AIzaSyAaYOCRxCc78u2E1CEmvgj6iYD5EqddLhU
VITE_FIREBASE_AUTH_DOMAIN=mini-erp-warehouse-6528e.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mini-erp-warehouse-6528e
VITE_FIREBASE_STORAGE_BUCKET=mini-erp-warehouse-6528e.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=971786813407
VITE_FIREBASE_APP_ID=1:971786813407:web:019404c8292492e8e7ce6a
VITE_FIREBASE_MEASUREMENT_ID=G-423MQXSCBV
```

#### Bước 2: Update firebase.js
```javascript
// src/firebase.js
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};
```

#### Bước 3: Update .gitignore
```bash
# .gitignore
.env
.env.local
.env.production
```

#### Bước 4: Add Environment Variables trên Vercel
1. Vào **Project Settings** → **Environment Variables**
2. Add từng biến:
   ```
   VITE_FIREBASE_API_KEY = AIzaSyA...
   VITE_FIREBASE_AUTH_DOMAIN = mini-erp...
   ...
   ```
3. Click **Save**
4. **Redeploy** project

---

## 📝 Checklist Trước Khi Deploy

### Code
- [ ] Xóa console.log() không cần thiết
- [ ] Test tất cả chức năng: Search, Edit, History, Audit Log
- [ ] Test với cả Admin và Staff accounts
- [ ] Kiểm tra responsive (mobile, tablet)

### Firebase
- [ ] Security Rules đã được setup đúng
- [ ] Indexes đã được tạo và building xong
- [ ] Test permissions (admin/staff)
- [ ] Backup database (export Firestore data)

### Configuration
- [ ] .env đã được setup
- [ ] .gitignore đã loại trừ .env
- [ ] Firebase config đã được ẩn
- [ ] README.md đã cập nhật

### Deploy
- [ ] Git repo đã push lên GitHub
- [ ] Vercel project đã được tạo
- [ ] Environment variables đã được add
- [ ] Build thành công
- [ ] Site có thể truy cập được

---

## 🎯 Quick Start - Deploy trong 5 Phút

```bash
# 1. Git setup
git init
git add .
git commit -m "Initial commit"

# 2. Push to GitHub
# Tạo repo trên https://github.com/new
git remote add origin https://github.com/YOUR_USERNAME/mini-erp-frontend.git
git push -u origin main

# 3. Deploy trên Vercel
# Truy cập https://vercel.com/new
# Import repo → Click Deploy
# Chờ 2 phút → Done!

# 4. Add Environment Variables (nếu cần)
# Project Settings → Environment Variables
# Add tất cả VITE_FIREBASE_* variables
# Redeploy
```

---

## 🐛 Troubleshooting

### Build Failed
**Error:** `Cannot find module 'vite'`
```bash
# Fix: Clear cache và reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Firebase Not Working on Production
**Error:** `Firebase config is undefined`
```bash
# Fix: Add environment variables trên Vercel
# Đảm bảo prefix là VITE_ (không phải REACT_APP_)
```

### Routing 404 Error
**Error:** Refresh trang bị 404
```bash
# Fix: Vercel tự động handle, GitHub Pages cần config
# Với Vercel: Không cần làm gì
# Với GitHub Pages: Thêm 404.html redirect
```

### Slow Performance
```bash
# Fix 1: Enable gzip compression (Vercel tự động)
# Fix 2: Optimize images
# Fix 3: Code splitting (React.lazy)
# Fix 4: Use CDN (Vercel có sẵn)
```

---

## 📊 Monitoring & Analytics

### 1. Vercel Analytics (FREE)
```bash
npm install @vercel/analytics

# Add to main.jsx
import { Analytics } from '@vercel/analytics/react';

<Analytics />
```

### 2. Google Analytics
```javascript
// Add to index.html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
```

### 3. Firebase Performance Monitoring
```bash
npm install firebase/performance

// firebase.js
import { getPerformance } from 'firebase/performance';
const perf = getPerformance(app);
```

---

## 🔒 Security Checklist

- [ ] Firebase Security Rules configured
- [ ] Environment variables không commit lên Git
- [ ] HTTPS enabled (Vercel auto)
- [ ] CORS configured properly
- [ ] No sensitive data in client code
- [ ] Rate limiting enabled (Firebase)
- [ ] Regular security audits

---

## 🚀 Performance Tips

### Build Optimization
```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/firestore']
        }
      }
    }
  }
})
```

### Code Splitting
```javascript
// App.jsx
const SmartSearch = React.lazy(() => import('./components/SmartSearch'));
const AuditLog = React.lazy(() => import('./components/AuditLog'));
```

---

## 📞 Support & Resources

### Documentation
- Vercel: https://vercel.com/docs
- Vite: https://vitejs.dev/guide/
- Firebase: https://firebase.google.com/docs

### Community
- Vercel Discord: https://vercel.com/discord
- Stack Overflow: Tag với `vercel`, `vite`, `firebase`

---

## 🎉 Kết Luận

**Khuyến nghị cuối cùng:**
1. 🏆 **Dùng Vercel** - Nhanh, FREE, dễ dùng
2. 💰 **Mua domain riêng** ($1-12/năm) cho professional
3. 🔐 **Setup environment variables** đúng cách
4. 📊 **Enable analytics** để track usage
5. 🔄 **Auto deploy** từ GitHub (push → deploy tự động)

**Tổng thời gian setup:**
- Vercel: **5-10 phút**
- Custom domain: **+10-30 phút** (đợi DNS propagate)

**Tổng chi phí:**
- Vercel: **$0/tháng**
- Domain: **$1-12/năm**
- **Total: ~$1-12/năm** 🎉

---

**Good luck! 🚀**

*Cập nhật: 2026-01-22*
