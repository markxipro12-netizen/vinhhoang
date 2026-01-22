// src/components/AdvancedProductSearch.jsx
import { useState, useEffect, useMemo } from 'react';
import {
  Search, Package, Tag, FileText, Upload, ChevronDown, ChevronUp,
  Zap, Edit2, Save, X, History, Download
} from 'lucide-react';
import { db, auth } from '../firebase';
import {
  collection, getDocs, doc, updateDoc, addDoc,
  query, where, orderBy, limit, serverTimestamp
} from 'firestore/firebase';
import Papa from 'papaparse';

// ==================== UTILITY FUNCTIONS ====================

const removeDiacritics = (str) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const extractTokens = (text) => {
  if (!text) return [];
  return text.split(/[\/\\\-_,;|\s]+/).filter(t => t.length > 0);
};

const levenshteinDistance = (str1, str2) => {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[len1][len2];
};

// Format số tiền
const formatPrice = (price) => {
  if (!price || price === 0) return '0';
  return new Intl.NumberFormat('vi-VN').format(price);
};

// ==================== SEARCH ALGORITHMS ====================

// Tính điểm cho 1 field (FUZZY MODE)
const calculateFieldScoreFuzzy = (query, text, fieldWeight = 1) => {
  if (!query || !text) return 0;

  const normalizedQuery = removeDiacritics(query.toLowerCase().trim());
  const normalizedText = removeDiacritics(text.toLowerCase().trim());

  let score = 0;

  if (normalizedText === normalizedQuery) {
    score = 1000;
  } else if (normalizedText.startsWith(normalizedQuery)) {
    score = 500;
  } else if (normalizedText.includes(normalizedQuery)) {
    const position = normalizedText.indexOf(normalizedQuery);
    score = 300 - (position * 0.5);
  } else {
    const queryTokens = extractTokens(normalizedQuery);
    const textTokens = extractTokens(normalizedText);

    queryTokens.forEach(qToken => {
      let bestMatch = 0;

      textTokens.forEach(tToken => {
        if (tToken === qToken) {
          bestMatch = Math.max(bestMatch, 200);
        } else if (tToken.startsWith(qToken)) {
          bestMatch = Math.max(bestMatch, 150);
        } else if (tToken.endsWith(qToken)) {
          bestMatch = Math.max(bestMatch, 140);
        } else if (tToken.includes(qToken)) {
          bestMatch = Math.max(bestMatch, 100);
        } else if (qToken.length >= 4 && tToken.length >= 4) {
          const distance = levenshteinDistance(qToken, tToken);
          const maxLen = Math.max(qToken.length, tToken.length);
          const similarity = (maxLen - distance) / maxLen;

          if (similarity >= 0.7) {
            bestMatch = Math.max(bestMatch, similarity * 120);
          }
        }
      });

      score += bestMatch;
    });
  }

  return score * fieldWeight;
};

// Tính điểm cho 1 field (EXACT MODE - cho nhà cung cấp)
const calculateFieldScoreExact = (query, text) => {
  if (!query || !text) return 0;

  const normalizedQuery = removeDiacritics(query.toLowerCase().trim());
  const normalizedText = removeDiacritics(text.toLowerCase().trim());

  // Chỉ chấp nhận khớp chính xác hoàn toàn
  if (normalizedText === normalizedQuery) {
    return 1000;
  }

  // Hoặc khớp chính xác một phần (cho nhà cung cấp trong attributes)
  const textTokens = extractTokens(normalizedText);
  const queryTokens = extractTokens(normalizedQuery);

  let exactMatches = 0;
  queryTokens.forEach(qToken => {
    if (textTokens.includes(qToken)) {
      exactMatches++;
    }
  });

  return exactMatches === queryTokens.length ? 500 : 0;
};

// ==================== MAIN COMPONENT ====================

