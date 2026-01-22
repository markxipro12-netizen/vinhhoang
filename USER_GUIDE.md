# 📚 Hướng Dẫn Sử Dụng Mini ERP - Product Management System

## 🎯 Tổng Quan

**Mini ERP** là hệ thống quản lý sản phẩm chuyên nghiệp với khả năng:
- ✅ Tìm kiếm thông minh 18,000+ sản phẩm
- ✅ Chỉnh sửa thông tin trực tiếp (Admin)
- ✅ Theo dõi lịch sử thay đổi đầy đủ
- ✅ Import/Export Excel hàng loạt
- ✅ Phân quyền Admin/Staff

---

## 🔐 Đăng Nhập

### Trang Login
1. Truy cập trang web
2. Nhập **Email** và **Password**
3. Click **Sign In**

### Phân Quyền
- **👑 Admin**: Toàn quyền (edit, view cost, bulk update, audit log)
- **👤 Staff**: Chỉ xem (view products, search, view price history)

> **Lưu ý:** Nếu bạn chưa có tài khoản, liên hệ Admin để được cấp quyền.

---

## 🔍 Tìm Kiếm Sản Phẩm

### Giao Diện Chính
Sau khi đăng nhập, bạn sẽ thấy:
- **Search Bar** ở giữa
- **Mode Toggle**: Fuzzy (cam) / Exact (xanh)
- **Results Count**: Số sản phẩm tìm thấy
- **User Badge**: Email + Role của bạn

### 2 Chế Độ Tìm Kiếm

#### 🧡 Fuzzy Search (Mặc Định)
**Dùng khi:** Tìm gần đúng, không nhớ chính xác

**Ví dụ:**
```
Gõ: "cafe arabica"
→ Tìm thấy: "Cà phê Arabica Premium", "Cafe Robusta Arabica Mix"

Gõ: "phuc log" (sai chính tả)
→ Tìm thấy: "Phúc Long Premium Coffee"
```

**Đặc điểm:**
- ✅ Chấp nhận lỗi chính tả
- ✅ Tìm theo nhiều trường: name, code, brand, attributes
- ✅ Sắp xếp theo độ liên quan (score)

#### 💙 Exact Search
**Dùng khi:** Tìm chính xác theo mã, nhà cung cấp

**Ví dụ:**
```
Gõ: "SP001"
→ Tìm thấy chính xác sản phẩm có code "SP001"

Gõ: "Phúc Long"
→ Chỉ tìm sản phẩm có từ "Phúc Long" trong tên
```

**Đặc điểm:**
- ✅ Kết quả chính xác 100%
- ✅ Nhanh hơn Fuzzy
- ✅ Phù hợp tìm theo code, supplier

### Hiển Thị Kết Quả

Mỗi sản phẩm hiển thị dạng **card** với:
- **Tên sản phẩm** (highlight từ khóa tìm kiếm)
- **Mã sản phẩm** (code)
- **Giá bán** (price) - màu xanh
- **Giá vốn** (cost) - màu đỏ (chỉ Admin)
- **Tồn kho** (stock)
- **Thương hiệu** (brand)
- **Mô tả** (attributes)

### Border Màu Sắc
- 🧡 **Cam**: Card từ Fuzzy search
- 💙 **Xanh**: Card từ Exact search
- 🟡 **Vàng**: Card đang được edit

---

## 📝 Xem Chi Tiết Sản Phẩm

### Show All Details
1. Click nút **"Show All"** ở card sản phẩm
2. Xem **tất cả thông tin** từ database:
   - Code, Name, Price, Cost, Stock
   - Brand, Supplier, Category, Group
   - Attributes, Barcode, Created Date...
3. Click **"Hide"** để thu gọn

> **Tip:** Dùng để kiểm tra đầy đủ thông tin trước khi edit

---

## ✏️ Chỉnh Sửa Sản Phẩm (Admin Only)

### Bước 1: Vào Chế Độ Edit
1. **Hover chuột** lên card sản phẩm
2. Click nút **Edit** (icon bút chì, màu vàng)
3. Card chuyển sang chế độ edit (border vàng)

### Bước 2: Chỉnh Sửa Thông Tin
Có thể sửa các trường:
- ✏️ **Product Code** (mã sản phẩm)
- ✏️ **Product Name** (tên)
- ✏️ **Sale Price** (giá bán) - VND
- ✏️ **Cost Price** (giá vốn) - VND
- ✏️ **Stock** (tồn kho) - số lượng
- ✏️ **Description/Attributes** (mô tả)

### Bước 3: Lưu Thay Đổi
1. Click **"Save Changes"** (nút xanh)
2. Đợi thông báo thành công
3. Thay đổi được **tự động log** vào hệ thống

### Hủy Bỏ
- Click **"Cancel"** (nút xám) để hủy

