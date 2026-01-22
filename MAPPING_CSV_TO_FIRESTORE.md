# BẢNG MAPPING: CSV → FIRESTORE

## So sánh cột CSV với trường trong Firestore

| STT | Cột trong CSV | Trường trong Firestore | Kiểu dữ liệu | Ghi chú |
|-----|---------------|------------------------|--------------|---------|
| 1 | Loại hàng | `category` | string | Phân loại sản phẩm |
| 2 | Nhóm hàng(3 Cấp) | `group` | string | Nhóm 3 cấp |
| 3 | Mã hàng | `code` | string | **SKU - Mã quan trọng nhất** |
| 4 | Mã vạch | `barcode` | string | Barcode |
| 5 | Tên hàng | `name` | string | Tên sản phẩm |
| 6 | Thương hiệu | `brand` | string | Nhãn hiệu |
| 7 | Giá bán | `price` | number | Giá bán lẻ (VND) |
| 8 | Giá vốn | `cost` | number | **Giá nhập - Nhạy cảm** |
| 9 | Tồn kho | `stock` | number | Số lượng tồn hiện tại |
| 10 | KH đặt | `customerOrder` | number | Số lượng khách đặt |
| 11 | Dự kiến hết hàng | `expectedOutOfStock` | string | Ngày dự kiến hết |
| 12 | Tồn nhỏ nhất | `stockMin` | number | Mức tồn tối thiểu |
| 13 | Tồn lớn nhất | `stockMax` | number | Mức tồn tối đa |
| 14 | ĐVT | `unit` | string | Đơn vị tính (cái, bộ, kg...) |
| 15 | Mã ĐVT Cơ bản | `unitCodeBase` | string | Mã đơn vị cơ bản |
| 16 | Quy đổi | `conversionRate` | string | Tỷ lệ quy đổi |
| 17 | Thuộc tính | `attributes` | string | **Thông số kỹ thuật** |
| 18 | Mã HH Liên quan | `relatedProductCode` | string | Mã sản phẩm liên quan |
| 19 | Hình ảnh (url1,url2...) | `imageUrls` | string | URLs hình ảnh |
| 20 | Trọng lượng | `weight` | number | Khối lượng (kg) |
| 21 | Đang kinh doanh | `isActive` | boolean | 1=đang bán, 0=ngừng |
| 22 | Được bán trực tiếp | `canSellDirect` | boolean | 1=có, 0=không |
| 23 | Mô tả | `description` | string | Mô tả chi tiết |
| 24 | Mẫu ghi chú | `noteTemplate` | string | Template ghi chú |
| 25 | Vị trí | `location` | string | Vị trí trong kho |
| 26 | Hàng thành phần | `components` | string | Thành phần cấu tạo |

## Trường tự động thêm (không có trong CSV)

| Trường | Kiểu | Giá trị | Mục đích |
|--------|------|---------|----------|
| `createdAt` | timestamp | Thời điểm import | Ngày tạo |
| `updatedAt` | timestamp | Thời điểm import | Ngày cập nhật |
| `updatedBy` | string | "system_import" | Người cập nhật |

## Ví dụ 1 document trong Firestore

```javascript
// Document ID: CAO_SU_GIAM_CHAN_140A_OEM_TAIWAN
{
  // Thông tin cơ bản
  code: "CAO SU GIAM CHAN 140A OEM TAIWAN",
  name: "Cao su giảm chấn 140A - OEM -TAIWAN",
  barcode: "",
  brand: "",
  category: "Hàng hóa",
  group: "CAO SU GIẢM CHẤN PL",

  // Giá cả
  price: 0,
  cost: 1500000,

  // Tồn kho
  stock: 0,
  stockMin: 0,
  stockMax: 0,
  customerOrder: 0,
  expectedOutOfStock: "0 ngày",

  // Đơn vị
  unit: "Cái",
  unitCodeBase: "",
  conversionRate: "1",

  // Thông tin chi tiết
  attributes: "NHÀ CUNG CẤP:Phúc Long",
  description: "",
  location: "",

  // Thông tin bổ sung
  relatedProductCode: "",
  imageUrls: "",
  weight: 0,
  isActive: true,
  canSellDirect: true,
  noteTemplate: "",
  components: "",

  // Metadata
  createdAt: Timestamp(2026-01-18 12:30:45),
  updatedAt: Timestamp(2026-01-18 12:30:45),
  updatedBy: "system_import"
}
```

## Xử lý dữ liệu đặc biệt

### 1. Giá trị rỗng
- **String rỗng** → `""`
- **Số rỗng** → `0`
- **Boolean rỗng** → `false`

### 2. Chuyển đổi kiểu
- **Số có dấu phẩy**: "1,500,000" → 1500000
- **Boolean**: "1" → true, "0" → false

### 3. Document ID
- Lấy từ cột "Mã hàng"
- Loại bỏ ký tự đặc biệt, chỉ giữ: `a-z A-Z 0-9 _ -`
- Ví dụ: "CAO SU GIAM CHAN 140A OEM TAIWAN" → "CAO_SU_GIAM_CHAN_140A_OEM_TAIWAN"
- Giới hạn 100 ký tự

## Trường quan trọng cho tìm kiếm

Các trường này sẽ được sử dụng trong thuật toán tìm kiếm NLP:

1. **`code`** - Trọng số 10x (tìm chính xác nhất)
2. **`name`** - Trọng số 5x
3. **`attributes`** - Trọng số 4x
4. **`brand`** - Trọng số 3x
5. **`group`** - Trọng số 2x

## Trường nhạy cảm (chỉ Admin xem được)

- **`cost`** (Giá vốn) - Staff KHÔNG được xem

## Tổng kết

- ✅ **26 cột từ CSV** → **29 trường trong Firestore** (thêm 3 trường metadata)
- ✅ **18,426 sản phẩm** sẽ được import
- ✅ Script đã xử lý đúng tất cả kiểu dữ liệu
- ✅ Dữ liệu được làm sạch (loại bỏ dấu phẩy, xử lý giá trị rỗng)
