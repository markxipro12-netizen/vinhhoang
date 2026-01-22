# ✅ BƯỚC 2 HOÀN THÀNH: INLINE EDIT

## 🎉 ĐÃ LÀM GÌ?

Đã bổ sung tính năng **Inline Edit** vào `SmartSearch.jsx` - cho phép sửa trực tiếp sản phẩm ngay trên giao diện!

---

## ✨ TÍNH NĂNG MỚI

### 1. ✅ Nút "Sửa" trên mỗi card
- Nút màu cam với icon ✏️
- Khi click → Card chuyển sang chế độ Edit

### 2. ✅ Chế độ Edit
- Badge "✏️ ĐANG SỨA" nhấp nháy (animate-pulse)
- Border card đổi màu cam với ring effect
- Tất cả field quan trọng chuyển thành input:
  - **Tên sản phẩm** (input text)
  - **Mã hàng** (input text với font-mono)
  - **Giá bán** (input number - border xanh)
  - **Giá vốn** (input number - border đỏ)
  - **Tồn kho** (input number - border xanh lá)
  - **Thuộc tính** (textarea 2 dòng)

### 3. ✅ Nút Save/Cancel
- **Nút "Lưu thay đổi"** (xanh lá) - Cập nhật lên Firebase
- **Nút "Hủy"** (xám) - Hủy bỏ thay đổi
- Disable khi đang lưu (có loading state)

### 4. ✅ Firebase Integration
- Cập nhật Firestore với `updateDoc()`
- Tự động cập nhật local state
- Không cần refresh trang
- Console log "✅ Đã lưu thành công!"

---

## 🎨 GIAO DIỆN

### Chế độ thường (View Mode)
```
┌──────────────────────────────────────────────────────┐
│ [TOP 1]                                              │
│ Cao su giảm chấn 140A - OEM - TAIWAN    100,000 đ   │
│ [Mã: CAO SU...] [Brand] [Nhóm]         Vốn: 50,000đ │
│                                                      │
│ [Xem chi tiết]              [✏️ Sửa]                 │
└──────────────────────────────────────────────────────┘
```