export default function AdvancedProductSearch() {
  // State
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('fuzzy'); // 'fuzzy' or 'exact'
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});
  const [editingProduct, setEditingProduct] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [showHistory, setShowHistory] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [currentUser] = useState('admin@mini-erp.local'); // TODO: Get from auth

  // Load products từ Firestore
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, 'products'));
        const productData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(productData);
        setLoading(false);
        console.log(`✅ Đã load ${productData.length} sản phẩm`);
      } catch (err) {
        console.error('❌ Lỗi khi load dữ liệu:', err);
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Search logic
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return products.slice(0, 20);
    }

    const scored = products.map(product => {
      const scores = [];

      if (searchMode === 'fuzzy') {
        // Fuzzy mode - tìm gần đúng
        if (product.code) scores.push(calculateFieldScoreFuzzy(searchQuery, product.code, 10));
        if (product.barcode) scores.push(calculateFieldScoreFuzzy(searchQuery, product.barcode, 9));
        if (product.name) scores.push(calculateFieldScoreFuzzy(searchQuery, product.name, 5));
        if (product.attributes) scores.push(calculateFieldScoreFuzzy(searchQuery, product.attributes, 4));
        if (product.description) scores.push(calculateFieldScoreFuzzy(searchQuery, product.description, 3));
        if (product.brand) scores.push(calculateFieldScoreFuzzy(searchQuery, product.brand, 3));
        if (product.group) scores.push(calculateFieldScoreFuzzy(searchQuery, product.group, 2));
      } else {
        // Exact mode - tìm chính xác (cho nhà cung cấp)
        if (product.code) scores.push(calculateFieldScoreExact(searchQuery, product.code));
        if (product.attributes) scores.push(calculateFieldScoreExact(searchQuery, product.attributes));
        if (product.brand) scores.push(calculateFieldScoreExact(searchQuery, product.brand));
      }

      const maxScore = Math.max(...scores, 0);

      return {
        ...product,
        score: maxScore
      };
    });

    const results = scored
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);

    return results;
  }, [searchQuery, products, searchMode]);

  // Highlight text
  const highlightMatch = (text, query) => {
    if (!query || !text) return text;

    const normalizedQuery = removeDiacritics(query.toLowerCase());
    const normalizedText = removeDiacritics(text.toLowerCase());
    const index = normalizedText.indexOf(normalizedQuery);

    if (index === -1) return text;

    return (
      <>
        {text.substring(0, index)}
        <span className="bg-yellow-300 font-bold px-1 rounded">
          {text.substring(index, index + query.length)}
        </span>
        {text.substring(index + query.length)}
      </>
    );
  };

  // Toggle expand
  const toggleExpand = (productId) => {
    setExpandedItems(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  // Start editing
  const startEditing = (product) => {
    setEditingProduct(product.id);
    setEditedData({
      name: product.name || '',
      code: product.code || '',
      cost: product.cost || 0,
      price: product.price || 0,
      stock: product.stock || 0,
      attributes: product.attributes || '',
      brand: product.brand || ''
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingProduct(null);
    setEditedData({});
  };

  // Save edited product
  const saveProduct = async (productId) => {
    try {
      const product = products.find(p => p.id === productId);
      const productRef = doc(db, 'products', productId);

      // Update product
      await updateDoc(productRef, {
        ...editedData,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser
      });

      // Log price history if cost or price changed
      if (editedData.cost !== product.cost) {
        await addDoc(collection(db, 'priceHistory'), {
          productId: productId,
          productCode: product.code,
          productName: product.name,
          field: 'cost',
          oldValue: product.cost,
          newValue: editedData.cost,
          delta: editedData.cost - product.cost,
          deltaPercent: ((editedData.cost - product.cost) / product.cost * 100).toFixed(2),
          changedBy: currentUser,
          changedAt: serverTimestamp(),
          source: 'manual_edit'
        });
      }

      if (editedData.price !== product.price) {
        await addDoc(collection(db, 'priceHistory'), {
          productId: productId,
          productCode: product.code,
          productName: product.name,
          field: 'price',
          oldValue: product.price,
          newValue: editedData.price,
          delta: editedData.price - product.price,
          deltaPercent: ((editedData.price - product.price) / product.price * 100).toFixed(2),
          changedBy: currentUser,
          changedAt: serverTimestamp(),
          source: 'manual_edit'
        });
      }

      // Update local state
      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, ...editedData } : p
      ));

      setEditingProduct(null);
      alert('✅ Đã lưu thành công!');
    } catch (error) {
      console.error('❌ Lỗi khi lưu:', error);
      alert('❌ Lỗi: ' + error.message);
    }
  };

  // View price history
  const viewHistory = async (productId) => {
    try {
      const historyQuery = query(
        collection(db, 'priceHistory'),
        where('productId', '==', productId),
        orderBy('changedAt', 'desc'),
        limit(20)
      );

      const snapshot = await getDocs(historyQuery);
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setPriceHistory(history);
      setShowHistory(productId);
    } catch (error) {
      console.error('❌ Lỗi khi load lịch sử:', error);
      alert('❌ Không thể load lịch sử: ' + error.message);
    }
  };

  // Bulk update from Excel
  const handleBulkUpdate = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const text = e.target.result;
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          let updateCount = 0;
          let createCount = 0;

          for (const row of results.data) {
            const code = row['Mã hàng'];
            if (!code) continue;

            const existingProduct = products.find(p => p.code === code);

            if (existingProduct) {
              // Update existing product
              const updates = {
                name: row['Tên hàng'] || existingProduct.name,
                cost: parseFloat(row['Giá vốn']) || existingProduct.cost,
                price: parseFloat(row['Giá bán']) || existingProduct.price,
                stock: parseFloat(row['Tồn kho']) || existingProduct.stock,
                updatedAt: serverTimestamp(),
                updatedBy: 'system_bulk_import'
              };

              await updateDoc(doc(db, 'products', existingProduct.id), updates);

              // Log price changes
              if (updates.cost !== existingProduct.cost) {
                await addDoc(collection(db, 'priceHistory'), {
                  productId: existingProduct.id,
                  productCode: code,
                  productName: existingProduct.name,
                  field: 'cost',
                  oldValue: existingProduct.cost,
                  newValue: updates.cost,
                  delta: updates.cost - existingProduct.cost,
                  deltaPercent: ((updates.cost - existingProduct.cost) / existingProduct.cost * 100).toFixed(2),
                  changedBy: 'system_bulk_import',
                  changedAt: serverTimestamp(),
                  source: 'bulk_update'
                });
              }

              updateCount++;
            } else {
              // Create new product
              await addDoc(collection(db, 'products'), {
                code: code,
                name: row['Tên hàng'] || '',
                cost: parseFloat(row['Giá vốn']) || 0,
                price: parseFloat(row['Giá bán']) || 0,
                stock: parseFloat(row['Tồn kho']) || 0,
                // ... other fields
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                updatedBy: 'system_bulk_import'
              });
              createCount++;
            }
          }

          setLoading(false);
          alert(`✅ Hoàn thành!\n• Cập nhật: ${updateCount} sản phẩm\n• Tạo mới: ${createCount} sản phẩm`);

          // Reload products
          window.location.reload();
        }
      });
    };

    reader.readAsText(file);
  };

  // Export to CSV
  const exportToCSV = () => {
    const csv = Papa.unparse(searchResults.map(p => ({
      'Mã hàng': p.code,
      'Tên hàng': p.name,
      'Thương hiệu': p.brand,
      'Giá bán': p.price,
      'Giá vốn': p.cost,
      'Tồn kho': p.stock,
      'ĐVT': p.unit,
      'Thuộc tính': p.attributes
    })));

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `search_results_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b-4 border-blue-600">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Package className="w-12 h-12 text-blue-600" />
                <Zap className="w-5 h-5 text-yellow-500 absolute -top-1 -right-1" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  Mini ERP - Quản Lý Kho
                </h1>
                <p className="text-sm text-gray-600">
                  {products.length} sản phẩm • Tìm kiếm thông minh với AI
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <label className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg cursor-pointer hover:from-green-600 hover:to-green-700 transition shadow-md">
                <Upload className="w-5 h-5" />
                <span className="font-semibold">Bulk Update</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleBulkUpdate}
                  className="hidden"
                />
              </label>

              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition shadow-md"
              >
                <Download className="w-5 h-5" />
                <span className="font-semibold">Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TO BE CONTINUED IN NEXT PART... */}
    </div>
  );
}
