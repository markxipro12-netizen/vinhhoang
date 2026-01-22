# 🔒 ẨN GIÁ VỐN CHO STAFF

## ✅ ĐÃ CẬP NHẬT

Đã ẩn **Giá vốn (Cost Price)** hoàn toàn cho **Staff**. Chỉ **Admin** mới xem được!

---

## 🎯 THAY ĐỔI

### Trước đây:
- ❌ Staff thấy được giá vốn trên card sản phẩm
- ❌ Staff thấy được lịch sử thay đổi giá vốn

### Bây giờ:
- ✅ Staff CHỈ thấy giá bán
- ✅ Admin thấy cả giá bán VÀ giá vốn
- ✅ Lịch sử giá vốn bị ẩn hoàn toàn với Staff

---

## 📊 SO SÁNH

### 👑 Admin thấy:
```
┌──────────────────────────────────────────────────────┐
│ Cao su giảm chấn 140A                   120,000 đ   │
│                                         Vốn: 60,000đ │ ✅
│                                                      │
│ [Xem chi tiết] [Lịch sử] [Sửa]                      │
└──────────────────────────────────────────────────────┘

Modal Lịch sử giá:
- ✅ Thấy thay đổi giá bán
- ✅ Thấy thay đổi giá vốn
```

### 👤 Staff thấy:
```
┌──────────────────────────────────────────────────────┐
│ Cao su giảm chấn 140A                   120,000 đ   │
│                                         (KHÔNG CÓ COST) │ ❌
│                                                      │
│ [Xem chi tiết] [Lịch sử]                            │
└──────────────────────────────────────────────────────┘

Modal Lịch sử giá:
- ✅ Thấy thay đổi giá bán
- ❌ KHÔNG thấy thay đổi giá vốn
```

---

## 🔧 CODE CHANGES

### 1. Ẩn giá vốn trên Card sản phẩm
**File:** `src/components/SmartSearch.jsx`

**Trước:**
```javascript
{product.cost !== 0 && (
  <div className="text-lg text-red-600 mt-1 font-bold">
    Vốn: {formatPrice(product.cost)} đ
  </div>
)}
```

**Sau:**
```javascript
{/* Chỉ Admin mới thấy giá vốn */}
{isAdmin && product.cost !== 0 && (
  <div className="text-lg text-red-600 mt-1 font-bold">
    Vốn: {formatPrice(product.cost)} đ
  </div>
)}
```

### 2. Ẩn lịch sử giá vốn trong Price History Modal
**File:** `src/components/SmartSearch.jsx`

**Thêm vào trong map:**
```javascript
{priceHistory.map((record, index) => {
  const isIncrease = record.delta > 0;
  const timestamp = record.changedAt?.toDate?.() || new Date();

  // Ẩn record giá vốn nếu là Staff
  if (!isAdmin && record.fieldChanged === 'cost') {
    return null;
  }

  return (
    <div>...</div>
  );
})}
```

### 3. Cập nhật count trong Modal Footer
**File:** `src/components/SmartSearch.jsx`

**Trước:**
```javascript
Tổng: <span>{priceHistory.length}</span> thay đổi
```

**Sau:**
```javascript
Tổng: <span>
  {isAdmin
    ? priceHistory.length
    : priceHistory.filter(r => r.fieldChanged === 'price').length}
</span> thay đổi
```

**Giải thích:**
- Admin: Đếm tất cả (cả giá bán + giá vốn)
- Staff: Chỉ đếm records có `fieldChanged === 'price'`

---

## 🧪 TEST

### Test 1: Login với Admin
```bash
cd /Users/jade/Desktop/mini-erp-frontend
npm run dev
```

1. Login: `admin@mini-erp.local` / `admin123`
2. Tìm sản phẩm: `cao su`
3. Kiểm tra card:
   - ✅ Thấy "Giá bán: 120,000 đ"
   - ✅ Thấy "Vốn: 60,000 đ" (màu đỏ)
4. Click "Lịch sử":
   - ✅ Thấy records "Giá bán"
   - ✅ Thấy records "Giá vốn"
   - Count: "Tổng: 10 thay đổi" (ví dụ)

### Test 2: Login với Staff
1. Logout → Login: `staff@mini-erp.local` / `staff123`
2. Tìm sản phẩm: `cao su`
3. Kiểm tra card:
   - ✅ Thấy "Giá bán: 120,000 đ"
   - ❌ KHÔNG thấy "Vốn: ..."
