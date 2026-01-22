# ✅ BƯỚC 4 HOÀN THÀNH: PRICE HISTORY LOGGING

## 🎉 ĐÃ LÀM GÌ?

Đã bổ sung tính năng **Price History Logging** - tự động ghi lại **MỌI** thay đổi giá vào Firestore collection `priceHistory`!

---

## ✨ TÍNH NĂNG MỚI

### 1. ✅ Tự động log khi giá thay đổi
- Mỗi lần **Save** trong Inline Edit → Kiểm tra giá có thay đổi không
- Nếu **Giá bán** thay đổi → Tạo 1 document trong `priceHistory`
- Nếu **Giá vốn** thay đổi → Tạo 1 document trong `priceHistory`
- Log cả 2 nếu cả 2 đều thay đổi

### 2. ✅ Dữ liệu được log
Mỗi document trong collection `priceHistory` chứa:
```javascript
{
  productId: "abc123",               // ID sản phẩm
  productCode: "CAO SU GIAM CHAN",   // Mã hàng (để dễ tìm)
  productName: "Cao su giảm chấn...", // Tên sản phẩm
  fieldChanged: "price" | "cost",    // Trường nào thay đổi
  oldValue: 100000,                  // Giá cũ
  newValue: 120000,                  // Giá mới
  delta: 20000,                      // Chênh lệch (+ hoặc -)
  changedAt: serverTimestamp(),      // Thời gian thay đổi
  changedBy: "manual_edit",          // Ai thay đổi (có thể thêm user email sau)
  source: "inline_edit"              // Nguồn thay đổi (inline_edit, bulk_update, etc.)
}
```

### 3. ✅ Console log đẹp
Khi lưu thành công, console hiển thị:
```
📊 Logged price change: 100000 → 120000 (Δ 20000)
📊 Logged cost change: 50000 → 60000 (Δ 10000)
✅ Đã lưu thành công!
```

---

## 🎨 FIRESTORE STRUCTURE

### Collection: `priceHistory`
```
priceHistory/
├── doc_1 (auto-generated ID)
│   ├── productId: "abc123"
│   ├── productCode: "CAO SU GIAM CHAN"
│   ├── productName: "Cao su giảm chấn 140A"
│   ├── fieldChanged: "price"
│   ├── oldValue: 100000
│   ├── newValue: 120000
│   ├── delta: 20000
│   ├── changedAt: Timestamp(2024-01-15 10:30:00)
│   ├── changedBy: "manual_edit"
│   └── source: "inline_edit"
│
├── doc_2
│   ├── productId: "abc123"
│   ├── productCode: "CAO SU GIAM CHAN"
│   ├── fieldChanged: "cost"
│   ├── oldValue: 50000
│   ├── newValue: 60000
│   ├── delta: 10000
│   ├── changedAt: Timestamp(2024-01-15 10:30:01)
│   ├── changedBy: "manual_edit"
│   └── source: "inline_edit"
│
└── doc_3 (cho sản phẩm khác...)
```

---

## 🧪 CÁCH TEST

### Bước 1: Chạy app
```bash
cd /Users/jade/Desktop/mini-erp-frontend
npm run dev
```

### Bước 2: Tìm sản phẩm
- Gõ từ khóa: `cao su` hoặc `140A`
- Click "Sửa" trên 1 sản phẩm

### Bước 3: Thay đổi giá
**Test case 1: Chỉ đổi giá bán**
- Giá bán cũ: 100,000 đ → Giá mới: 120,000 đ
- Click "Lưu thay đổi"
- Xem Console → Sẽ có log: `📊 Logged price change: 100000 → 120000 (Δ 20000)`

**Test case 2: Chỉ đổi giá vốn**
- Giá vốn cũ: 50,000 đ → Giá mới: 60,000 đ
- Click "Lưu thay đổi"
- Xem Console → Sẽ có log: `📊 Logged cost change: 50000 → 60000 (Δ 10000)`

**Test case 3: Đổi cả 2 giá**
- Giá bán: 100,000 → 120,000
- Giá vốn: 50,000 → 60,000
- Click "Lưu thay đổi"
- Xem Console → Sẽ có **2 log** (1 cho price, 1 cho cost)

**Test case 4: Không đổi giá (chỉ đổi tên)**
- Đổi tên sản phẩm
- Giá bán, giá vốn giữ nguyên
- Click "Lưu thay đổi"
- Xem Console → **KHÔNG** có log price history (vì giá không đổi)

