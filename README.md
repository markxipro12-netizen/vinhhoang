# 🏢 Mini ERP - Warehouse Management System

Hệ thống quản lý kho hàng với Firebase Backend, tìm kiếm thông minh và audit logging.

## ✨ Tính Năng

### 🔐 Authentication
- Firebase Authentication
- Role-based access control (Admin/Staff)
- Secure login/logout

### 🔍 Smart Search
- **Fuzzy Search** - Tìm kiếm thông minh với Levenshtein distance
- **Exact Match** - Tìm kiếm chính xác
- Real-time search với debouncing (300ms)
- Highlight kết quả tìm kiếm

### ✏️ Product Management
- Inline editing (Admin only)
- Bulk import từ Excel/CSV (18K+ products)
- Auto-save với validation
- Real-time updates

### 📊 Price & Cost History
- Theo dõi lịch sử thay đổi giá/cost
- Timeline view với filters
- Delta calculation (tăng/giảm bao nhiêu)

### 📝 Audit Log
- Ghi lại TẤT CẢ thay đổi (name, code, price, cost, stock, attributes)
- Who changed, when changed, what changed
- Advanced filtering (by user, date, field)
- Export capabilities

## 🛠️ Tech Stack

- **Frontend**: React 19.2.0 + Vite (Rolldown)
- **Styling**: Tailwind CSS 4.1.18
- **Backend**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Icons**: Lucide React
- **Data Import**: xlsx, papaparse

## 📦 Installation

### Prerequisites
- Node.js 18+
- Firebase project with Firestore & Authentication enabled

### Setup

```bash
# 1. Clone repository
git clone https://github.com/markxipro12-netizen/vinhhoang.git
cd vinhhoang

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env

# 4. Add Firebase credentials to .env
# Get config from: https://console.firebase.google.com/
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
# ... etc (see .env.example)

# 5. Run development server
npm run dev
```

## 🚀 Deployment

See detailed guides:
- **[GITHUB_DEPLOY_GUIDE.md](./GITHUB_DEPLOY_GUIDE.md)** - Deploy lên GitHub & Vercel/Firebase
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - So sánh các phương án deploy
- **[FIREBASE_HOSTING_GUIDE.md](./FIREBASE_HOSTING_GUIDE.md)** - Firebase Hosting chi tiết

### Quick Deploy (Vercel - Recommended)

```bash
# 1. Push to GitHub
git add .
git commit -m "Initial commit"
git push

# 2. Import to Vercel
# - Go to: https://vercel.com/new
# - Import GitHub repo
# - Add environment variables
# - Deploy!
```

## 📖 Documentation

- **[USER_GUIDE.md](./USER_GUIDE.md)** - Hướng dẫn sử dụng cho end-users
- **[GITHUB_DEPLOY_GUIDE.md](./GITHUB_DEPLOY_GUIDE.md)** - Hướng dẫn deploy chi tiết
- **[CHANGELOG_AUDIT_SYSTEM.md](./CHANGELOG_AUDIT_SYSTEM.md)** - Lịch sử thay đổi

## 🔒 Security

- ✅ Environment variables không commit lên Git
- ✅ Firebase Security Rules với role-based access
- ✅ HTTPS enforced (production)
- ✅ Audit logging cho tất cả thay đổi

## 📊 Performance

- ⚡ Debounced search (300ms delay)
- ⚡ React.memo for optimized rendering
- ⚡ Firestore indexes for fast queries
- ⚡ CDN delivery (Vercel/Firebase)

## 📝 Changelog

### Version 2.0 (2026-01-22)
- ✨ Comprehensive audit logging cho tất cả fields
- ✨ Professional redesign với Tailwind CSS
- ✨ Debounced search cho 18K+ products
- ✨ Enhanced price history với timeline
- 🐛 Fixed React Hooks violation
- 🐛 Fixed Firebase permission issues
- 📚 Complete documentation suite

## 👤 Author

**Vinh Hoang**
- GitHub: [@markxipro12-netizen](https://github.com/markxipro12-netizen)

---

**Production URL**: Coming soon after deployment 🚀

*Last updated: 2026-01-22*
# Update Thu Jan 22 19:57:36 +07 2026
# Force redeploy Thu Jan 22 20:22:17 +07 2026