### Chế độ Edit
```
┌──────────────────────────────────────────────────────┐
│ ✏️ ĐANG SỬA                                          │
│ ┌────────────────────────┐  ┌──────────────┐        │
│ │ Tên sản phẩm           │  │ Giá bán      │        │
│ │ [Cao su giảm chấn...] │  │ [100000]     │        │
│ └────────────────────────┘  └──────────────┘        │
│ ┌────────────────────────┐  ┌──────────────┐        │
│ │ Mã hàng                │  │ Giá vốn      │        │
│ │ [CAO SU GIAM CHAN...] │  │ [50000]      │        │
│ └────────────────────────┘  └──────────────┘        │
│ ┌────────────────────────┐  ┌──────────────┐        │
│ │ Thuộc tính             │  │ Tồn kho      │        │
│ │ [NHÀ CUNG CẤP:...]    │  │ [100]        │        │
│ └────────────────────────┘  └──────────────┘        │
│                                                      │
│ [💾 Lưu thay đổi]              [✖ Hủy]              │
└──────────────────────────────────────────────────────┘
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
- Chọn 1 sản phẩm bất kỳ

### Bước 3: Click nút "Sửa"
- Card sẽ đổi màu cam, border ring effect
- Badge "✏️ ĐANG SỬA" xuất hiện
- Tất cả field chuyển thành input

### Bước 4: Sửa dữ liệu
**Test case 1: Sửa tên sản phẩm**
- Đổi tên từ "Cao su giảm chấn 140A" → "Cao su giảm chấn 140A (Updated)"

**Test case 2: Sửa giá**
- Đổi giá bán từ 100,000 → 120,000
- Đổi giá vốn từ 50,000 → 60,000

**Test case 3: Sửa tồn kho**
- Đổi tồn kho từ 100 → 150

**Test case 4: Sửa thuộc tính**
- Thêm text vào cuối: "...;MÀU:ĐEN"

### Bước 5: Lưu thay đổi
- Click nút "💾 Lưu thay đổi"
- Nút hiển thị "Đang lưu..."
- Sau 1-2 giây → Quay về chế độ xem
- Dữ liệu mới được hiển thị

### Bước 6: Kiểm tra Firebase
- Vào Firebase Console: https://console.firebase.google.com
- Chọn project: mini-erp-warehouse-6528e
- Vào Firestore Database → Collection `products`
- Tìm sản phẩm vừa sửa → Xem dữ liệu đã được cập nhật

### Bước 7: Test nút Hủy
- Click "Sửa" lại lần nữa
- Thay đổi dữ liệu bất kỳ
- Click "Hủy"
- Dữ liệu trở về như cũ (không lưu)

---

## 🔧 CODE CHANGES

### File đã sửa: `src/components/SmartSearch.jsx`

#### 1. Import thêm icons
```javascript
import { Edit3, Save, X } from 'lucide-react';
```

#### 2. Import Firebase updateDoc
```javascript
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
```

#### 3. Thêm state
```javascript
const [editingId, setEditingId] = useState(null); // ID sản phẩm đang edit
const [editForm, setEditForm] = useState({}); // Dữ liệu tạm khi đang edit
const [saving, setSaving] = useState(false); // Đang lưu lên Firebase
```

#### 4. Hàm startEdit
```javascript
const startEdit = (product) => {
  setEditingId(product.id);
  setEditForm({
    code: product.code || '',
    name: product.name || '',
    price: product.price || 0,
    cost: product.cost || 0,
    stock: product.stock || 0,
    attributes: product.attributes || ''
  });
};
```

#### 5. Hàm cancelEdit
```javascript
const cancelEdit = () => {
  setEditingId(null);
  setEditForm({});
};
```

#### 6. Hàm saveEdit (cập nhật Firebase)
```javascript
const saveEdit = async (productId) => {
  try {
    setSaving(true);

    // Cập nhật Firestore
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      code: editForm.code,
      name: editForm.name,
      price: parseFloat(editForm.price) || 0,
      cost: parseFloat(editForm.cost) || 0,
      stock: parseFloat(editForm.stock) || 0,
      attributes: editForm.attributes
    });

    // Cập nhật local state
    setProducts(prev => prev.map(p =>
      p.id === productId
        ? { ...p, ...editForm, price: parseFloat(editForm.price), cost: parseFloat(editForm.cost), stock: parseFloat(editForm.stock) }
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

#### 7. Conditional rendering trong card
- Kiểm tra `isEditing = editingId === product.id`
- Nếu đang edit → Hiển thị input
- Nếu không → Hiển thị text thường

#### 8. Nút Edit/Save/Cancel
```javascript
{isEditing ? (
  <>
    <button onClick={() => saveEdit(product.id)} disabled={saving}>
      Lưu thay đổi
    </button>
    <button onClick={cancelEdit} disabled={saving}>
      Hủy
    </button>
  </>
) : (
  <>
    <button onClick={() => toggleExpand(product.id)}>
      Xem chi tiết
    </button>
    <button onClick={() => startEdit(product)}>
      Sửa
    </button>
  </>
)}
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

### 1. Chỉ edit 1 sản phẩm tại 1 thời điểm
- `editingId` là single ID (không phải array)
- Khi click "Sửa" sản phẩm khác → Tự động hủy edit hiện tại

### 2. Dữ liệu được validate
- `parseFloat()` cho price, cost, stock
- Nếu giá trị rỗng → Mặc định = 0

### 3. Firebase Security Rules
Đảm bảo Firebase Rules cho phép update:
```javascript
match /products/{productId} {
  allow read: if true;
  allow write: if request.auth != null; // Chỉ user đã login
}
```

### 4. Performance
- Không cần refetch toàn bộ products sau khi update
- Chỉ update local state → UI update ngay lập tức

---

## ✅ CHECKLIST HOÀN THÀNH BƯỚC 2

- [x] Thêm state `editingId`, `editForm`, `saving`
- [x] Tạo hàm `startEdit`, `cancelEdit`, `saveEdit`
- [x] Input cho: Tên, Mã, Giá bán, Giá vốn, Tồn, Thuộc tính
- [x] Nút Edit/Save/Cancel với icon đẹp
- [x] Badge "ĐANG SỬA" với animate-pulse
- [x] Border ring effect màu cam khi edit
- [x] Update Firestore với `updateDoc()`
- [x] Update local state không cần refresh
- [x] Disable buttons khi đang lưu
- [x] Console log success/error

---

## 🚀 BƯỚC TIẾP THEO

**Bước 3: Phóng to Giá vốn (luôn)** (Ước tính: 15 phút)

Tính năng:
- Giá vốn luôn hiển thị **CỰC LỚN** (font-size: 3rem hoặc 4rem)
- Màu đỏ nổi bật
- Luôn nằm bên phải, dễ nhìn
- Không phụ thuộc vào hover hay expand

**Sẵn sàng làm Bước 3 chưa?**
- [ ] Có, làm Bước 3 ngay
- [ ] Chưa, tôi muốn test thêm Bước 2
- [ ] Có vấn đề cần sửa ở Bước 2

---

## ❓ CÂU HỎI THƯỜNG GẶP

**Q1: Làm sao biết dữ liệu đã lưu lên Firebase?**

A: Mở Console (F12) → Xem log "✅ Đã lưu thành công!". Hoặc vào Firebase Console kiểm tra trực tiếp.

**Q2: Có thể edit nhiều sản phẩm cùng lúc không?**

A: Không. Thiết kế hiện tại chỉ cho phép edit 1 sản phẩm tại 1 thời điểm để tránh nhầm lẫn.

**Q3: Nếu lỗi khi lưu thì sao?**

A: Sẽ hiển thị alert với message lỗi. Dữ liệu edit vẫn còn trong form, bạn có thể sửa và thử lại.

**Q4: Có cần đăng nhập mới edit được không?**

A: Tùy Firebase Rules của bạn. Nếu chưa đăng nhập có thể bị lỗi permission denied.

---

Bạn đã sẵn sàng test chưa? Hãy cho tôi biết kết quả! 🎉