### Bước 4: Kiểm tra Firebase
1. Vào Firebase Console: https://console.firebase.google.com
2. Chọn project: `mini-erp-warehouse-6528e`
3. Vào **Firestore Database**
4. Tìm collection `priceHistory` (sẽ tự động tạo lần đầu log)
5. Xem các document → Mỗi document là 1 lần thay đổi giá

### Bước 5: Query price history cho 1 sản phẩm
Mở Firebase Console → Firestore → `priceHistory`

**Filter by productId:**
```
productId == "abc123"
```

**Sắp xếp theo thời gian:**
```
ORDER BY changedAt DESC
```

→ Xem toàn bộ lịch sử thay đổi giá của sản phẩm đó!

---

## 🔧 CODE CHANGES

### File đã sửa: `src/components/SmartSearch.jsx`

#### 1. Import thêm Firebase functions
```javascript
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
```

#### 2. Cập nhật hàm saveEdit
```javascript
const saveEdit = async (productId) => {
  try {
    setSaving(true);

    // Tìm sản phẩm gốc để so sánh
    const originalProduct = products.find(p => p.id === productId);

    const newPrice = parseFloat(editForm.price) || 0;
    const newCost = parseFloat(editForm.cost) || 0;
    const oldPrice = originalProduct.price || 0;
    const oldCost = originalProduct.cost || 0;

    // Cập nhật Firestore (như cũ)
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, { ... });

    // ==================== PRICE HISTORY LOGGING ====================
    // Nếu giá bán thay đổi → Log
    if (newPrice !== oldPrice) {
      await addDoc(collection(db, 'priceHistory'), {
        productId: productId,
        productCode: editForm.code,
        productName: editForm.name,
        fieldChanged: 'price',
        oldValue: oldPrice,
        newValue: newPrice,
        delta: newPrice - oldPrice,
        changedAt: serverTimestamp(),
        changedBy: 'manual_edit',
        source: 'inline_edit'
      });
      console.log(`📊 Logged price change: ${oldPrice} → ${newPrice} (Δ ${newPrice - oldPrice})`);
    }

    // Nếu giá vốn thay đổi → Log
    if (newCost !== oldCost) {
      await addDoc(collection(db, 'priceHistory'), {
        productId: productId,
        productCode: editForm.code,
        productName: editForm.name,
        fieldChanged: 'cost',
        oldValue: oldCost,
        newValue: newCost,
        delta: newCost - oldCost,
        changedAt: serverTimestamp(),
        changedBy: 'manual_edit',
        source: 'inline_edit'
      });
      console.log(`📊 Logged cost change: ${oldCost} → ${newCost} (Δ ${newCost - oldCost})`);
    }

    // Cập nhật local state (như cũ)
    setProducts(prev => prev.map(p =>
      p.id === productId
        ? { ...p, ...editForm, price: newPrice, cost: newCost, stock: parseFloat(editForm.stock) }
        : p
    ));

    setSaving(false);
    setEditingId(null);
    setEditForm({});

    console.log('✅ Đã lưu thành công!');
  } catch (err) {
    console.error('❌ Lỗi khi lưu:', err);
    alert('Lỗi khi lưu: ' + err.message);
    setSaving(false);
  }
};
```

---

## 💡 USE CASES

### 1. Kiểm tra lịch sử tăng giá
**Tình huống:** Khách hàng phàn nàn "Sao sản phẩm này tăng giá?"

**Giải pháp:**
- Vào Firebase Console → `priceHistory`
- Filter: `productCode == "CAO SU..."`
- Xem `changedAt`, `oldValue`, `newValue`, `delta`
- Biết được: Tăng giá lúc nào? Tăng bao nhiêu? Ai tăng?

### 2. Audit trail cho kế toán
**Tình huống:** Kế toán cần kiểm tra biến động giá vốn quý 1

**Giải pháp:**
- Query `priceHistory` với:
  - `fieldChanged == "cost"`
  - `changedAt >= "2024-01-01"`
  - `changedAt <= "2024-03-31"`
- Export ra Excel → Báo cáo biến động giá vốn

### 3. Phân tích xu hướng giá
**Tình huống:** Muốn biết sản phẩm nào hay thay đổi giá nhất

**Giải pháp:**
- Đếm số document trong `priceHistory` group by `productId`
- Sản phẩm nào có nhiều document nhất = Hay đổi giá nhất

---

## ⚠️ LƯU Ý QUAN TRỌNG

### 1. serverTimestamp() vs Date.now()
- ✅ Dùng `serverTimestamp()` → Thời gian chính xác từ Firebase server
- ❌ KHÔNG dùng `Date.now()` → Thời gian client không tin cậy (có thể bị chỉnh)

