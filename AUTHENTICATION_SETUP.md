# 🔐 AUTHENTICATION SETUP - ADMIN & STAFF

## ✅ ĐÃ HOÀN THÀNH

Đã thêm **Firebase Authentication** với phân quyền **Admin** và **Staff**!

---

## 🎯 TÍNH NĂNG

### 1. ✅ Màn hình Login đẹp
- Gradient background xanh-tím
- Form login với Email + Password
- Icon đẹp (Lock, User)
- Error handling rõ ràng
- Demo accounts hiển thị sẵn

### 2. ✅ Authentication với Firebase
- Sử dụng Firebase Authentication
- Email/Password login
- Auto redirect sau khi login
- Session persistence (giữ đăng nhập)

### 3. ✅ Phân quyền 2 cấp

#### 👑 Admin
- **Tất cả quyền của Staff** +
- Sửa sản phẩm (Inline Edit)
- Upload Excel (Bulk Update)
- Tên hiển thị: "Admin" với icon Shield (🛡️) màu đỏ

#### 👤 Staff
- Xem sản phẩm
- Tìm kiếm
- Xem lịch sử giá
- Toggle Fuzzy/Exact mode
- Xem chi tiết sản phẩm
- Tên hiển thị: "Staff" với icon User màu xanh
- **KHÔNG** được sửa sản phẩm
- **KHÔNG** được upload Excel

### 4. ✅ User Info & Logout
- Hiển thị role (Admin/Staff) ở header
- Hiển thị email
- Nút "Đăng xuất" màu đỏ
- Tự động redirect về Login sau logout

### 5. ✅ Price History với User Email
- Thay vì "manual_edit" → Lưu email thực của user
- VD: "admin@mini-erp.local", "staff@mini-erp.local"
- Hiển thị trong modal Lịch sử giá

---

## 🚀 SETUP FIREBASE AUTHENTICATION

### Bước 1: Enable Email/Password Auth trên Firebase Console

1. Vào Firebase Console: https://console.firebase.google.com
2. Chọn project: `mini-erp-warehouse-6528e`
3. Vào **Authentication** → **Sign-in method**
4. Click **Email/Password**
5. Enable cả 2 options:
   - [x] Email/Password
   - [ ] Email link (passwordless sign-in) ← Không cần
6. Click **Save**

### Bước 2: Tạo users trên Firebase Console

#### Tạo Admin User
1. Vào **Authentication** → **Users**
2. Click **Add user**
3. Email: `admin@mini-erp.local`
4. Password: `admin123` (hoặc bất kỳ)
5. Click **Add user**
6. **Copy UID** của user vừa tạo (ví dụ: `abc123xyz`)

#### Tạo Staff User
1. Click **Add user** lần nữa
2. Email: `staff@mini-erp.local`
3. Password: `staff123` (hoặc bất kỳ)
4. Click **Add user**
5. **Copy UID** của user vừa tạo

### Bước 3: Tạo collection `users` trong Firestore

1. Vào **Firestore Database**
2. Click **Start collection**
3. Collection ID: `users`
4. Click **Next**

#### Tạo document cho Admin
1. Document ID: **Paste UID của Admin** (abc123xyz)
2. Fields:
   ```
   role (string): admin
   email (string): admin@mini-erp.local
   createdAt (timestamp): [Auto]
   ```
3. Click **Save**

#### Tạo document cho Staff
1. Click **Add document**
2. Document ID: **Paste UID của Staff**
3. Fields:
   ```
   role (string): staff
   email (string): staff@mini-erp.local
   createdAt (timestamp): [Auto]
   ```
4. Click **Save**

### Bước 4: Update Firebase Security Rules

#### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users collection - Chỉ đọc
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Không cho update từ client
    }

    // Products collection
    match /products/{productId} {
      allow read: if request.auth != null; // Staff + Admin đều đọc được
      allow write: if request.auth != null &&
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      // Chỉ Admin mới write được
    }

    // Price History collection
    match /priceHistory/{historyId} {
      allow read: if request.auth != null; // Staff + Admin đều đọc được
      allow create: if request.auth != null &&
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      // Chỉ Admin mới tạo được
      allow delete: if false; // Không cho xóa (audit trail)
    }
  }
}
```

**Giải thích:**
- `request.auth != null` → Phải đăng nhập
- `request.auth.uid == userId` → Chỉ xem được thông tin của chính mình
- `get(...).data.role == 'admin'` → Kiểm tra role trong Firestore

---

## 🧪 TEST AUTHENTICATION

### Test 1: Login với Admin
```bash
cd /Users/jade/Desktop/mini-erp-frontend
npm run dev
```

1. Mở trình duyệt: http://localhost:5173
2. Nhập:
   - Email: `admin@mini-erp.local`
   - Password: `admin123` (hoặc password bạn đã set)
3. Click **Đăng nhập**
4. Kiểm tra:
   - ✅ Header hiển thị "Admin" với icon Shield màu đỏ
   - ✅ Email: admin@mini-erp.local
   - ✅ Nút "Upload Excel" hiển thị
   - ✅ Nút "Sửa" hiển thị trên mỗi sản phẩm

### Test 2: Login với Staff
1. Click **Đăng xuất**
2. Nhập:
   - Email: `staff@mini-erp.local`
   - Password: `staff123`
3. Click **Đăng nhập**
4. Kiểm tra:
   - ✅ Header hiển thị "Staff" với icon User màu xanh
   - ✅ Email: staff@mini-erp.local
   - ❌ KHÔNG có nút "Upload Excel"
   - ❌ KHÔNG có nút "Sửa" trên sản phẩm
   - ✅ Vẫn có thể: Tìm kiếm, xem chi tiết, xem lịch sử

### Test 3: Price History với User Email
1. Login với Admin
2. Tìm sản phẩm → Click "Sửa"
3. Đổi giá → Click "Lưu"
4. Click "Lịch sử"
5. Xem record mới nhất:
   - Người thay đổi: **admin@mini-erp.local** (thay vì "manual_edit")

### Test 4: Session Persistence
1. Login với Admin
2. Refresh trang (F5)
3. Kiểm tra: Vẫn đăng nhập, không bị đá ra

### Test 5: Logout
1. Click nút "Đăng xuất"
2. Kiểm tra: Redirect về màn hình Login

---

## 📝 CODE CHANGES

### Các file đã tạo mới

#### 1. `src/contexts/AuthContext.jsx`
```javascript
import { createContext, useContext, useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export const useAuth = () => { ... };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // Lắng nghe auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Lấy role từ Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        setUserRole(userDoc.data().role);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, userRole, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

#### 2. `src/components/Login.jsx`
- Form login đẹp với gradient background
- Email + Password inputs
- Error handling
- Demo accounts

#### 3. `src/App.jsx` (Updated)
```javascript
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import SmartSearch from './components/SmartSearch';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  return user ? <SmartSearch /> : <Login />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
```

#### 4. `src/components/SmartSearch.jsx` (Updated)
```javascript
import { useAuth } from '../contexts/AuthContext';

export default function SmartSearch() {
  const { user, userRole, isAdmin, logout } = useAuth();

  // Phân quyền trong UI
  {isAdmin && (
    <button>Upload Excel</button>
  )}

  {isAdmin && (
    <button>Sửa</button>
  )}

  // Lưu email vào price history
  changedBy: user?.email || 'unknown'
}
```

---

## 🎨 GIAO DIỆN

### Màn hình Login
```
┌────────────────────────────────────────────────────┐
│                                                    │
│                   [🔒 Icon]                        │
│                  Mini ERP                          │
│              Đăng nhập để tiếp tục                 │
│                                                    │
├────────────────────────────────────────────────────┤
│  Email                                             │
│  [👤 admin@mini-erp.local          ]              │
│                                                    │
│  Mật khẩu                                          │
│  [🔒 ••••••••                       ]              │
│                                                    │
│         [🔐 Đăng nhập]                             │
│                                                    │
├────────────────────────────────────────────────────┤
│ Demo accounts:                                     │
│ 👑 Admin: admin@mini-erp.local                     │
│ 👤 Staff: staff@mini-erp.local                     │
└────────────────────────────────────────────────────┘
```

### Header khi đăng nhập (Admin)
```
┌────────────────────────────────────────────────────┐
│ 📦 Mini ERP    [🛡️ Admin]  [📁 Upload] [🚪 Logout] │
│                admin@mini-erp.local                │
└────────────────────────────────────────────────────┘
```

### Header khi đăng nhập (Staff)
```
┌────────────────────────────────────────────────────┐
│ 📦 Mini ERP         [👤 Staff]       [🚪 Logout]   │
│                   staff@mini-erp.local             │
└────────────────────────────────────────────────────┘
```

---

## 🔒 SECURITY BEST PRACTICES

### 1. Không hardcode passwords
- KHÔNG commit passwords vào Git
- Dùng environment variables (`.env`)
- Hoặc Firebase Admin SDK để tạo user

### 2. Firebase Security Rules
- Luôn validate `request.auth != null`
- Check role từ Firestore, không tin client
- Không cho client update `users` collection

### 3. Password Requirements
- Tối thiểu 6 ký tự (Firebase default)
- Khuyến nghị: 8+ ký tự, có chữ hoa, số, ký tự đặc biệt
- Dùng Firebase Password Policy (nếu muốn)

### 4. Session Management
- Firebase tự động handle session
- Token refresh tự động
- Session timeout: 1 giờ (có thể config)

---

## ❓ FAQ

**Q1: Làm sao thêm user mới?**

A: Có 2 cách:
1. **Firebase Console** (khuyến nghị): Authentication → Add user
2. **Code**: Tạo form Register (cần Admin SDK)

**Q2: Làm sao đổi role của user?**

A: Vào Firestore → Collection `users` → Chọn document → Sửa field `role`

**Q3: Làm sao reset password?**

A: Firebase Console → Authentication → Users → Chọn user → Reset password

**Q4: Staff có thể xem được giá vốn không?**

A: Có! Staff xem được tất cả thông tin, chỉ không sửa được.

**Q5: Làm sao biết ai đã sửa giá?**

A: Xem collection `priceHistory` → Field `changedBy` = email của user

---

## 🎉 KẾT QUẢ

Hệ thống bây giờ có:

1. ✅ **Authentication** hoàn chỉnh
2. ✅ **Phân quyền** Admin/Staff
3. ✅ **Login/Logout** đẹp
4. ✅ **Session persistence**
5. ✅ **Price history** với user email
6. ✅ **Security rules** chặt chẽ

---

**Demo credentials:**
- 👑 Admin: `admin@mini-erp.local` / `admin123`
- 👤 Staff: `staff@mini-erp.local` / `staff123`

Chúc mừng! Authentication đã sẵn sàng! 🎊
