// src/components/SmartSearch.jsx - PROFESSIONAL REDESIGN
import { useState, useEffect, useMemo } from 'react';
import { Search, Zap, Target, Tag, ChevronDown, ChevronUp, Package, Edit3, Save, X, Upload, History, Clock, LogOut, User as UserIcon, Shield, Filter, TrendingUp, TrendingDown, Database, Box, FileText, LayoutGrid, LayoutList, Activity, ChevronRight } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, query, where, orderBy, limit } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';
import AuditLog from './AuditLog';

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

// Trích xuất NCC từ attributes (format: "NHÀ CUNG CẤP:XXX" hoặc "NCC:XXX")
const extractVendor = (attributes) => {
  if (!attributes) return '';
  const match = attributes.match(/(?:NHÀ CUNG CẤP|NCC|VENDOR|SUPPLIER)[:\s]*([^,;\n]+)/i);
  return match ? match[1].trim() : '';
};

// Tạo màu nhất quán cho NCC (hash-based)
const getVendorColor = (vendor) => {
  if (!vendor) return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' };

  const colors = [
    { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
    { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
    { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
    { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
    { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' },
  ];

  let hash = 0;
  for (let i = 0; i < vendor.length; i++) {
    hash = vendor.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
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

// Tính điểm match cho 1 field - EXACT MODE (Tìm chính xác - CẢI TIẾN)
// GIỮ LẠI cho backward compatibility (không dùng nữa)
const calculateFieldScoreExact = (query, text, fieldWeight = 1) => {
  if (!query || !text) return 0;

  const normalizedQuery = removeDiacritics(query.toLowerCase().trim());
  const normalizedText = removeDiacritics(text.toLowerCase().trim());

  if (normalizedText === normalizedQuery) {
    return 1000 * fieldWeight;
  }

  if (normalizedText.includes(normalizedQuery)) {
    return 800 * fieldWeight;
  }

  const queryTokens = extractTokens(normalizedQuery);
  const textTokens = extractTokens(normalizedText);

  let exactMatches = 0;
  queryTokens.forEach(qToken => {
    if (textTokens.some(tToken => tToken === qToken)) {
      exactMatches++;
    }
  });

  if (exactMatches > 0) {
    const matchRatio = exactMatches / queryTokens.length;
    return 600 * matchRatio * fieldWeight;
  }

  return 0;
};

// EXACT MODE - TIER-BASED (Cải tiến cho ngành phụ tùng)
// Tier 1: Name (ưu tiên cao nhất)
// Tier 2: NCC/Vendor (bộ lọc thực tế)
// Tier 3: Code/Attributes (thu hẹp cuối)
const calculateFieldScoreExactTiered = (query, product) => {
  if (!query.trim()) return 0;

  const normalizedQuery = removeDiacritics(query.toLowerCase().trim());
  const queryTokens = extractTokens(normalizedQuery);

  // Extract fields
  const name = removeDiacritics((product.name || '').toLowerCase());
  const vendor = removeDiacritics(extractVendor(product.attributes).toLowerCase());
  const code = removeDiacritics((product.code || '').toLowerCase());
  const attributes = removeDiacritics((product.attributes || '').toLowerCase());
  const brand = removeDiacritics((product.brand || '').toLowerCase());

  let tier1Score = 0; // Name
  let tier2Score = 0; // NCC/Vendor
  let tier3Score = 0; // Code/Attributes

  // Track matched tokens
  let nameMatches = 0;
  let vendorMatches = 0;
  let codeMatches = 0;

  queryTokens.forEach(qToken => {
    // Tier 1: Name matching
    if (name.includes(qToken)) {
      nameMatches++;
      if (name === qToken) tier1Score += 1000;
      else if (name.startsWith(qToken)) tier1Score += 800;
      else tier1Score += 600;
    }

    // Tier 2: Vendor/NCC matching
    if (vendor && vendor.includes(qToken)) {
      vendorMatches++;
      if (vendor === qToken) tier2Score += 900;
      else if (vendor.startsWith(qToken)) tier2Score += 700;
      else tier2Score += 500;
    }
    // Also check brand as fallback
    if (brand && brand.includes(qToken)) {
      vendorMatches++;
      tier2Score += 400;
    }

    // Tier 3: Code/Attributes matching
    if (code && code.includes(qToken)) {
      codeMatches++;
      tier3Score += 300;
    }
    if (attributes && attributes.includes(qToken)) {
      tier3Score += 200;
    }
  });

  // BONUS: Cross-match (khớp cả Name + NCC)
  const crossMatchBonus = (nameMatches > 0 && vendorMatches > 0) ? 500 : 0;

  // Final score: Tier1 + Tier2 + Tier3 + Bonus
  const totalScore = tier1Score + tier2Score + tier3Score + crossMatchBonus;

  // Require at least 1 token match
  if (nameMatches === 0 && vendorMatches === 0 && codeMatches === 0) {
    return 0;
  }

  return totalScore;
};

// FUZZY MODE - TIER-BASED (Smart Suggest - Cải tiến)
// Tier 1: Name (x10) - Ưu tiên cao nhất khi tìm mông lung
// Tier 2: NCC/Vendor (x5) - Nhà cung cấp quan trọng thứ 2
// Tier 3: Attributes (x2) - Thuộc tính bổ sung
// Tier 4: Code (x1) - Mã hàng chỉ là yếu tố phụ
const calculateFieldScoreFuzzyTiered = (query, product) => {
  if (!query.trim()) return 0;

  const normalizedQuery = removeDiacritics(query.toLowerCase().trim());
  const queryTokens = extractTokens(normalizedQuery);

  // Extract fields
  const name = removeDiacritics((product.name || '').toLowerCase());
  const vendor = removeDiacritics(extractVendor(product.attributes).toLowerCase());
  const brand = removeDiacritics((product.brand || '').toLowerCase());
  const attributes = removeDiacritics((product.attributes || '').toLowerCase());
  const code = removeDiacritics((product.code || '').toLowerCase());
  const barcode = removeDiacritics((product.barcode || '').toLowerCase());

  let totalScore = 0;
  let nameMatches = 0;
  let vendorMatches = 0;

  // Lớp 1: Token Match (Chính xác từng từ)
  queryTokens.forEach(qToken => {
    // Tier 1: Name (Weight x10)
    if (name.includes(qToken)) {
      nameMatches++;
      if (name === qToken) totalScore += 1000 * 10;
      else if (name.startsWith(qToken)) totalScore += 500 * 10;
      else totalScore += 300 * 10;
    }

    // Tier 2: NCC/Vendor (Weight x5)
    if (vendor && vendor.includes(qToken)) {
      vendorMatches++;
      if (vendor === qToken) totalScore += 1000 * 5;
      else if (vendor.startsWith(qToken)) totalScore += 500 * 5;
      else totalScore += 300 * 5;
    }
    // Also check brand
    if (brand && brand.includes(qToken)) {
      vendorMatches++;
      if (brand === qToken) totalScore += 800 * 5;
      else totalScore += 200 * 5;
    }

    // Tier 3: Attributes (Weight x2)
    if (attributes && attributes.includes(qToken)) {
      totalScore += 300 * 2;
    }

    // Tier 4: Code/Barcode (Weight x1)
    if (code && code.includes(qToken)) {
      if (code === qToken) totalScore += 1000;
      else if (code.startsWith(qToken)) totalScore += 500;
      else totalScore += 200;
    }
    if (barcode && barcode.includes(qToken)) {
      totalScore += 200;
    }
  });

  // Lớp 3: Levenshtein (Sai số) - Chỉ áp dụng cho từ dài >= 4 ký tự
  if (totalScore === 0) {
    const nameTokens = extractTokens(name);
    const vendorTokens = extractTokens(vendor);

    queryTokens.forEach(qToken => {
      if (qToken.length >= 4) {
        // Check name với sai số
        nameTokens.forEach(nToken => {
          if (nToken.length >= 4) {
            const distance = levenshteinDistance(qToken, nToken);
            const maxLen = Math.max(qToken.length, nToken.length);
            const similarity = (maxLen - distance) / maxLen;
            if (similarity >= 0.7) {
              totalScore += similarity * 200 * 10; // Weight x10 cho name
              nameMatches++;
            }
          }
        });

        // Check vendor với sai số
        vendorTokens.forEach(vToken => {
          if (vToken.length >= 4) {
            const distance = levenshteinDistance(qToken, vToken);
            const maxLen = Math.max(qToken.length, vToken.length);
            const similarity = (maxLen - distance) / maxLen;
            if (similarity >= 0.7) {
              totalScore += similarity * 200 * 5; // Weight x5 cho vendor
              vendorMatches++;
            }
          }
        });
      }
    });
  }

  // BONUS: Cross-match (khớp cả Name + NCC)
  if (nameMatches > 0 && vendorMatches > 0) {
    totalScore += 1000;
  }

  return totalScore;
};

// Hàm tìm kiếm chính với 2 chế độ
const performSearch = (query, products, searchMode = 'fuzzy') => {
  if (!query.trim()) {
    return products.slice(0, 50);
  }

  if (searchMode === 'exact') {
    // EXACT MODE: Sử dụng Tier-based scoring (Name > NCC > Code)
    const scored = products.map(product => ({
      ...product,
      score: calculateFieldScoreExactTiered(query, product),
      vendor: extractVendor(product.attributes) // Cache vendor for display
    }));

    return scored
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
  }

  // FUZZY MODE: Sử dụng Smart Suggest (Name > NCC > Attributes > Code)
  const scored = products.map(product => ({
    ...product,
    score: calculateFieldScoreFuzzyTiered(query, product),
    vendor: extractVendor(product.attributes) // Cache vendor for display
  }));

  return scored
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);
};

// ==================== COMPONENT ====================

export default function SmartSearch() {
  const { user, userRole, isAdmin, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchMode, setSearchMode] = useState('fuzzy');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [viewingHistory, setViewingHistory] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'table'
  const [recentActivities, setRecentActivities] = useState([]); // Hoạt động gần đây
  const [showActivitySidebar, setShowActivitySidebar] = useState(false); // Sidebar toggle

  // Load dữ liệu từ Firestore
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

  // Debounce search query - Chỉ search sau khi user dừng typing 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Tìm kiếm với debounced query
  const searchResults = useMemo(() => {
    return performSearch(debouncedQuery, products, searchMode);
  }, [debouncedQuery, products, searchMode]);

  // Format số tiền
  const formatPrice = (price) => {
    if (!price || price === 0) return '0';
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  // Highlight text match - FIXED
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
        <mark className="bg-amber-200 text-slate-900 px-0.5 rounded">{match}</mark>
        {after}
      </>
    );
  };

  const toggleExpand = (productId) => {
    setExpandedItems(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

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

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleBulkUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setBulkUploading(true);
    setBulkResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      let updated = 0;
      let notFound = 0;
      let priceChanged = 0;

      for (const row of jsonData) {
        const code = row['Mã hàng'] || row['code'];
        const newPrice = parseFloat(row['Giá bán'] || row['price']) || 0;
        const newCost = parseFloat(row['Giá vốn'] || row['cost']) || 0;

        if (!code) continue;

        const product = products.find(p => p.code === code);

        if (!product) {
          notFound++;
          continue;
        }

        const oldPrice = product.price || 0;
        const oldCost = product.cost || 0;

        const productRef = doc(db, 'products', product.id);
        await updateDoc(productRef, {
          price: newPrice,
          cost: newCost
        });

        if (newPrice !== oldPrice) {
          await addDoc(collection(db, 'auditLog'), {
            productId: product.id,
            productCode: code,
            productName: product.name,
            fieldChanged: 'price',
            oldValue: oldPrice,
            newValue: newPrice,
            delta: newPrice - oldPrice,
            changedAt: serverTimestamp(),
            changedBy: user?.email || 'bulk_update',
            source: 'excel_upload'
          });
          priceChanged++;
        }

        if (newCost !== oldCost) {
          await addDoc(collection(db, 'auditLog'), {
            productId: product.id,
            productCode: code,
            productName: product.name,
            fieldChanged: 'cost',
            oldValue: oldCost,
            newValue: newCost,
            delta: newCost - oldCost,
            changedAt: serverTimestamp(),
            changedBy: user?.email || 'bulk_update',
            source: 'excel_upload'
          });
          priceChanged++;
        }

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
    } catch (err) {
      console.error('❌ Lỗi bulk upload:', err);
      alert('Lỗi khi upload: ' + err.message);
    }

    setBulkUploading(false);
    event.target.value = '';
  };

  const viewHistory = async (product) => {
    setViewingHistory(product.id);
    setPriceHistory([]);

    try {
      const q = query(
        collection(db, 'auditLog'),
        where('productId', '==', product.id),
        orderBy('changedAt', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(q);
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setPriceHistory(history);
    } catch (err) {
      console.error('❌ Lỗi load history:', err);
      alert('Lỗi khi tải lịch sử: ' + err.message);
    }
  };

  const closeHistory = () => {
    setViewingHistory(null);
    setPriceHistory([]);
  };

  // Helper function để log changes - TỐI ƯU CODE
  const logFieldChange = async (productId, productCode, productName, fieldName, oldValue, newValue, source = 'inline_edit') => {
    // Skip nếu không có thay đổi
    if (oldValue === newValue) return;

    // Xử lý các loại dữ liệu khác nhau
    const isNumericField = ['price', 'cost', 'stock'].includes(fieldName);
    const delta = isNumericField ? (parseFloat(newValue) || 0) - (parseFloat(oldValue) || 0) : null;

    const logEntry = {
      productId,
      productCode,
      productName,
      fieldChanged: fieldName,
      oldValue: oldValue || '',
      newValue: newValue || '',
      changedAt: serverTimestamp(),
      changedBy: user?.email || 'unknown',
      source
    };

    // Chỉ thêm delta cho numeric fields
    if (delta !== null) {
      logEntry.delta = delta;
    }

    await addDoc(collection(db, 'auditLog'), logEntry);
  };

  const saveEdit = async (productId) => {
    try {
      setSaving(true);

      const originalProduct = products.find(p => p.id === productId);

      // Parse numeric values
      const newPrice = parseFloat(editForm.price) || 0;
      const newCost = parseFloat(editForm.cost) || 0;
      const newStock = parseFloat(editForm.stock) || 0;

      // Update document in Firestore
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        code: editForm.code,
        name: editForm.name,
        price: newPrice,
        cost: newCost,
        stock: newStock,
        attributes: editForm.attributes
      });

      // Log TẤT CẢ các thay đổi - sử dụng helper function
      const changes = [
        { field: 'code', oldVal: originalProduct.code, newVal: editForm.code },
        { field: 'name', oldVal: originalProduct.name, newVal: editForm.name },
        { field: 'price', oldVal: originalProduct.price || 0, newVal: newPrice },
        { field: 'cost', oldVal: originalProduct.cost || 0, newVal: newCost },
        { field: 'stock', oldVal: originalProduct.stock || 0, newVal: newStock },
        { field: 'attributes', oldVal: originalProduct.attributes, newVal: editForm.attributes }
      ];

      // Batch log all changes
      await Promise.all(
        changes.map(({ field, oldVal, newVal }) =>
          logFieldChange(productId, editForm.code, editForm.name, field, oldVal, newVal, 'inline_edit')
        )
      );

      // Update local state
      setProducts(prev => prev.map(p =>
        p.id === productId
          ? { ...p, ...editForm, price: newPrice, cost: newCost, stock: newStock }
          : p
      ));

      // Thêm vào Recent Activities
      const changedFields = changes.filter(c => c.oldVal !== c.newVal);
      if (changedFields.length > 0) {
        const activity = {
          id: Date.now(),
          productId,
          productCode: editForm.code,
          productName: editForm.name,
          vendor: extractVendor(editForm.attributes),
          changedFields: changedFields.map(c => c.field),
          timestamp: new Date(),
          source: 'inline_edit'
        };
        setRecentActivities(prev => [activity, ...prev].slice(0, 20)); // Giữ max 20
      }

      setSaving(false);
      setEditingId(null);
      setEditForm({});
    } catch (err) {
      console.error('❌ Lỗi khi lưu:', err);
      alert('Lỗi khi lưu: ' + err.message);
      setSaving(false);
    }
  };

  // ✅ CONDITIONAL RENDER - Sau khi tất cả hooks đã chạy
  if (showAuditLog) {
    return <AuditLog onBack={() => setShowAuditLog(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - Fixed Top Navigation */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 bg-slate-900 rounded-lg">
                <Database className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Product Search</h1>
                <p className="text-xs text-slate-500 font-medium">
                  {loading ? 'Loading...' : `${products.length.toLocaleString()} products indexed`}
                </p>
              </div>
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-3">
              {/* User Badge */}
              <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-100 rounded-lg border border-slate-200">
                {isAdmin ? (
                  <Shield className="w-4 h-4 text-red-600" strokeWidth={2} />
                ) : (
                  <UserIcon className="w-4 h-4 text-blue-600" strokeWidth={2} />
                )}
                <div className="text-xs">
                  <div className="font-semibold text-slate-900">
                    {isAdmin ? 'Administrator' : 'Staff User'}
                  </div>
                  <div className="text-slate-500 font-mono text-[10px]">
                    {user?.email}
                  </div>
                </div>
              </div>

              {/* Activity Sidebar Toggle */}
              <button
                onClick={() => setShowActivitySidebar(!showActivitySidebar)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-semibold relative ${
                  showActivitySidebar
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                }`}
                title="Hoạt động gần đây"
              >
                <Activity className="w-4 h-4" strokeWidth={2} />
                {recentActivities.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {recentActivities.length}
                  </span>
                )}
              </button>

              {/* Audit Log Button - Admin Only */}
              {isAdmin && (
                <button
                  onClick={() => setShowAuditLog(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-sm font-semibold"
                  title="View System Audit Log"
                >
                  <FileText className="w-4 h-4" strokeWidth={2} />
                  Audit Log
                </button>
              )}

              {/* Bulk Upload - Admin Only */}
              {isAdmin && (
                <label className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer transition-all text-sm font-semibold">
                  <Upload className="w-4 h-4" strokeWidth={2} />
                  {bulkUploading ? 'Uploading...' : 'Import Excel'}
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleBulkUpload}
                    disabled={bulkUploading}
                    className="hidden"
                  />
                </label>
              )}

              {/* Logout */}
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-300 transition-all text-sm font-semibold"
              >
                <LogOut className="w-4 h-4" strokeWidth={2} />
                Logout
              </button>
            </div>
          </div>

          {/* Bulk Upload Result Banner */}
          {bulkResult && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <span className="text-slate-600 font-medium">Total Rows:</span>
                    <span className="ml-2 font-bold text-slate-900">{bulkResult.total}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 font-medium">Updated:</span>
                    <span className="ml-2 font-bold text-emerald-600">{bulkResult.updated}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 font-medium">Not Found:</span>
                    <span className="ml-2 font-bold text-orange-600">{bulkResult.notFound}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 font-medium">Price Changes:</span>
                    <span className="ml-2 font-bold text-blue-600">{bulkResult.priceChanged}</span>
                  </div>
                </div>
                <button
                  onClick={() => setBulkResult(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Search Bar - Sticky Below Header */}
      <div className="sticky top-[73px] z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Main Search Input */}
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" strokeWidth={2} />
            <input
              type="text"
              placeholder={
                searchMode === 'fuzzy'
                  ? 'Tìm gần đúng theo mã, tên, thuộc tính...'
                  : 'Tìm chính xác theo Tên + NCC (vd: Dây curoa Gates)'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-12 pr-4 py-3 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all bg-white text-slate-900 placeholder:text-slate-400 ${
                searchMode === 'fuzzy'
                  ? 'border-indigo-400 focus:ring-indigo-500'
                  : 'border-emerald-500 focus:ring-emerald-500'
              }`}
              autoFocus
            />
          </div>

          {/* Search Mode Toggle & Results Count */}
          <div className="flex items-center justify-between">
            {/* Mode Selector - CẢI TIẾN: Màu sắc tương phản mạnh */}
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                <button
                  onClick={() => setSearchMode('fuzzy')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md transition-all text-xs font-bold uppercase tracking-wide ${
                    searchMode === 'fuzzy'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Zap className="w-4 h-4" strokeWidth={2.5} />
                  Fuzzy
                </button>
                <button
                  onClick={() => setSearchMode('exact')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md transition-all text-xs font-bold uppercase tracking-wide ${
                    searchMode === 'exact'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Target className="w-4 h-4" strokeWidth={2.5} />
                  Exact
                </button>
              </div>

              {/* View Mode Toggle - Chỉ hiện khi mode Exact */}
              {searchMode === 'exact' && (
                <div className="inline-flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                  <button
                    onClick={() => setViewMode('card')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-xs font-bold ${
                      viewMode === 'card'
                        ? 'bg-white text-slate-900 shadow'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                    title="Card View"
                  >
                    <LayoutGrid className="w-4 h-4" strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-xs font-bold ${
                      viewMode === 'table'
                        ? 'bg-white text-slate-900 shadow'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                    title="Table View"
                  >
                    <LayoutList className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              )}
            </div>

            {/* Results Count */}
            {searchQuery && (
              <div className="text-sm">
                <span className="font-bold text-slate-900">{searchResults.length}</span>
                <span className="text-slate-600"> results</span>
                {searchResults.length === 50 && (
                  <span className="ml-2 text-xs text-orange-600">(showing top 50)</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 text-sm font-medium">
            Error: {error}
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="bg-white rounded-lg border border-slate-200 p-5 animate-pulse">
                <div className="flex justify-between items-start">
                  <div className="flex-1 space-y-3">
                    <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                    <div className="flex gap-2">
                      <div className="h-6 w-24 bg-slate-200 rounded"></div>
                      <div className="h-6 w-32 bg-slate-200 rounded"></div>
                    </div>
                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                  </div>
                  <div className="ml-6 text-right space-y-2">
                    <div className="h-8 w-32 bg-slate-200 rounded"></div>
                    <div className="h-4 w-20 bg-slate-100 rounded ml-auto"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && (
          <div className="space-y-3">
            {searchResults.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-lg border border-slate-200">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                  <Search className="w-8 h-8 text-slate-400" strokeWidth={2} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                  {searchQuery ? 'No products found' : 'Start searching'}
                </h3>
                <p className="text-sm text-slate-500">
                  {searchQuery ? 'Try different keywords or fuzzy match mode' : 'Enter product code, name, or brand'}
                </p>
              </div>
            ) : searchMode === 'exact' && viewMode === 'table' ? (
              /* ========== COMPACT TABLE VIEW (Exact Mode) ========== */
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-bold text-slate-700 text-xs uppercase tracking-wide w-10">#</th>
                        <th className="px-3 py-2.5 text-left font-bold text-slate-700 text-xs uppercase tracking-wide min-w-[200px]">Tên hàng</th>
                        <th className="px-3 py-2.5 text-left font-bold text-slate-700 text-xs uppercase tracking-wide w-32">NCC</th>
                        <th className="px-3 py-2.5 text-left font-bold text-slate-700 text-xs uppercase tracking-wide min-w-[150px]">Thuộc tính</th>
                        {isAdmin && (
                          <th className="px-3 py-2.5 text-right font-bold text-slate-700 text-xs uppercase tracking-wide w-28">Giá vốn</th>
                        )}
                        <th className="px-3 py-2.5 text-right font-bold text-slate-700 text-xs uppercase tracking-wide w-28">Giá bán</th>
                        <th className="px-3 py-2.5 text-center font-bold text-slate-700 text-xs uppercase tracking-wide w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {searchResults.map((product, index) => {
                        const vendorColor = getVendorColor(product.vendor);
                        const cleanAttributes = product.attributes
                          ?.replace(/(?:NHÀ CUNG CẤP|NCC|VENDOR|SUPPLIER)[:\s]*[^,;\n]*/gi, '')
                          .replace(/^[,;\s]+|[,;\s]+$/g, '')
                          .trim() || '';

                        return (
                          <tr key={product.id} className="hover:bg-emerald-50 transition-colors">
                            <td className="px-3 py-2 text-slate-500 font-mono text-xs">{index + 1}</td>
                            <td className="px-3 py-2">
                              <div className="font-semibold text-slate-900 truncate max-w-xs" title={product.name}>
                                {highlightMatch(product.name || 'N/A', debouncedQuery)}
                              </div>
                              <div className="text-xs text-slate-500 font-mono">{product.code}</div>
                            </td>
                            <td className="px-3 py-2">
                              {product.vendor ? (
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold border ${vendorColor.bg} ${vendorColor.text} ${vendorColor.border}`}>
                                  {product.vendor}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-600 text-xs truncate max-w-[200px]" title={cleanAttributes}>
                              {cleanAttributes || '-'}
                            </td>
                            {isAdmin && (
                              <td className="px-3 py-2 text-right font-mono font-bold text-red-600 text-xs">
                                {formatPrice(product.cost)}
                              </td>
                            )}
                            <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                              {formatPrice(product.price)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex justify-center gap-1">
                                <button
                                  onClick={() => viewHistory(product)}
                                  className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                  title="Lịch sử"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={() => startEdit(product)}
                                    className="p-1 text-amber-600 hover:bg-amber-100 rounded transition-colors"
                                    title="Sửa"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* ========== CARD VIEW (Default / Fuzzy Mode) ========== */
              searchResults.map((product, index) => {
                const isEditing = editingId === product.id;
                const isExpanded = expandedItems[product.id];

                return (
                  <div
                    key={product.id}
                    className={`bg-white rounded-lg border-l-4 border-r border-t border-b transition-all group ${
                      isEditing
                        ? 'border-l-amber-500 border-amber-300 shadow-md ring-2 ring-amber-100'
                        : searchMode === 'fuzzy'
                        ? 'border-l-indigo-500 border-slate-200 hover:border-indigo-600 hover:shadow-md'
                        : 'border-l-emerald-500 border-slate-200 hover:border-emerald-600 hover:shadow-md'
                    }`}
                  >
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        {/* Product Info */}
                        <div className="flex-1">
                          {/* Rank Badge */}
                          {searchQuery && index < 3 && !isEditing && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-900 text-white rounded text-xs font-bold mb-2">
                              #{index + 1}
                            </div>
                          )}

                          {/* Edit Mode Badge */}
                          {isEditing && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-500 text-white rounded text-xs font-bold mb-2">
                              <Edit3 className="w-3 h-3" />
                              EDITING
                            </div>
                          )}

                          {/* Product Name */}
                          {isEditing ? (
                            <div className="mb-3">
                              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                                Product Name
                              </label>
                              <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-lg font-semibold"
                              />
                            </div>
                          ) : (
                            <h3 className="text-lg font-bold text-slate-900 mb-3 leading-tight">
                              {highlightMatch(product.name || 'Unnamed Product', debouncedQuery)}
                            </h3>
                          )}

                          {/* Product Code & Tags */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {isEditing ? (
                              <div className="w-full">
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                                  Product Code
                                </label>
                                <input
                                  type="text"
                                  value={editForm.code}
                                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm"
                                />
                              </div>
                            ) : (
                              <>
                                {product.code && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-bold font-mono">
                                    <Tag className="w-3 h-3" strokeWidth={2.5} />
                                    {highlightMatch(product.code, debouncedQuery)}
                                  </span>
                                )}
                                {/* NCC Tag với màu sắc riêng */}
                                {product.vendor && (
                                  <span className={`inline-flex px-2.5 py-1 rounded text-xs font-bold border ${getVendorColor(product.vendor).bg} ${getVendorColor(product.vendor).text} ${getVendorColor(product.vendor).border}`}>
                                    {highlightMatch(product.vendor, debouncedQuery)}
                                  </span>
                                )}
                                {product.brand && (
                                  <span className="px-2.5 py-1 bg-slate-700 text-white rounded text-xs font-semibold">
                                    {highlightMatch(product.brand, debouncedQuery)}
                                  </span>
                                )}
                                {product.group && (
                                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-semibold">
                                    {product.group}
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          {/* Attributes */}
                          {isEditing ? (
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                                Attributes
                              </label>
                              <textarea
                                value={editForm.attributes}
                                onChange={(e) => setEditForm({ ...editForm, attributes: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                                rows="2"
                              />
                            </div>
                          ) : (
                            product.attributes && (
                              <p className="text-sm text-slate-600 leading-relaxed">
                                {highlightMatch(product.attributes, debouncedQuery)}
                              </p>
                            )
                          )}
                        </div>

                        {/* Pricing Info */}
                        <div className="text-right ml-6 min-w-[160px]">
                          {isEditing ? (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                                  Sale Price
                                </label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={editForm.price}
                                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right font-bold text-sm"
                                  />
                                  <span className="text-xs text-slate-500">đ</span>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                                  Cost Price
                                </label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={editForm.cost}
                                    onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-right font-bold text-sm"
                                  />
                                  <span className="text-xs text-slate-500">đ</span>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                                  Stock
                                </label>
                                <input
                                  type="number"
                                  value={editForm.stock}
                                  onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right font-bold text-sm"
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="text-2xl font-black text-slate-900 mb-1 font-mono">
                                {formatPrice(product.price)}
                                <span className="text-sm text-slate-500 ml-1">đ</span>
                              </div>
                              <div className="text-xs text-slate-500 font-medium mb-3">
                                {product.unit || 'Unit'}
                              </div>
                              {isAdmin && product.cost !== 0 && (
                                <div className="text-sm text-red-600 font-bold bg-red-50 px-2 py-1 rounded border border-red-200 inline-block font-mono">
                                  {formatPrice(product.cost)} đ
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Expanded Details - CẢI TIẾN: Bảng đầy đủ tất cả thông tin */}
                      {isExpanded && !isEditing && (
                        <div className="mt-4 pt-4 border-t-2 border-slate-300">
                          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            Detailed Information
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-100">
                                  <th className="px-3 py-2 text-left font-bold text-slate-700 uppercase tracking-wide border border-slate-300">Field</th>
                                  <th className="px-3 py-2 text-left font-bold text-slate-700 uppercase tracking-wide border border-slate-300">Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(product).map(([key, value]) => {
                                  // Skip internal fields
                                  if (key === 'id' || key === 'score' || value === null || value === undefined || value === '') return null;
                                  // Skip Firebase Timestamp objects (can't render directly)
                                  if (value && typeof value === 'object' && (value.toDate || value.seconds)) return null;
                                  // Hide cost for non-admin
                                  if (!isAdmin && key === 'cost') return null;

                                  // Safely convert value to string
                                  let displayValue = value;
                                  try {
                                    if (typeof value === 'object') {
                                      displayValue = JSON.stringify(value);
                                    } else {
                                      displayValue = String(value);
                                    }
                                  } catch (e) {
                                    displayValue = '[Object]';
                                  }

                                  return (
                                    <tr key={key} className="hover:bg-slate-50">
                                      <td className="px-3 py-2 font-semibold text-slate-600 border border-slate-200 bg-slate-50 w-1/3 uppercase text-[10px] tracking-wider">
                                        {key}
                                      </td>
                                      <td className="px-3 py-2 text-slate-900 border border-slate-200 font-medium">
                                        {key === 'price' || key === 'cost' ? (
                                          <span className={`font-mono font-bold ${key === 'cost' ? 'text-red-700' : 'text-blue-700'}`}>
                                            {formatPrice(value)} đ
                                          </span>
                                        ) : key === 'barcode' || key === 'code' ? (
                                          <span className="font-mono text-slate-900">{displayValue}</span>
                                        ) : (
                                          displayValue
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons - CẢI TIẾN: Ẩn/hiện khi hover + icon compact */}
                      <div className="mt-4 flex items-center justify-between">
                        {isEditing ? (
                          <div className="flex gap-2 w-full">
                            <button
                              onClick={() => saveEdit(product.id)}
                              disabled={saving}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all text-sm font-semibold disabled:opacity-50"
                            >
                              <Save className="w-4 h-4" strokeWidth={2} />
                              {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={saving}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-all text-sm font-semibold disabled:opacity-50"
                            >
                              <X className="w-4 h-4" strokeWidth={2} />
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Details button - luôn hiển thị */}
                            <button
                              onClick={() => toggleExpand(product.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-all text-xs font-semibold"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5" strokeWidth={2} />
                                  Hide
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
                                  Show All
                                </>
                              )}
                            </button>

                            {/* Hover actions - chỉ hiện khi hover */}
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => viewHistory(product)}
                                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-all"
                                title="View Price History"
                              >
                                <History className="w-4 h-4" strokeWidth={2} />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => startEdit(product)}
                                  className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded transition-all"
                                  title="Edit Product"
                                >
                                  <Edit3 className="w-4 h-4" strokeWidth={2} />
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Debug Info */}
        {debouncedQuery && searchResults.length > 0 && (
          <div className="mt-6 p-3 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600">
            <span className="font-semibold">Debug:</span> Top result score = {searchResults[0].score.toFixed(2)}
            {searchQuery !== debouncedQuery && (
              <span className="ml-2 text-orange-600">⏳ Searching...</span>
            )}
          </div>
        )}
      </main>

      {/* Price History Modal */}
      {viewingHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History className="w-7 h-7" strokeWidth={2} />
                  <div>
                    <h2 className="text-xl font-bold">Change History</h2>
                    <p className="text-sm text-slate-300 mt-0.5">
                      {products.find(p => p.id === viewingHistory)?.name || 'Loading...'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeHistory}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {priceHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                    <Clock className="w-8 h-8 text-slate-400" strokeWidth={2} />
                  </div>
                  <p className="text-slate-600 text-lg font-semibold">No change history yet</p>
                  <p className="text-slate-500 text-sm mt-1">Changes will appear here when you edit this product</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {priceHistory.map((record, index) => {
                    // Hide cost changes for non-admin
                    if (!isAdmin && record.fieldChanged === 'cost') {
                      return null;
                    }

                    const timestamp = record.changedAt?.toDate?.() || new Date();
                    const isNumericField = ['price', 'cost', 'stock'].includes(record.fieldChanged);
                    const isIncrease = record.delta > 0;

                    // Field display names
                    const fieldNames = {
                      price: 'Sale Price',
                      cost: 'Cost Price',
                      stock: 'Stock',
                      name: 'Product Name',
                      code: 'Product Code',
                      attributes: 'Description/Attributes'
                    };

                    return (
                      <div
                        key={record.id}
                        className={`p-4 rounded-lg border ${
                          isNumericField
                            ? isIncrease
                              ? 'bg-red-50 border-red-200'
                              : 'bg-emerald-50 border-emerald-200'
                            : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {isNumericField ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
                                isIncrease
                                  ? 'bg-red-600 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}>
                                {isIncrease ? (
                                  <>
                                    <TrendingUp className="w-3 h-3" strokeWidth={2.5} />
                                    INCREASE
                                  </>
                                ) : (
                                  <>
                                    <TrendingDown className="w-3 h-3" strokeWidth={2.5} />
                                    DECREASE
                                  </>
                                )}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-blue-600 text-white">
                                <Edit3 className="w-3 h-3" strokeWidth={2.5} />
                                MODIFIED
                              </span>
                            )}
                            <span className="font-mono text-xs text-slate-500">
                              #{index + 1}
                            </span>
                          </div>
                          <div className="text-right text-xs">
                            <div className="text-slate-600 font-medium">
                              {timestamp.toLocaleDateString('vi-VN')}
                            </div>
                            <div className="text-slate-500">
                              {timestamp.toLocaleTimeString('vi-VN')}
                            </div>
                          </div>
                        </div>

                        <div className={`grid ${isNumericField ? 'grid-cols-3' : 'grid-cols-2'} gap-4 text-sm`}>
                          <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                              Field Changed
                            </div>
                            <div className="font-bold text-slate-900">
                              {fieldNames[record.fieldChanged] || record.fieldChanged}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                              Old → New
                            </div>
                            <div className={`text-sm ${isNumericField ? 'font-mono' : ''}`}>
                              <span className="line-through text-slate-500">
                                {isNumericField ? formatPrice(record.oldValue) : record.oldValue || '(empty)'}
                              </span>
                              <span className="mx-1.5">→</span>
                              <span className="font-bold text-slate-900">
                                {isNumericField ? formatPrice(record.newValue) : record.newValue || '(empty)'}
                              </span>
                            </div>
                          </div>
                          {isNumericField && (
                            <div>
                              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                Delta
                              </div>
                              <div className={`font-bold text-base font-mono ${
                                isIncrease ? 'text-red-700' : 'text-emerald-700'
                              }`}>
                                {isIncrease ? '+' : ''}{formatPrice(record.delta)} {['price', 'cost'].includes(record.fieldChanged) ? 'đ' : 'units'}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 pt-3 border-t flex items-center gap-4 text-xs text-slate-600">
                          <span className="font-medium">
                            Source: {
                              record.source === 'inline_edit' ? 'Manual Edit' :
                              record.source === 'excel_upload' ? 'Excel Import' :
                              record.source
                            }
                          </span>
                          <span className="font-medium">
                            By: {record.changedBy}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 flex items-center justify-between border-t border-slate-200">
              <div className="text-sm text-slate-600">
                Total: <span className="font-bold text-slate-900">
                  {isAdmin
                    ? priceHistory.length
                    : priceHistory.filter(r => r.fieldChanged !== 'cost').length}
                </span> changes recorded
              </div>
              <button
                onClick={closeHistory}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition-all text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Sidebar */}
      {showActivitySidebar && (
        <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col">
          {/* Sidebar Header */}
          <div className="bg-indigo-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5" strokeWidth={2} />
                <h3 className="font-bold">Hoạt động gần đây</h3>
              </div>
              <button
                onClick={() => setShowActivitySidebar(false)}
                className="p-1 hover:bg-indigo-700 rounded transition-all"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>
            <p className="text-sm text-indigo-200 mt-1">
              Bấm vào để tìm lại sản phẩm
            </p>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto">
            {recentActivities.length === 0 ? (
              <div className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mb-3">
                  <Clock className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm">Chưa có hoạt động nào</p>
                <p className="text-slate-400 text-xs mt-1">
                  Các thay đổi sẽ hiển thị ở đây
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentActivities.map((activity) => {
                  const vendorColor = getVendorColor(activity.vendor);
                  const timeAgo = getTimeAgo(activity.timestamp);

                  return (
                    <button
                      key={activity.id}
                      onClick={() => {
                        // Quick Access: Thực hiện Exact Search với mã sản phẩm
                        setSearchMode('exact');
                        setSearchQuery(activity.productCode);
                        setShowActivitySidebar(false);
                      }}
                      className="w-full p-3 hover:bg-indigo-50 transition-colors text-left group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-700">
                            {activity.productName}
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            {activity.productCode}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            {activity.vendor && (
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${vendorColor.bg} ${vendorColor.text} ${vendorColor.border}`}>
                                {activity.vendor}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              Đã sửa: {activity.changedFields.join(', ')}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] text-slate-400">
                            {timeAgo}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          {recentActivities.length > 0 && (
            <div className="p-3 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setRecentActivities([])}
                className="w-full px-3 py-2 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                Xóa lịch sử
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function: Tính thời gian trôi qua
function getTimeAgo(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  return new Date(date).toLocaleDateString('vi-VN');
}