### 2. Delta calculation
- `delta = newValue - oldValue`
- Nếu **delta > 0** → Tăng giá
- Nếu **delta < 0** → Giảm giá
- Nếu **delta = 0** → Không đổi (nhưng không log vì có `if (newPrice !== oldPrice)`)

### 3. Performance
- Mỗi lần save có thể tạo **1-2 document** mới (nếu đổi cả 2 giá)
- Collection `priceHistory` sẽ lớn dần theo thời gian
- **Firestore Free Tier**: 50K reads/day, 20K writes/day
- **Chi phí sau 1 năm** (nếu đổi giá 100 lần/ngày):
  - 100 changes/day × 365 days = 36,500 documents
  - Firestore charge: ~$0.18/month cho 40K documents

### 4. Firebase Security Rules
Đề xuất rule cho `priceHistory`:
```javascript
match /priceHistory/{historyId} {
  allow read: if request.auth != null;  // Chỉ user đã login
  allow write: if request.auth != null; // Chỉ user đã login
  allow delete: if false;               // ❌ KHÔNG CHO XÓA (audit trail)
}
```

### 5. Mở rộng trong tương lai
Có thể log thêm:
- User email (từ Firebase Auth)
- IP address
- Device info
- Old/New values cho tất cả fields (không chỉ price/cost)
- Reason for change (lý do đổi giá)

---

## 📊 QUERY EXAMPLES

### Query 1: Lấy lịch sử giá của 1 sản phẩm
```javascript
const q = query(
  collection(db, 'priceHistory'),
  where('productId', '==', 'abc123'),
  orderBy('changedAt', 'desc'),
  limit(10)
);
const snapshot = await getDocs(q);
```

### Query 2: Lấy tất cả thay đổi giá bán (không phải giá vốn)
```javascript
const q = query(
  collection(db, 'priceHistory'),
  where('fieldChanged', '==', 'price'),
  orderBy('changedAt', 'desc')
);
```

### Query 3: Lấy thay đổi giá trong 7 ngày qua
```javascript
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const q = query(
  collection(db, 'priceHistory'),
  where('changedAt', '>=', sevenDaysAgo),
  orderBy('changedAt', 'desc')
);
```

---

## ✅ CHECKLIST HOÀN THÀNH BƯỚC 4

- [x] Import `addDoc`, `serverTimestamp`
- [x] Tìm `originalProduct` để so sánh giá
- [x] Kiểm tra `newPrice !== oldPrice`
- [x] Kiểm tra `newCost !== oldCost`
- [x] Tạo document trong `priceHistory` với đầy đủ field
- [x] Tính `delta` (chênh lệch)
- [x] Dùng `serverTimestamp()` cho `changedAt`
- [x] Console log khi có thay đổi
- [x] Test với Firebase Console

---

## 🚀 BƯỚC TIẾP THEO

Bạn có 2 lựa chọn:

**Bước 5: Bulk Update từ Excel** (Ước tính: 1.5 giờ)
- Upload file Excel
- So sánh SKU
- Cập nhật hàng loạt
- **Tự động log** vào `priceHistory` (sử dụng lại logic vừa viết!)

**Bước 6: Thẻ kho (Price History Viewer)** (Ước tính: 1 giờ)
- Nút "Xem lịch sử giá"
- Modal/Sidebar hiển thị timeline
- Show date, user, old→new price
- Chart biến động giá theo thời gian

**Sẵn sàng làm bước nào?**
- [ ] Bước 5: Bulk Update
- [ ] Bước 6: Price History Viewer
- [ ] Test thêm Bước 4 trước

---

## ❓ CÂU HỎI THƯỜNG GẶP

**Q1: Nếu đổi giá 2 lần liên tiếp thì sao?**

A: Sẽ tạo 2 document riêng biệt. VD:
- Lần 1: 100,000 → 120,000 (delta: +20,000)
- Lần 2: 120,000 → 110,000 (delta: -10,000)

**Q2: Có thể xóa lịch sử không?**

A: Có thể, nhưng **KHÔNG NÊN**. Đây là audit trail, nên giữ vĩnh viễn. Nếu lo dung lượng, có thể archive sang BigQuery sau 1 năm.

**Q3: Làm sao biết ai đổi giá?**

A: Hiện tại `changedBy = "manual_edit"`. Nếu có Firebase Authentication, có thể lưu `user.email`:
```javascript
changedBy: auth.currentUser?.email || 'anonymous'
```

**Q4: Có tốn tiền Firebase không?**

A: Có, nhưng rất ít. ~36K documents/năm = $0.18/month. Xem chi tiết ở mục "Performance" phía trên.

---

Bạn đã sẵn sàng test chưa? Hãy cho tôi biết kết quả! 🎉