> **⚠️ Quan Trọng:** Mọi thay đổi đều được ghi lại trong Audit Log với đầy đủ:
> - Trường nào thay đổi
> - Giá trị cũ → mới
> - Người thay đổi
> - Thời gian chính xác

---

## 📊 Xem Lịch Sử Thay Đổi

### Lịch Sử 1 Sản Phẩm

#### Cách 1: Từ Card Sản Phẩm
1. **Hover chuột** lên card
2. Click nút **History** (icon đồng hồ, màu xanh)
3. Xem modal **Change History**

#### Modal Change History
Hiển thị tất cả thay đổi của sản phẩm này:

**🔵 MODIFIED** (Thay đổi text)
```
Product Name changed from
"Cà phê Arabica" → "Cà phê Arabica Premium"
Manual Edit by admin@example.com
```

**🔴 INCREASE** (Tăng giá)
```
Sale Price changed from
150,000 đ → 165,000 đ
Delta: +15,000 đ (10.0%)
Manual Edit by admin@example.com
```

**🟢 DECREASE** (Giảm giá)
```
Cost Price changed from
120,000 đ → 110,000 đ
Delta: -10,000 đ (8.3%)
Excel Import by admin@example.com
```

### Lịch Sử Toàn Hệ Thống (Admin Only)

#### Truy Cập Audit Log
1. Click nút **"Audit Log"** (góc trên bên phải)
2. Xem **System Audit Log** với timeline đầy đủ

#### Filters (Bộ Lọc)
- **Time Range**: 1 ngày → 1 năm
- **Changed By**: Lọc theo user
- **Field Changed**:
  - All Fields
  - Price (Giá bán)
  - Cost (Giá vốn)
  - Stock (Tồn kho)
  - Name (Tên)
  - Code (Mã)
  - Attributes (Mô tả)
- **Max Results**: 50 → 500 records

#### Summary Footer
Xem thống kê nhanh:
- 📊 Total Changes
- 🔴 Increases
- 🟢 Decreases
- 👥 Users Involved

---

## 📤 Bulk Update (Excel Import) - Admin Only

### Chuẩn Bị File Excel

#### Format Required
File Excel phải có **3 cột** (tên tiếng Việt hoặc tiếng Anh):

| Mã hàng | Giá bán | Giá vốn |
|---------|---------|---------|
| SP001   | 150000  | 120000  |
| SP002   | 200000  | 160000  |
| SP003   | 180000  | 145000  |

**Hoặc:**

| code  | price  | cost   |
|-------|--------|--------|
| SP001 | 150000 | 120000 |
| SP002 | 200000 | 160000 |

#### Lưu Ý
- ✅ File .xlsx hoặc .xls
- ✅ Cột "Mã hàng" hoặc "code" là **BẮT BUỘC**
- ✅ Giá không có dấu phẩy, chấm (VD: 150000, không phải 150,000)
- ❌ Không có header phức tạp, merged cells

### Thực Hiện Bulk Update

#### Bước 1: Upload File
1. Click nút **"Bulk Update"** (góc trên bên phải)
2. Chọn file Excel từ máy tính
3. Đợi xử lý (5-30 giây tùy số lượng)

#### Bước 2: Xem Kết Quả
Banner hiển thị:
```
Total Rows: 500
Updated: 485
Not Found: 15
Price Changes: 320
```

**Giải thích:**
- **Total Rows**: Tổng dòng trong Excel
- **Updated**: Số sản phẩm cập nhật thành công
- **Not Found**: Số mã hàng không tìm thấy trong database
- **Price Changes**: Số thay đổi giá được ghi log

#### Bước 3: Kiểm Tra Audit Log
- Tất cả thay đổi được log với `source: "Excel Import"`
- Xem chi tiết trong **Audit Log**

---

## 🎨 Giao Diện & Ký Hiệu

### Icon & Màu Sắc

#### Icons
- 🔍 **Search** - Tìm kiếm
- ⚡ **Zap** - Fuzzy mode
- 🎯 **Target** - Exact mode
- ✏️ **Edit3** - Chỉnh sửa
- 🕐 **History** - Lịch sử
- 📊 **FileText** - Audit log
- 📤 **Upload** - Bulk update
- 🚪 **LogOut** - Đăng xuất

#### Badges
- 🟡 **ADMIN** - Quản trị viên (vàng)
- 🔵 **STAFF** - Nhân viên (xanh)

#### Change Indicators
- 🔴 **INCREASE** - Tăng giá trị (đỏ)
- 🟢 **DECREASE** - Giảm giá trị (xanh lá)
- 🔵 **MODIFIED** - Thay đổi text (xanh dương)

### Keyboard Shortcuts
Hiện tại chưa có shortcuts, sử dụng chuột.

---

## ❓ Câu Hỏi Thường Gặp (FAQ)

### Q1: Tại sao tôi không thấy nút Edit?
**A:** Chỉ có **Admin** mới có quyền edit. Kiểm tra badge của bạn (góc trên phải).

