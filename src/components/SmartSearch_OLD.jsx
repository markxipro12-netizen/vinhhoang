// src/components/SmartSearch.jsx
import { useState, useEffect, useMemo } from 'react';
import { Search, Zap, Target, Tag, ChevronDown, ChevronUp, Package, Edit3, Save, X, Upload, History, Clock, LogOut, User as UserIcon, Shield } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, query, where, orderBy, limit } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';

// ==================== THUẬT TOÁN TÌM KIẾM ====================

// Loại bỏ dấu tiếng Việt
const removeDiacritics = (str) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

// Tách token từ chuỗi
const extractTokens = (text) => {
  if (!text) return [];
  return text.split(/[\/\\\-_,;|\s]+/).filter(t => t.length > 0);
};

// Tính khoảng cách Levenshtein (fuzzy matching)
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

// Tính điểm match cho 1 field - FUZZY MODE (Tìm gần đúng)
const calculateFieldScoreFuzzy = (query, text, fieldWeight = 1) => {
  if (!query || !text) return 0;

  const normalizedQuery = removeDiacritics(query.toLowerCase().trim());
  const normalizedText = removeDiacritics(text.toLowerCase().trim());

  let score = 0;

  // 1. EXACT MATCH (1000 điểm)
  if (normalizedText === normalizedQuery) {
    score = 1000;
  }
  // 2. STARTS WITH (500 điểm)
  else if (normalizedText.startsWith(normalizedQuery)) {
    score = 500;
  }
  // 3. CONTAINS (300 điểm)
  else if (normalizedText.includes(normalizedQuery)) {
    const position = normalizedText.indexOf(normalizedQuery);
    score = 300 - (position * 0.5);
  }
  // 4. TOKEN MATCHING
  else {
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

// Tính điểm match cho 1 field - EXACT MODE (Tìm chính xác)
const calculateFieldScoreExact = (query, text, fieldWeight = 1) => {
  if (!query || !text) return 0;

  const normalizedQuery = removeDiacritics(query.toLowerCase().trim());
  const normalizedText = removeDiacritics(text.toLowerCase().trim());

  // Chỉ chấp nhận khớp chính xác hoặc khớp token chính xác
  if (normalizedText === normalizedQuery) {
    return 1000 * fieldWeight;
  }

  // Khớp token chính xác (cho nhà cung cấp trong attributes)
  const queryTokens = extractTokens(normalizedQuery);
  const textTokens = extractTokens(normalizedText);

  let exactMatches = 0;
  queryTokens.forEach(qToken => {
    if (textTokens.some(tToken => tToken === qToken)) {
      exactMatches++;
    }
  });

  // Chỉ chấp nhận nếu TẤT CẢ query tokens đều khớp chính xác
  if (exactMatches === queryTokens.length && queryTokens.length > 0) {
    return 500 * fieldWeight;
  }

  return 0;
};

// Hàm tìm kiếm chính với 2 chế độ
const performSearch = (query, products, searchMode = 'fuzzy') => {
  if (!query.trim()) {
    return products.slice(0, 50);
  }

  const calculateScore = searchMode === 'fuzzy' ? calculateFieldScoreFuzzy : calculateFieldScoreExact;

  const scored = products.map(product => {
    const scores = [];

    // Tính điểm cho từng field với weight khác nhau
    if (product.code) {
      scores.push(calculateScore(query, product.code, 10));
    }
    if (product.barcode) {
      scores.push(calculateScore(query, product.barcode, 9));
    }
    if (product.name) {
      scores.push(calculateScore(query, product.name, 5));
    }
    if (product.attributes) {
      scores.push(calculateScore(query, product.attributes, 4));
    }
    if (product.brand) {
      scores.push(calculateScore(query, product.brand, 3));
    }
    if (product.group) {
      scores.push(calculateScore(query, product.group, 2));
    }

    // Lấy điểm MAX (không phải SUM)
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
};

// ==================== COMPONENT ====================

export default function SmartSearch() {
  const { user, userRole, isAdmin, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('fuzzy'); // 'fuzzy' hoặc 'exact'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState({}); // Để mở/đóng chi tiết
  const [editingId, setEditingId] = useState(null); // ID sản phẩm đang edit
  const [editForm, setEditForm] = useState({}); // Dữ liệu tạm khi đang edit
  const [saving, setSaving] = useState(false); // Đang lưu lên Firebase
  const [bulkUploading, setBulkUploading] = useState(false); // Đang bulk update
  const [bulkResult, setBulkResult] = useState(null); // Kết quả bulk update
  const [viewingHistory, setViewingHistory] = useState(null); // ID sản phẩm đang xem history
  const [priceHistory, setPriceHistory] = useState([]); // Lịch sử giá của 1 sản phẩm

  // Load dữ liệu từ Firestore (chỉ 1 lần khi mount)
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
        setError(err.message);
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Tìm kiếm với debouncing và searchMode
  const searchResults = useMemo(() => {
    return performSearch(searchQuery, products, searchMode);
  }, [searchQuery, products, searchMode]);

  // Format số tiền
  const formatPrice = (price) => {
    if (!price || price === 0) return '0';
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  // Highlight text match
  const highlightMatch = (text, query) => {
    if (!query || !text) return text;

    const normalizedText = removeDiacritics(text.toLowerCase());
    const normalizedQuery = removeDiacritics(query.toLowerCase());
    const index = normalizedText.indexOf(normalizedQuery);

    if (index === -1) return text;

    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);

    return (
      <>
        {before}
        <span className="bg-yellow-300 font-bold px-1 rounded">{match}</span>
        {after}
      </>
    );
  };

  // Toggle expand item
  const toggleExpand = (productId) => {
    setExpandedItems(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  // Bắt đầu edit
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

  // Hủy edit
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // ==================== BULK UPDATE FROM EXCEL ====================
  const handleBulkUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setBulkUploading(true);
    setBulkResult(null);

    try {
      // Đọc file Excel
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log(`📁 Đọc được ${jsonData.length} dòng từ Excel`);

      let updated = 0;
      let notFound = 0;
      let priceChanged = 0;

      // Duyệt qua từng dòng Excel
      for (const row of jsonData) {
        const code = row['Mã hàng'] || row['code'];
        const newPrice = parseFloat(row['Giá bán'] || row['price']) || 0;
        const newCost = parseFloat(row['Giá vốn'] || row['cost']) || 0;

        if (!code) continue;

        // Tìm sản phẩm trong local state theo mã hàng
        const product = products.find(p => p.code === code);

        if (!product) {
          notFound++;
          console.log(`⚠️ Không tìm thấy sản phẩm: ${code}`);
          continue;
        }

        const oldPrice = product.price || 0;
        const oldCost = product.cost || 0;

        // Cập nhật Firestore
        const productRef = doc(db, 'products', product.id);
        await updateDoc(productRef, {
          price: newPrice,
          cost: newCost
        });

        // Log price history nếu giá thay đổi
        if (newPrice !== oldPrice) {
          await addDoc(collection(db, 'priceHistory'), {
            productId: product.id,
            productCode: code,
            productName: product.name,
            fieldChanged: 'price',
            oldValue: oldPrice,
            newValue: newPrice,
            delta: newPrice - oldPrice,
            changedAt: serverTimestamp(),
            changedBy: 'bulk_update',
            source: 'excel_upload'
          });
          priceChanged++;
        }

        if (newCost !== oldCost) {
          await addDoc(collection(db, 'priceHistory'), {
            productId: product.id,
            productCode: code,
            productName: product.name,
            fieldChanged: 'cost',
            oldValue: oldCost,
            newValue: newCost,
            delta: newCost - oldCost,
            changedAt: serverTimestamp(),
            changedBy: 'bulk_update',
            source: 'excel_upload'
          });
          priceChanged++;
        }

        // Cập nhật local state
        setProducts(prev => prev.map(p =>
          p.id === product.id
            ? { ...p, price: newPrice, cost: newCost }
            : p
        ));

        updated++;
      }

      setBulkResult({
        total: jsonData.length,
        updated,
        notFound,
        priceChanged
      });

      console.log(`✅ Bulk update hoàn thành: ${updated} sản phẩm, ${priceChanged} thay đổi giá`);
    } catch (err) {
      console.error('❌ Lỗi bulk upload:', err);
      alert('Lỗi khi upload: ' + err.message);
    }

    setBulkUploading(false);
    event.target.value = ''; // Reset input
  };

  // ==================== VIEW PRICE HISTORY ====================
  const viewHistory = async (product) => {
    setViewingHistory(product.id);
    setPriceHistory([]);

    try {
      const q = query(
        collection(db, 'priceHistory'),
        where('productId', '==', product.id),
        orderBy('changedAt', 'desc'),
        limit(20)
      );

      const snapshot = await getDocs(q);
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setPriceHistory(history);
      console.log(`📊 Loaded ${history.length} price history records`);
    } catch (err) {
      console.error('❌ Lỗi load history:', err);
      alert('Lỗi khi tải lịch sử: ' + err.message);
    }
  };

  const closeHistory = () => {
    setViewingHistory(null);
    setPriceHistory([]);
  };

  // Lưu thay đổi lên Firebase
  const saveEdit = async (productId) => {
    try {
      setSaving(true);

      // Tìm sản phẩm gốc để so sánh
      const originalProduct = products.find(p => p.id === productId);

      const newPrice = parseFloat(editForm.price) || 0;
      const newCost = parseFloat(editForm.cost) || 0;
      const oldPrice = originalProduct.price || 0;
      const oldCost = originalProduct.cost || 0;

      // Cập nhật Firestore
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        code: editForm.code,
        name: editForm.name,
        price: newPrice,
        cost: newCost,
        stock: parseFloat(editForm.stock) || 0,
        attributes: editForm.attributes
      });

      // ==================== PRICE HISTORY LOGGING ====================
      // Nếu giá bán thay đổi → Log vào priceHistory
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
          changedBy: user?.email || 'unknown',
          source: 'inline_edit'
        });
        console.log(`📊 Logged price change: ${oldPrice} → ${newPrice} (Δ ${newPrice - oldPrice})`);
      }

      // Nếu giá vốn thay đổi → Log vào priceHistory
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
          changedBy: user?.email || 'unknown',
          source: 'inline_edit'
        });
        console.log(`📊 Logged cost change: ${oldCost} → ${newCost} (Δ ${newCost - oldCost})`);
      }

      // Cập nhật local state
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b-4 border-indigo-600">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Package className="w-12 h-12 text-indigo-600" />
                <Zap className="w-5 h-5 text-yellow-500 absolute -top-1 -right-1" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  Tìm Kiếm Phụ Tùng AI
                </h1>
                <p className="text-sm text-gray-600">
                  {loading ? 'Đang tải dữ liệu...' : `${products.length} sản phẩm • Tìm kiếm thông minh với AI`}
                </p>
              </div>
            </div>

            {/* User Info & Actions */}
            <div className="flex items-center gap-3">
              {/* User Badge */}
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                {isAdmin ? (
                  <Shield className="w-5 h-5 text-red-600" />
                ) : (
                  <UserIcon className="w-5 h-5 text-blue-600" />
                )}
                <div className="text-sm">
                  <div className="font-bold text-gray-800">
                    {isAdmin ? 'Admin' : 'Staff'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user?.email || 'Unknown'}
                  </div>
                </div>
              </div>

              {/* Bulk Upload Button - Chỉ Admin */}
              {isAdmin && (
                <label className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg cursor-pointer shadow-md font-bold transition-all">
                  <Upload className="w-5 h-5" />
                  {bulkUploading ? 'Đang upload...' : 'Upload Excel'}
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleBulkUpload}
                    disabled={bulkUploading}
                    className="hidden"
                  />
                </label>
              )}

              {/* Logout Button */}
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg shadow-md font-bold transition-all"
              >
                <LogOut className="w-5 h-5" />
                Đăng xuất
              </button>
            </div>
          </div>

          {/* Bulk Upload Result */}
          {bulkResult && (
            <div className="mt-4 p-4 bg-green-50 border-2 border-green-500 rounded-lg">
              <h3 className="font-bold text-green-800 mb-2">✅ Kết quả Bulk Update:</h3>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Tổng dòng:</span>
                  <span className="ml-2 font-bold text-gray-800">{bulkResult.total}</span>
                </div>
                <div>
                  <span className="text-gray-600">Đã cập nhật:</span>
                  <span className="ml-2 font-bold text-green-600">{bulkResult.updated}</span>
                </div>
                <div>
                  <span className="text-gray-600">Không tìm thấy:</span>
                  <span className="ml-2 font-bold text-orange-600">{bulkResult.notFound}</span>
                </div>
                <div>
                  <span className="text-gray-600">Thay đổi giá:</span>
                  <span className="ml-2 font-bold text-blue-600">{bulkResult.priceChanged}</span>
                </div>
              </div>
              <button
                onClick={() => setBulkResult(null)}
                className="mt-2 text-xs text-gray-500 hover:text-gray-700"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Search Container */}
      <div className="sticky top-0 z-40 bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-b border-gray-200 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Search Input - Main Focus */}
          <div className="relative mb-4">
            <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
            <input
              type="text"
              placeholder={
                searchMode === 'fuzzy'
                  ? 'Tìm theo mã hàng, tên, thương hiệu, thuộc tính...'
                  : 'Tìm chính xác theo nhà cung cấp, mã hàng...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-16 pr-6 py-5 text-lg border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 shadow-xl bg-white transition-all"
              autoFocus
            />
          </div>

          {/* Toggle Mode - Compact, Same Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
              <button
                onClick={() => setSearchMode('fuzzy')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all text-sm ${
                  searchMode === 'fuzzy'
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="font-medium">Gần đúng</span>
              </button>
              <button
                onClick={() => setSearchMode('exact')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all text-sm ${
                  searchMode === 'exact'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span className="font-medium">Chính xác</span>
              </button>
            </div>

            {searchQuery && (
              <div className="text-sm text-gray-600">
                <span className="font-bold text-indigo-600 text-lg">{searchResults.length}</span> kết quả
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Error */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            ❌ Lỗi: {error}
          </div>
        )}

        {/* Loading - Skeleton */}
        {loading && (
          <div className="grid gap-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="bg-white rounded-2xl shadow-lg p-6 border-l-[6px] border-gray-300 animate-pulse">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    {/* Skeleton Badge */}
                    <div className="w-20 h-6 bg-gray-200 rounded-lg mb-3"></div>

                    {/* Skeleton Title */}
                    <div className="h-8 bg-gray-300 rounded-lg mb-3 w-3/4"></div>

                    {/* Skeleton Tags */}
                    <div className="flex gap-2 mb-2">
                      <div className="w-24 h-8 bg-gray-200 rounded-lg"></div>
                      <div className="w-32 h-8 bg-gray-200 rounded-lg"></div>
                      <div className="w-28 h-8 bg-gray-200 rounded-lg"></div>
                    </div>
                  </div>

                  {/* Skeleton Price */}
                  <div className="text-right ml-6 min-w-[180px]">
                    <div className="h-10 bg-gray-300 rounded-lg mb-2 w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-16 ml-auto mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded-lg w-full"></div>
                  </div>
                </div>

                {/* Skeleton Attributes */}
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        )}

        {/* Results - Card Layout */}
        {!loading && (
          <>
            {/* Results Count */}
            <div className="mb-4 flex items-center gap-2">
              <span className="text-gray-700 font-medium">Tìm thấy</span>
              <span className="px-3 py-1 bg-indigo-600 text-white font-bold rounded-full">
                {searchResults.length}
              </span>
              <span className="text-gray-700 font-medium">kết quả</span>
            </div>

            {/* Product Cards */}
            <div className="grid gap-4">
              {searchResults.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
                  <Search className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-700 text-xl font-bold mb-2">
                    {searchQuery ? 'Không tìm thấy sản phẩm phù hợp' : 'Nhập từ khóa để bắt đầu tìm kiếm'}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {searchQuery ? 'Thử tìm kiếm với từ khóa khác hoặc ngắn gọn hơn' : 'VD: DH220, cao su, Phúc Long...'}
                  </p>
                </div>
              ) : (
                searchResults.map((product, index) => {
                  const isEditing = editingId === product.id;

                  return (
                  <div
                    key={product.id}
                    className={`bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-l-[6px] ${
                      isEditing ? 'border-orange-500 ring-4 ring-orange-100' : 'border-indigo-500 hover:border-indigo-600'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        {/* TOP badge - Màu cam nổi bật */}
                        {searchQuery && index === 0 && !isEditing && (
                          <span className="inline-block px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-black rounded-lg mb-3 shadow-md">
                            🏆 TOP 1
                          </span>
                        )}
                        {searchQuery && index > 0 && index < 3 && !isEditing && (
                          <span className="inline-block px-3 py-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-800 text-xs font-bold rounded-lg mb-3">
                            TOP {index + 1}
                          </span>
                        )}

                        {/* Edit Mode Badge */}
                        {isEditing && (
                          <span className="inline-block px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full mb-2 animate-pulse">
                            ✏️ ĐANG SỬA
                          </span>
                        )}

                        {/* Tên sản phẩm - LỚN và ĐẬM */}
                        {isEditing ? (
                          <div className="mb-3">
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Tên sản phẩm</label>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="w-full px-3 py-2 border-2 border-orange-300 rounded-lg focus:outline-none focus:border-orange-500 font-semibold text-lg"
                            />
                          </div>
                        ) : (
                          <h3 className="text-2xl font-extrabold text-gray-900 mb-3 leading-tight">
                            {highlightMatch(product.name || 'Không có tên', searchQuery)}
                          </h3>
                        )}

                        {/* Tags - Mã hàng - BADGE RỰC RỠ */}
                        <div className="flex flex-wrap gap-2 mb-2">
                          {isEditing ? (
                            <div className="w-full">
                              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Mã hàng</label>
                              <input
                                type="text"
                                value={editForm.code}
                                onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                                className="w-full px-3 py-2 border-2 border-orange-300 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                              />
                            </div>
                          ) : (
                            product.code && (
                              <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md">
                                <Tag className="w-4 h-4" />
                                {highlightMatch(product.code, searchQuery)}
                              </span>
                            )
                          )}
                          {product.brand && !isEditing && (
                            <span className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold shadow-md">
                              {highlightMatch(product.brand, searchQuery)}
                            </span>
                          )}
                          {product.group && !isEditing && (
                            <span className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-bold shadow-md">
                              {product.group}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Giá - Bên phải - LỚN và NỔI BẬT */}
                      <div className="text-right ml-6 min-w-[180px]">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div>
                              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Giá bán</label>
                              <input
                                type="number"
                                value={editForm.price}
                                onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                                className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-right font-bold"
                              />
                              <span className="text-xs ml-1">đ</span>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Giá vốn</label>
                              <input
                                type="number"
                                value={editForm.cost}
                                onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                                className="w-full px-3 py-2 border-2 border-red-300 rounded-lg focus:outline-none focus:border-red-500 text-right font-bold"
                              />
                              <span className="text-xs ml-1">đ</span>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Tồn kho</label>
                              <input
                                type="number"
                                value={editForm.stock}
                                onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                                className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:border-green-500 text-right font-bold"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-3xl font-black text-indigo-600 mb-1">
                              {formatPrice(product.price)} đ
                            </div>
                            <div className="text-sm text-gray-500 font-medium mb-2">{product.unit || 'Cái'}</div>
                            {/* Chỉ Admin mới thấy giá vốn - CỰC LỚN */}
                            {isAdmin && product.cost !== 0 && (
                              <div className="text-2xl text-red-600 font-black bg-red-50 px-3 py-2 rounded-lg inline-block">
                                {formatPrice(product.cost)} đ
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Thuộc tính */}
                    {isEditing ? (
                      <div className="mb-2">
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Thuộc tính</label>
                        <textarea
                          value={editForm.attributes}
                          onChange={(e) => setEditForm({ ...editForm, attributes: e.target.value })}
                          className="w-full px-3 py-2 border-2 border-orange-300 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
                          rows="2"
                        />
                      </div>
                    ) : (
                      product.attributes && (
                        <div className="mb-2 text-gray-600 text-sm leading-relaxed">
                          <span className="font-semibold text-gray-700">Thuộc tính:</span>{' '}
                          {highlightMatch(product.attributes, searchQuery)}
                        </div>
                      )
                    )}

                    {/* Expandable Details - ZEBRA STRIPES */}
                    {expandedItems[product.id] && (
                      <div className="mt-4 pt-4 border-t-2 border-gray-200">
                        <div className="overflow-hidden rounded-lg border border-gray-200">
                          {/* Zebra Stripe Table */}
                          {product.category && (
                            <div className="grid grid-cols-3 px-4 py-3 bg-gray-50">
                              <span className="text-xs font-bold text-gray-500 uppercase col-span-1">Loại hàng</span>
                              <div className="text-sm text-gray-900 font-semibold col-span-2">{product.category}</div>
                            </div>
                          )}
                          {product.barcode && (
                            <div className="grid grid-cols-3 px-4 py-3 bg-white">
                              <span className="text-xs font-bold text-gray-500 uppercase col-span-1">Mã vạch</span>
                              <div className="text-sm text-gray-900 font-mono col-span-2">{product.barcode}</div>
                            </div>
                          )}
                          {product.stock !== 0 && (
                            <div className="grid grid-cols-3 px-4 py-3 bg-gray-50">
                              <span className="text-xs font-bold text-gray-500 uppercase col-span-1">Tồn kho</span>
                              <div className="text-sm text-gray-900 font-bold col-span-2">
                                {product.stock} {product.unit}
                              </div>
                            </div>
                          )}
                          {product.location && (
                            <div className="grid grid-cols-3 px-4 py-3 bg-white">
                              <span className="text-xs font-bold text-gray-500 uppercase col-span-1">Vị trí</span>
                              <div className="text-sm text-gray-900 font-semibold col-span-2">{product.location}</div>
                            </div>
                          )}
                          {isAdmin && product.cost !== 0 && !isEditing && (
                            <div className="grid grid-cols-3 px-4 py-3 bg-red-50 border-t-2 border-red-200">
                              <span className="text-xs font-bold text-red-700 uppercase col-span-1">Giá vốn</span>
                              <div className="text-base text-red-700 font-black col-span-2">
                                {formatPrice(product.cost)} đ
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-4 flex gap-2">
                      {isEditing ? (
                        <>
                          {/* Save Button */}
                          <button
                            onClick={() => saveEdit(product.id)}
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all shadow-md font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Save className="w-5 h-5" />
                            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                          </button>

                          {/* Cancel Button */}
                          <button
                            onClick={cancelEdit}
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white rounded-lg transition-all shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <X className="w-5 h-5" />
                            Hủy
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Expand Button */}
                          <button
                            onClick={() => toggleExpand(product.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-indigo-100 hover:to-indigo-200 rounded-lg transition-all shadow-sm font-medium text-gray-700"
                          >
                            {expandedItems[product.id] ? (
                              <>
                                <ChevronUp className="w-5 h-5" />
                                Thu gọn
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-5 h-5" />
                                Xem chi tiết
                              </>
                            )}
                          </button>

                          {/* History Button */}
                          <button
                            onClick={() => viewHistory(product)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-lg transition-all shadow-md font-bold"
                          >
                            <History className="w-5 h-5" />
                            Lịch sử
                          </button>

                          {/* Edit Button - Chỉ Admin */}
                          {isAdmin && (
                            <button
                              onClick={() => startEdit(product)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-all shadow-md font-bold"
                            >
                              <Edit3 className="w-5 h-5" />
                              Sửa
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Debug info */}
        {searchQuery && searchResults.length > 0 && (
          <div className="mt-4 p-4 bg-indigo-50 rounded text-xs text-gray-600">
            💡 <strong>Debug:</strong> Top result score = {searchResults[0].score.toFixed(2)}
          </div>
        )}
      </div>

      {/* ==================== PRICE HISTORY MODAL ==================== */}
      {viewingHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History className="w-8 h-8" />
                  <div>
                    <h2 className="text-2xl font-bold">Lịch sử thay đổi giá</h2>
                    <p className="text-sm text-indigo-100">
                      {products.find(p => p.id === viewingHistory)?.name || 'Đang tải...'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeHistory}
                  className="p-2 hover:bg-indigo-600 rounded-lg transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {priceHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Chưa có lịch sử thay đổi giá</p>
                  <p className="text-gray-400 text-sm mt-2">Khi bạn sửa giá, lịch sử sẽ xuất hiện tại đây</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {priceHistory.map((record, index) => {
                    const isIncrease = record.delta > 0;
                    const timestamp = record.changedAt?.toDate?.() || new Date();

                    // Ẩn record giá vốn nếu là Staff
                    if (!isAdmin && record.fieldChanged === 'cost') {
                      return null;
                    }

                    return (
                      <div
                        key={record.id}
                        className={`p-4 rounded-lg border-2 ${
                          isIncrease ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              isIncrease ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                            }`}>
                              {isIncrease ? '📈 TĂNG' : '📉 GIẢM'}
                            </span>
                            <span className="font-mono text-sm text-gray-600">
                              #{index + 1}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">
                              {timestamp.toLocaleDateString('vi-VN')}
                            </div>
                            <div className="text-xs text-gray-400">
                              {timestamp.toLocaleTimeString('vi-VN')}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Loại thay đổi</div>
                            <div className="font-bold text-gray-800">
                              {record.fieldChanged === 'price' ? 'Giá bán' : 'Giá vốn'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Giá cũ → Giá mới</div>
                            <div className="font-mono text-sm">
                              <span className="line-through text-gray-500">{formatPrice(record.oldValue)}</span>
                              <span className="mx-2">→</span>
                              <span className="font-bold text-gray-800">{formatPrice(record.newValue)}</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Chênh lệch</div>
                            <div className={`font-bold text-lg ${
                              isIncrease ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {isIncrease ? '+' : ''}{formatPrice(record.delta)} đ
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-4 text-xs text-gray-500">
                          <span>Nguồn: {
                            record.source === 'inline_edit' ? '✏️ Sửa trực tiếp' :
                            record.source === 'excel_upload' ? '📁 Upload Excel' :
                            record.source
                          }</span>
                          <span>Người thay đổi: {record.changedBy}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 p-4 flex items-center justify-between border-t">
              <div className="text-sm text-gray-600">
                Tổng: <span className="font-bold">
                  {isAdmin
                    ? priceHistory.length
                    : priceHistory.filter(r => r.fieldChanged === 'price').length}
                </span> thay đổi
              </div>
              <button
                onClick={closeHistory}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
