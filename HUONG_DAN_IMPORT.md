# HƯỚNG DẪN IMPORT DỮ LIỆU LÊN FIREBASE

## ✅ ĐÃ KIỂM TRA

File CSV của bạn có **18,426 sản phẩm** với các cột sau:

1. Loại hàng
2. Nhóm hàng(3 Cấp)
3. Mã hàng
4. Mã vạch
5. Tên hàng
6. Thương hiệu
7. Giá bán
8. Giá vốn
9. Tồn kho
10. KH đặt
11. Dự kiến hết hàng
12. Tồn nhỏ nhất
13. Tồn lớn nhất
14. ĐVT
15. Mã ĐVT Cơ bản
16. Quy đổi
17. Thuộc tính
18. Mã HH Liên quan
19. Hình ảnh (url1,url2...)
20. Trọng lượng
21. Đang kinh doanh
22. Được bán trực tiếp
23. Mô tả
24. Mẫu ghi chú
25. Vị trí
26. Hàng thành phần

✅ Script `importCSV.js` đã được tạo với mapping đúng các cột này!

---

## BƯỚC 1: LẤY FIREBASE CONFIG

1. Mở trình duyệt, vào: https://console.firebase.google.com
2. Chọn project: **Mini-ERP-Warehouse**
3. Click vào biểu tượng **⚙️ (Settings)** → **Project settings**
4. Cuộn xuống phần **"Your apps"**
5. Nếu chưa có app web:
   - Click biểu tượng **</>** (Web)
   - Đặt nickname: `Mini-ERP-Web`
   - **KHÔNG** tích "Also set up Firebase Hosting"
   - Click **Register app**
6. Bạn sẽ thấy đoạn code như này:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "mini-erp-warehouse.firebaseapp.com",
  projectId: "mini-erp-warehouse",
  storageBucket: "mini-erp-warehouse.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

7. **COPY** toàn bộ các giá trị này

---

## BƯỚC 2: CẬP NHẬT FILE IMPORT

1. Mở VS Code
2. Mở file: `scripts/importCSV.js`
3. Tìm dòng **13-18** (phần firebaseConfig)
4. **THAY THẾ** các giá trị `YOUR_API_KEY`, `YOUR_MESSAGING_SENDER_ID`, `YOUR_APP_ID`
   bằng giá trị thực từ Firebase Console

**Ví dụ**:

TRƯỚC KHI SỬA:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "mini-erp-warehouse.firebaseapp.com",
  projectId: "mini-erp-warehouse",
  storageBucket: "mini-erp-warehouse.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

SAU KHI SỬA (ví dụ):
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC1234567890abcdefghijklmnop",
  authDomain: "mini-erp-warehouse.firebaseapp.com",
  projectId: "mini-erp-warehouse",
  storageBucket: "mini-erp-warehouse.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

5. **LƯU FILE**: `Ctrl + S` (Windows) hoặc `Cmd + S` (Mac)

---

## BƯỚC 3: CÀI PACKAGE BỔ SUNG

Mở Terminal trong VS Code và chạy lệnh:

```bash
npm install papaparse
```

Đợi cài đặt xong.

---

## BƯỚC 4: CẬP NHẬT package.json

1. Mở file `package.json`
2. Thêm dòng sau vào đầu file (sau dòng `{`):

```json
{
  "type": "module",
  ...
```

**Ví dụ đầy đủ**:
```json
{
  "type": "module",
  "name": "mini-erp-frontend",
  "private": true,
  "version": "0.0.0",
  ...
}
```

3. **LƯU FILE**

---

## BƯỚC 5: CHẠY IMPORT

1. Mở Terminal trong VS Code
2. Chạy lệnh:

```bash
node scripts/importCSV.js
```

3. Bạn sẽ thấy:

```
FIREBASE CSV IMPORT TOOL
============================================================

Bat dau doc file CSV...

Doc file thanh cong!

Tim thay 18426 san pham trong file CSV

Bat dau import len Firestore...

Da import 100/18426 san pham (0.5%)
Da import 200/18426 san pham (1.1%)
Da import 300/18426 san pham (1.6%)
...
```

4. **Đợi cho đến khi hoàn thành** (có thể mất 15-30 phút)

---

## BƯỚC 6: KIỂM TRA KẾT QUẢ

1. Mở: https://console.firebase.google.com
2. Chọn project: **Mini-ERP-Warehouse**
3. Menu bên trái → **Firestore Database**
4. Bạn sẽ thấy collection **products** với ~18,426 documents
5. Click vào 1 document bất kỳ để xem chi tiết

**Ví dụ cấu trúc dữ liệu**:
```
products/
  CAO_SU_GIAM_CHAN_140A_OEM_TAIWAN/
    code: "CAO SU GIAM CHAN 140A OEM TAIWAN"
    name: "Cao su giảm chấn 140A - OEM -TAIWAN"
    brand: ""
    category: "Hàng hóa"
    group: "CAO SU GIẢM CHẤN PL"
    price: 0
    cost: 1500000
    stock: 0
    unit: "Cái"
    attributes: "NHÀ CUNG CẤP:Phúc Long"
    ...
```

---

## XỬ LÝ LỖI

### Lỗi 1: "Cannot find module 'papaparse'"
**Giải pháp**:
```bash
npm install papaparse
```

### Lỗi 2: "SyntaxError: Cannot use import statement outside a module"
**Giải pháp**: Thêm `"type": "module"` vào `package.json` (xem Bước 4)

### Lỗi 3: "Permission denied" khi ghi Firestore
**Giải pháp**: Cập nhật Firestore Rules

1. Vào Firebase Console → Firestore Database → Rules
2. Sửa thành:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
3. Click **Publish**
4. Chạy lại script import

### Lỗi 4: File CSV không tìm thấy
**Giải pháp**: Kiểm tra đường dẫn trong `importCSV.js` dòng 42:

```javascript
const csvPath = '/Users/jade/Documents/Màn hình nền/Mini-ERP/Mini-ERP-Data/Processed/MASTER_PRODUCT_DATA.csv';
```

Đảm bảo đường dẫn chính xác.

---

## SAU KHI IMPORT THÀNH CÔNG

Bạn đã hoàn thành **Giai đoạn 5**! 🎉

**Tiếp theo**: Xây dựng giao diện tìm kiếm thông minh

Hãy báo cho tôi khi import xong để tiếp tục!