### Q2: Tìm kiếm bị lag khi gõ nhanh?
**A:** Hệ thống dùng debouncing 300ms. Kết quả sẽ hiện sau khi bạn dừng typing 0.3 giây.

### Q3: Tại sao không thấy Cost Price?
**A:** Cost Price (giá vốn) chỉ hiển thị với **Admin**. Staff không xem được.

### Q4: Làm sao biết ai đã sửa sản phẩm?
**A:** Click **History** button hoặc vào **Audit Log** để xem chi tiết người sửa, thời gian, và nội dung thay đổi.

### Q5: Bulk Update bị lỗi "Not Found"?
**A:** Mã hàng trong Excel không tồn tại trong database. Kiểm tra lại:
- Đúng cột "Mã hàng" hoặc "code"
- Không có khoảng trắng thừa
- Code khớp 100% với database

### Q6: Có thể xóa sản phẩm không?
**A:** Hiện tại chưa có tính năng xóa. Liên hệ Admin nếu cần.

### Q7: Có thể export danh sách sản phẩm ra Excel không?
**A:** Hiện tại chưa có tính năng export. Đang trong roadmap.

### Q8: Tìm kiếm có phân biệt dấu không?
**A:** Không. Hệ thống tự động bỏ dấu tiếng Việt khi tìm kiếm.
```
Gõ: "cafe" → Tìm thấy "Cà phê"
Gõ: "phuong" → Tìm thấy "Phương"
```

### Q9: Có giới hạn số sản phẩm tìm kiếm không?
**A:** Hiển thị tối đa **50 kết quả** tốt nhất. Nếu thấy "(showing top 50)", hãy search cụ thể hơn.

### Q10: Lịch sử thay đổi lưu bao lâu?
**A:** Vĩnh viễn. Tất cả thay đổi được lưu trong Firebase, không tự động xóa.

---

## 🛡️ Bảo Mật & Quyền Riêng Tư

### Phân Quyền Nghiêm Ngặt
- ✅ Staff **KHÔNG** được:
  - Edit sản phẩm
  - Xem giá vốn (cost)
  - Bulk update
  - Xem audit log toàn hệ thống
- ✅ Admin được **toàn quyền**

### Audit Trail
Mọi thay đổi đều được ghi lại:
- ✅ Ai thay đổi (email)
- ✅ Thay đổi gì (field + old → new value)
- ✅ Khi nào (timestamp chính xác)
- ✅ Từ đâu (Manual Edit / Excel Import)

### Firebase Security
- ✅ Dữ liệu được bảo vệ bằng Firebase Security Rules
- ✅ Chỉ authenticated users mới truy cập được
- ✅ Role-based access control

---

## 📞 Hỗ Trợ

### Gặp Vấn Đề?
1. **Refresh trang** (Ctrl+Shift+R / Cmd+Shift+R)
2. **Clear cache** của browser
3. **Đăng xuất** và đăng nhập lại

### Liên Hệ
- 📧 Email: [admin@yourcompany.com]
- 📱 Hotline: [0123-456-789]
- 💬 Slack: [#mini-erp-support]

### Báo Lỗi
Khi báo lỗi, cung cấp:
- ✅ Email đăng nhập
- ✅ Screenshot lỗi
- ✅ Mô tả chi tiết bước tái hiện
- ✅ Browser & OS version

---

## 🚀 Tips & Tricks

### Tìm Kiếm Hiệu Quả
1. **Dùng Fuzzy** cho tìm kiếm chung
2. **Dùng Exact** khi biết chính xác code
3. **Gõ từ khóa đặc trưng** (brand, code prefix)
4. **Kết hợp nhiều từ** để lọc chính xác hơn

### Quản Lý Nhanh
1. **Hover để thấy actions** (Edit, History)
2. **Show All** trước khi edit (kiểm tra info)
3. **Xem History** sau khi edit (verify changes)

### Bulk Update Tốt Nhất
1. **Backup file Excel** trước khi update
2. **Test với 5-10 items** trước
3. **Kiểm tra "Not Found"** và fix file
4. **Verify trong Audit Log** sau khi xong

---

## 🎓 Tutorial Video

*(Nếu có video hướng dẫn, thêm link ở đây)*

---

## 📄 Changelog

### Version 2.0 (2026-01-22)
- ✨ Comprehensive Audit Logging (log tất cả fields)
- ✨ Debouncing cho search (tối ưu performance)
- 🐛 Fix React Hooks error
- 🐛 Fix Firebase Timestamp render crash
- 🎨 Improved UI/UX

### Version 1.0 (Initial)
- ✅ Basic search & filter
- ✅ Inline editing
- ✅ Price history
- ✅ Bulk update
- ✅ Role-based access

---

**🎉 Chúc bạn sử dụng hiệu quả!**

*Tài liệu này được cập nhật lần cuối: 2026-01-22*
