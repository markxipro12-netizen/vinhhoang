# Hướng dẫn tạo Firebase Composite Indexes

## Tổng quan
Sau khi cập nhật hệ thống audit logging, bạn cần tạo các Composite Indexes trong Firebase Firestore để các query có thể hoạt động hiệu quả.

## Collection đã thay đổi
- **TÊN CŨ:** `priceHistory`
- **TÊN MỚI:** `auditLog`

## Các indexes cần tạo

### 1. Index cho Product History (SmartSearch.jsx - viewHistory function)
Cho phép xem lịch sử thay đổi của 1 sản phẩm cụ thể.

**Collection:** `auditLog`

**Fields to index:**
- `productId` (Ascending)
- `changedAt` (Descending)

**Query scope:** Collection

### 2. Index cho Global Audit Log (AuditLog.jsx - fetchHistory function)
Cho phép xem tất cả thay đổi trong hệ thống, sắp xếp theo thời gian.

**Collection:** `auditLog`

**Fields to index:**
- `changedAt` (Descending)

**Query scope:** Collection

## Cách tạo indexes

### Cách 1: Tạo tự động (KHUYẾN NGHỊ)
1. Chạy ứng dụng và thực hiện các thao tác:
   - Click vào nút "View History" của 1 sản phẩm
   - Click vào "System Audit Log"

2. Khi gặp lỗi, Firebase sẽ hiển thị link tạo index:
   ```
   The query requires an index. You can create it here:
   https://console.firebase.google.com/...
   ```

3. Click vào link và nhấn "Create Index"

4. Đợi Firebase build index (thường 5-15 phút)

### Cách 2: Tạo thủ công
1. Truy cập [Firebase Console](https://console.firebase.google.com/)

2. Chọn project của bạn

3. Vào **Firestore Database** → **Indexes** tab

4. Nhấn **Create Index**

5. Điền thông tin:
   - **Collection ID:** `auditLog`
   - **Fields:**
     - Field 1: `productId` | Order: Ascending (chỉ cho index #1)
     - Field 2: `changedAt` | Order: Descending
   - **Query scope:** Collection

6. Nhấn **Create**

7. Lặp lại cho index #2 (không có trường `productId`)

### Cách 3: Sử dụng Firebase CLI (cho Developer)
Tạo file `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "auditLog",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "productId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "changedAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "auditLog",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "changedAt",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Deploy indexes:
```bash
firebase deploy --only firestore:indexes
```

## Kiểm tra trạng thái indexes

1. Vào Firebase Console → Firestore Database → Indexes

2. Kiểm tra trạng thái:
   - 🟡 **Building** - Đang tạo index (đợi 5-15 phút)
   - 🟢 **Enabled** - Index đã sẵn sàng sử dụng
   - 🔴 **Error** - Có lỗi (xem chi tiết và tạo lại)

## Migration từ priceHistory sang auditLog

### Tùy chọn 1: Giữ nguyên data cũ (KHUYẾN NGHỊ)
Không cần làm gì. Dữ liệu cũ trong `priceHistory` vẫn được giữ nguyên, nhưng không hiển thị trong UI mới.

**Ưu điểm:**
- An toàn, không mất dữ liệu
- Có thể truy xuất sau nếu cần

**Nhược điểm:**
- Dữ liệu cũ không hiển thị trong Audit Log mới

### Tùy chọn 2: Copy data từ priceHistory sang auditLog
Nếu bạn muốn giữ lại lịch sử cũ trong hệ thống mới:

**Script migration (chạy 1 lần):**
```javascript
// Chạy trong Firebase Console hoặc Cloud Functions
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

async function migrateData() {
  const snapshot = await db.collection('priceHistory').get();

  for (const doc of snapshot.docs) {
    await db.collection('auditLog').doc(doc.id).set(doc.data());
  }

  console.log(`✅ Migrated ${snapshot.size} records`);
}

migrateData();
```

### Tùy chọn 3: Xóa data cũ (KHÔNG KHUYẾN NGHỊ)
Chỉ xóa nếu chắc chắn không cần dữ liệu cũ.

```javascript
// CẢNH BÁO: Không thể khôi phục sau khi xóa!
const snapshot = await db.collection('priceHistory').get();
for (const doc of snapshot.docs) {
  await doc.ref.delete();
}
```

## Troubleshooting

### Lỗi: "The query requires an index"
**Nguyên nhân:** Index chưa được tạo hoặc chưa build xong.

**Giải pháp:**
1. Click vào link trong error message để tạo index
2. Đợi 5-15 phút cho Firebase build index
3. Refresh lại trang

### Lỗi: "Missing or insufficient permissions"
**Nguyên nhân:** Firebase Security Rules chưa cho phép truy cập collection `auditLog`.

**Giải pháp:** Cập nhật Firebase Security Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cho phép đọc/ghi auditLog
    match /auditLog/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### Index building quá lâu (>30 phút)
**Nguyên nhân:** Database lớn hoặc Firebase đang bận.

**Giải pháp:**
1. Đợi thêm (có thể đến vài giờ với database rất lớn)
2. Kiểm tra Firebase Status Page
3. Contact Firebase Support nếu vẫn không xong

## Tính năng mới của Audit Log

Sau khi hoàn tất indexes, bạn sẽ có:

✅ **Log tất cả các trường:**
- Price (Giá bán)
- Cost (Giá vốn) - chỉ admin
- Stock (Tồn kho)
- Name (Tên sản phẩm)
- Code (Mã sản phẩm)
- Attributes (Mô tả/Thuộc tính)

✅ **Hiển thị phân loại:**
- 🔴 INCREASE - Tăng giá trị (numeric fields)
- 🟢 DECREASE - Giảm giá trị (numeric fields)
- 🔵 MODIFIED - Thay đổi text (text fields)

✅ **Filter nâng cao:**
- Time range: 1 ngày → 1 năm
- User filter: Lọc theo người thay đổi
- Field filter: Lọc theo trường cụ thể
- Limit: 50-500 records

✅ **Sources:**
- Manual Edit (Chỉnh sửa thủ công)
- Excel Import (Upload từ Excel)

## Câu hỏi thường gặp

**Q: Tôi có cần xóa index cũ của priceHistory không?**
A: Không bắt buộc, nhưng bạn có thể xóa để dọn dẹp. Index không sử dụng không tốn phí.

**Q: Tôi có bị charge thêm tiền khi tạo indexes không?**
A: Không. Indexes miễn phí. Bạn chỉ trả tiền cho reads/writes/storage.

**Q: Có giới hạn số lượng indexes không?**
A: Firebase cho phép tối đa 200 composite indexes/database (quá đủ).

**Q: Audit log có ảnh hưởng đến performance không?**
A: Có một chút khi save (mỗi field change = 1 write thêm), nhưng không đáng kể. Read performance vẫn nhanh nhờ indexes.

## Liên hệ hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra Firebase Console → Firestore → Indexes
2. Kiểm tra Browser Console để xem error messages
3. Kiểm tra Network tab để xem failed requests
4. Check Firebase Status: https://status.firebase.google.com/

---

**Cập nhật:** 2026-01-22
**Version:** 2.0 - Comprehensive Audit Logging