4. Click "Lịch sử":
   - ✅ Thấy records "Giá bán"
   - ❌ KHÔNG thấy records "Giá vốn"
   - Count: "Tổng: 5 thay đổi" (chỉ đếm giá bán)

### Test 3: So sánh trực tiếp
1. Mở 2 trình duyệt (hoặc Normal + Incognito)
2. Browser 1: Login Admin
3. Browser 2: Login Staff
4. Cả 2 tìm cùng 1 sản phẩm
5. So sánh:
   - Admin: Có giá vốn
   - Staff: KHÔNG có giá vốn

---

## 🔒 BẢO MẬT

### Client-side Protection
- ✅ UI ẩn giá vốn với Staff
- ✅ Conditional rendering với `{isAdmin && ...}`
- ✅ Filter price history records

### Server-side Protection (Khuyến nghị)
**Firestore Security Rules** nên cũng ẩn giá vốn:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // THÊM RULE ĐỂ ẨN GIÁ VỐN CHO STAFF (Tùy chọn)
    // Nếu muốn chặt chẽ hơn, có thể tạo 2 collections riêng:
    // - productsPublic (không có cost) - Staff read được
    // - productsCost (chỉ có cost) - Chỉ Admin read được

    match /priceHistory/{historyId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null &&
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow delete: if false;
    }
  }
}
```

**Lưu ý:** Firestore Rules không hỗ trợ filter field trong document. Nếu muốn bảo mật tuyệt đối, cần:
1. Tách thành 2 collections riêng (products + productsCost)
2. Hoặc dùng Cloud Functions để proxy data

---

## 💡 WHY ẨN GIÁ VỐN?

### 1. Bảo mật thông tin kinh doanh
- Giá vốn là **thông tin nhạy cảm**
- Nếu Staff biết giá vốn → Biết lợi nhuận → Có thể lộ cho đối thủ

### 2. Phân quyền hợp lý
- **Staff**: Chỉ cần biết giá bán để báo khách
- **Admin**: Cần biết giá vốn để quản lý lợi nhuận

### 3. Audit Trail vẫn đầy đủ
- Admin vẫn thấy được:
  - Ai thay đổi giá vốn
  - Thay đổi khi nào
  - Thay đổi bao nhiêu
- Staff không biết có sự thay đổi → Không bị tò mò

---

## ❓ FAQ

**Q1: Staff có thể xem giá vốn bằng cách nào khác không?**

A: **Có thể** nếu:
- Mở DevTools (F12) → Network tab → Xem response từ Firestore
- Hoặc copy productId → Query trực tiếp Firestore

**Giải pháp:** Update Firestore Rules để chặn ở server-side (xem mục "Bảo mật" phía trên)

**Q2: Nếu Admin sửa giá vốn, Staff có nhận ra không?**

A: **Không**. Staff:
- Không thấy giá vốn trên card
- Không thấy lịch sử thay đổi giá vốn
- → Hoàn toàn không biết có thay đổi

**Q3: Làm sao để cho Staff thấy lại giá vốn?**

A: Xóa `isAdmin &&` trong code:
```javascript
// Thay vì
{isAdmin && product.cost !== 0 && (...)}

// Thành
{product.cost !== 0 && (...)}
```

**Q4: Count trong modal có chính xác không?**

A: **Có**:
- Admin: Đếm tất cả (giá bán + giá vốn)
- Staff: Chỉ đếm giá bán
- VD: Nếu có 10 records (5 giá bán + 5 giá vốn)
  - Admin thấy: "Tổng: 10 thay đổi"
  - Staff thấy: "Tổng: 5 thay đổi"

---

## ✅ CHECKLIST

- [x] Ẩn giá vốn trên card sản phẩm
- [x] Ẩn lịch sử giá vốn trong modal
- [x] Cập nhật count trong modal footer
- [x] Test với Admin (thấy giá vốn)
- [x] Test với Staff (KHÔNG thấy giá vốn)
- [ ] (Tùy chọn) Update Firestore Rules để bảo mật server-side

---

## 🎉 KẾT QUẢ

Bây giờ:
- ✅ **Admin**: Toàn quyền, thấy tất cả
- ✅ **Staff**: Chỉ thấy giá bán, KHÔNG thấy giá vốn
- ✅ Bảo mật thông tin kinh doanh
- ✅ Phân quyền rõ ràng

---

**Security Level:**
- Client-side: ✅ Protected
- Server-side: ⚠️ Cần update Firestore Rules để bảo mật tuyệt đối

Chúc mừng! Giá vốn đã được ẩn khỏi Staff! 🎊
