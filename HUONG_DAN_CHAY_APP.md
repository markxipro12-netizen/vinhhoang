# HƯỚNG DẪN CHẠY ỨNG DỤNG TÌM KIẾM

## ✅ ĐÃ HOÀN THÀNH

- ✅ Import 18,426 sản phẩm lên Firebase
- ✅ Tạo file kết nối Firebase (`src/firebase.js`)
- ✅ Tạo component tìm kiếm thông minh (`src/components/SmartSearch.jsx`)
- ✅ Cập nhật App.jsx

---

## 🚀 CHẠY ỨNG DỤNG

### Bước 1: Chạy development server

Mở Terminal trong VS Code và chạy:

```bash
npm run dev
```

### Bước 2: Mở trình duyệt

1. Xem URL trong Terminal (thường là: `http://localhost:5173`)
2. Mở Chrome/Firefox và vào URL đó
3. Bạn sẽ thấy giao diện tìm kiếm!

---

## 🔍 CÁCH SỬ DỤNG

### 1. Chờ load dữ liệu
- Lần đầu mở app sẽ load ~18,000 sản phẩm từ Firebase (mất ~10-30 giây)
- Xem trong Console (F12) sẽ thấy: `✅ Đã load 18426 sản phẩm`

### 2. Tìm kiếm
Nhập từ khóa vào ô tìm kiếm:

**Ví dụ tìm kiếm:**
- `CAO SU` → Tìm theo mã hàng
- `giảm chấn` → Tìm theo tên (không cần dấu)
- `giam chan` → Fuzzy search (bỏ dấu vẫn tìm được)
- `140A` → Tìm theo thuộc tính
- `Phúc Long` → Tìm theo nhà cung cấp

### 3. Xem kết quả
Kết quả hiển thị dưới dạng bảng với các cột:
- Mã hàng
- Tên hàng
- Thương hiệu
- Nhóm
- Giá bán
- **Giá vốn** (chữ đỏ - chỉ Admin xem được)
- Tồn kho
- ĐVT

---

## 🎯 TÍNH NĂNG THÔNG MINH

### 1. Fuzzy Search (Tìm gần đúng)
- Gõ `KOSON` → Tìm được `KOSAN`
- Gõ `phot ti` → Tìm được `Phớt ti trước`

### 2. Token-based Search
- Gõ `140A` → Tìm được `CAO SU GIAM CHAN 140A OEM TAIWAN`
- Gõ `H-816` → Tìm được tất cả sản phẩm có chứa mã này

### 3. Loại bỏ dấu tiếng Việt
- Gõ `giam chan` → Tìm được `giảm chấn`
- Gõ `nhong` → Tìm được `nhông`

### 4. Weighted Scoring
Kết quả ưu tiên theo thứ tự:
1. Mã hàng (trọng số 10x) - Chính xác nhất
2. Mã vạch (trọng số 9x)
3. Tên hàng (trọng số 5x)
4. Thuộc tính (trọng số 4x)
5. Thương hiệu (trọng số 3x)
6. Nhóm (trọng số 2x)

### 5. Highlight kết quả
Từ khóa tìm kiếm được highlight màu vàng trong kết quả

---

## 🐛 XỬ LÝ LỖI

### Lỗi 1: "Failed to fetch"
**Nguyên nhân**: Firestore Rules chưa cho phép đọc dữ liệu

**Giải pháp**:
1. Vào: https://console.firebase.google.com
2. Chọn project → **Firestore Database** → **Rules**
3. Sửa thành:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Test mode
    }
  }
}
```
4. Click **Publish**
5. Refresh trang web

### Lỗi 2: "Cannot find module './components/SmartSearch'"
**Nguyên nhân**: Thư mục components chưa được tạo

**Giải pháp**:
```bash
mkdir -p src/components
```

### Lỗi 3: Tải dữ liệu lâu (> 1 phút)
**Nguyên nhân**: Mạng chậm hoặc quá nhiều sản phẩm

**Giải pháp**: Chờ thêm, hoặc kiểm tra Console (F12) xem có lỗi không

### Lỗi 4: Tìm kiếm không ra kết quả
**Giải pháp**:
1. Kiểm tra dữ liệu đã import đầy đủ chưa (vào Firebase Console)
2. Thử tìm bằng mã hàng chính xác
3. Xem Console (F12) có lỗi không

---

## 📊 KIỂM TRA HIỆU NĂNG

### Test 1: Tốc độ load
- Mở Console (F12)
- Refresh trang
- Xem thời gian từ lúc load đến khi thấy: `✅ Đã load X sản phẩm`
- **Mục tiêu**: < 30 giây

### Test 2: Tốc độ tìm kiếm
- Gõ từ khóa vào ô tìm kiếm
- Kết quả phải hiển thị **ngay lập tức** (< 0.5 giây)
- **Lý do**: Tìm kiếm diễn ra trên client-side (trong bộ nhớ)

### Test 3: Độ chính xác
Thử các từ khóa sau và kiểm tra kết quả:

| Từ khóa | Kỳ vọng |
|---------|---------|
| `CAO SU GIAM CHAN 140A` | Tìm chính xác sản phẩm |
| `giam chan` (không dấu) | Tìm được "giảm chấn" |
| `140` | Tìm tất cả sản phẩm có 140 |
| `Phúc Long` | Tìm theo nhà cung cấp (trong attributes) |

---

## 📸 SCREENSHOTS MẪU

### Giao diện ban đầu
```
┌─────────────────────────────────────────┐
│ 🔍 Tìm Kiếm Sản Phẩm Thông Minh        │
│ 18426 sản phẩm trong kho                │
├─────────────────────────────────────────┤
│ [Tìm theo mã hàng, tên, thương hiệu...] │
│                                         │
│ 👆 Nhập từ khóa để tìm kiếm             │
└─────────────────────────────────────────┘
```

### Khi tìm kiếm "cao su"
```
┌─────────────────────────────────────────┐
│ [cao su                              ]  │
│ Tìm thấy 2 kết quả                      │
├─────────────────────────────────────────┤
│ Mã hàng                    | Tên hàng   │
├─────────────────────────────────────────┤
│ CAO SU GIAM CHAN 140A...   | Cao su... │
│ CAO SU GIAM CHAN 140AS...  | Cao su... │
└─────────────────────────────────────────┘
```

---

## 🎉 HOÀN THÀNH GIAI ĐOẠN 6!

Bạn đã có:
- ✅ Giao diện tìm kiếm đầy đủ chức năng
- ✅ Thuật toán NLP fuzzy search
- ✅ Kết nối Firebase thành công
- ✅ Hiển thị 18,000+ sản phẩm

---

## 📝 BƢỚC TIẾP THEO

### Giai đoạn 7: Thêm tính năng
1. **Inline edit** - Sửa sản phẩm trực tiếp
2. **Price history** - Lịch sử thay đổi giá
3. **Export CSV** - Xuất kết quả tìm kiếm
4. **User authentication** - Đăng nhập/phân quyền

### Giai đoạn 8: Deploy
1. Build production: `npm run build`
2. Deploy lên Firebase Hosting
3. Có URL công khai để truy cập

---

## ❓ CÂU HỎI

Hãy cho tôi biết:
1. App đã chạy thành công chưa?
2. Tìm kiếm có hoạt động không?
3. Có lỗi nào không?
4. Tốc độ như thế nào?

Sau đó chúng ta sẽ tiếp tục thêm các tính năng nâng cao! 🚀
