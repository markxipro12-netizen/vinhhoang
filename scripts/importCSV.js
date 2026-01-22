// scripts/importCSV.js
// @ts-nocheck
/* eslint-disable */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import Papa from 'papaparse';
import fs from 'fs';
import process from 'process';

// QUAN TRONG: Thay thế bằng firebaseConfig của bạn
// Lấy từ Firebase Console -> Project Settings -> Your apps -> Config
const firebaseConfig = {
  apiKey: "AIzaSyAaYOCRxCc78u2E1CEmvgj6iYD5EqddLhU",
  authDomain: "mini-erp-warehouse-6528e.firebaseapp.com",
  projectId: "mini-erp-warehouse-6528e",
  storageBucket: "mini-erp-warehouse-6528e.firebasestorage.app",
  messagingSenderId: "971786813407",
  appId: "1:971786813407:web:019404c8292492e8e7ce6a",
  measurementId: "G-423MQXSCBV"
};


// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Hàm chuyển đổi giá trị rỗng thành giá trị mặc định
const parseNumber = (value) => {
  if (!value || value === '' || value === '0') return 0;
  const parsed = parseFloat(value.toString().replace(/,/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

const parseString = (value) => {
  return value ? value.toString().trim() : '';
};

// Hàm tạo ID hợp lệ cho Firestore
const createValidId = (code, index) => {
  if (!code || code === '') return `product_${index}`;
  return code.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
};

// Hàm import CSV
async function importCSV() {
  console.log("Bat dau doc file CSV...\n");

  const csvPath = '/Users/jade/Documents/Màn hình nền/Mini-ERP/Mini-ERP-Data/Processed/MASTER_PRODUCT_DATA.csv';

  try {
    const csvData = fs.readFileSync(csvPath, 'utf-8');
    console.log("Doc file thanh cong!\n");

    Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const products = results.data;
        console.log(`Tim thay ${products.length} san pham trong file CSV\n`);
        console.log("Bat dau import len Firestore...\n");

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (let i = 0; i < products.length; i++) {
          const product = products[i];
          const productId = createValidId(product['Mã hàng'], i);

          // Chuẩn bị dữ liệu theo đúng cấu trúc CSV của bạn
          const productData = {
            // Thông tin cơ bản
            code: parseString(product['Mã hàng']),
            name: parseString(product['Tên hàng']),
            barcode: parseString(product['Mã vạch']),
            brand: parseString(product['Thương hiệu']),
            category: parseString(product['Loại hàng']),
            group: parseString(product['Nhóm hàng(3 Cấp)']),

            // Giá cả
            price: parseNumber(product['Giá bán']),
            cost: parseNumber(product['Giá vốn']),

            // Tồn kho
            stock: parseNumber(product['Tồn kho']),
            stockMin: parseNumber(product['Tồn nhỏ nhất']),
            stockMax: parseNumber(product['Tồn lớn nhất']),
            customerOrder: parseNumber(product['KH đặt']),
            expectedOutOfStock: parseString(product['Dự kiến hết hàng']),

            // Đơn vị
            unit: parseString(product['ĐVT']),
            unitCodeBase: parseString(product['Mã ĐVT Cơ bản']),
            conversionRate: parseString(product['Quy đổi']),

            // Thông tin chi tiết
            attributes: parseString(product['Thuộc tính']),
            description: parseString(product['Mô tả']),
            location: parseString(product['Vị trí']),

            // Thông tin bổ sung
            relatedProductCode: parseString(product['Mã HH Liên quan']),
            imageUrls: parseString(product['Hình ảnh (url1,url2...)']),
            weight: parseNumber(product['Trọng lượng']),
            isActive: parseString(product['Đang kinh doanh']) === '1',
            canSellDirect: parseString(product['Được bán trực tiếp']) === '1',
            noteTemplate: parseString(product['Mẫu ghi chú']),
            components: parseString(product['Hàng thành phần']),

            // Metadata
            createdAt: new Date(),
            updatedAt: new Date(),
            updatedBy: 'system_import'
          };

          try {
            await setDoc(doc(db, 'products', productId), productData);
            successCount++;

            if (successCount % 100 === 0) {
              console.log(`Da import ${successCount}/${products.length} san pham (${((successCount/products.length)*100).toFixed(1)}%)`);
            }
          } catch (error) {
            errorCount++;
            errors.push({
              index: i,
              code: productData.code,
              error: error.message
            });
            console.error(`Loi tai dong ${i + 2} (Ma: ${productData.code}): ${error.message}`);
          }
        }

        console.log("\n" + "=".repeat(60));
        console.log("HOAN THANH IMPORT!");
        console.log("=".repeat(60));
        console.log(`Thanh cong: ${successCount}/${products.length} san pham`);
        console.log(`Loi: ${errorCount} san pham`);
        console.log(`Ti le thanh cong: ${((successCount/products.length)*100).toFixed(2)}%`);

        if (errors.length > 0 && errors.length <= 10) {
          console.log("\nChi tiet loi:");
          errors.forEach(err => {
            console.log(`   - Dong ${err.index + 2} (${err.code}): ${err.error}`);
          });
        }

        console.log("\nKiem tra ket qua tai: https://console.firebase.google.com");
        console.log("   -> Firestore Database -> products collection\n");

        process.exit(0);
      },
      error: (error) => {
        console.error("Loi khi parse CSV:", error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error("Loi khi doc file:", error.message);
    console.log("\nKiem tra:");
    console.log("   1. Duong dan file CSV co dung khong?");
    console.log("   2. File co ton tai khong?");
    console.log("   3. Ban co quyen doc file khong?\n");
    process.exit(1);
  }
}

console.log("FIREBASE CSV IMPORT TOOL");
console.log("=".repeat(60) + "\n");
importCSV();
