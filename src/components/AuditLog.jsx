// src/components/AuditLog.jsx - GLOBAL AUDIT LOG
import { useState, useEffect } from 'react';
import { Clock, TrendingUp, TrendingDown, Filter, X, Calendar, User as UserIcon, Package, ArrowLeft, FileText } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit as firestoreLimit, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export default function AuditLog({ onBack }) {
  const { user, isAdmin } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    days: 7,
    user: 'all',
    field: 'all',
    limit: 100
  });

  const [users, setUsers] = useState([]);

  // Format số tiền
  const formatPrice = (price) => {
    if (!price || price === 0) return '0';
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  // Load tất cả lịch sử
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        // Calculate date filter
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - filters.days);

        let historyData = [];

        try {
          // TRY: Query với Firestore orderBy (requires index)
          let q = query(
            collection(db, 'auditLog'),
            orderBy('changedAt', 'desc'),
            firestoreLimit(filters.limit)
          );

          const snapshot = await getDocs(q);
          historyData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        } catch (indexError) {
          console.warn('⚠️ Index not ready, falling back to load all and sort in JS:', indexError.message);

          // FALLBACK: Load all without orderBy, sort in JavaScript
          const snapshot = await getDocs(collection(db, 'auditLog'));
          historyData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Sort in JavaScript
          historyData.sort((a, b) => {
            const aTime = a.changedAt?.toDate?.() || new Date(0);
            const bTime = b.changedAt?.toDate?.() || new Date(0);
            return bTime - aTime; // Descending
          });

          // Limit in JavaScript
          historyData = historyData.slice(0, filters.limit);
        }

        // Filter by date
        historyData = historyData.filter(record => {
          const recordDate = record.changedAt?.toDate?.() || new Date();
          return recordDate >= daysAgo;
        });

        // Filter by user
        if (filters.user !== 'all') {
          historyData = historyData.filter(record => record.changedBy === filters.user);
        }

        // Filter by field
        if (filters.field !== 'all') {
          historyData = historyData.filter(record => record.fieldChanged === filters.field);
        }

        // Hide cost changes for non-admin
        if (!isAdmin) {
          historyData = historyData.filter(record => record.fieldChanged !== 'cost');
        }

        // Extract unique users
        const uniqueUsers = [...new Set(historyData.map(r => r.changedBy))].filter(Boolean);
        setUsers(uniqueUsers);

        setHistory(historyData);
        setLoading(false);
      } catch (err) {
        console.error('❌ Lỗi load audit log:', err);

        // Better error message
        let errorMsg = err.message;
        if (err.code === 'permission-denied') {
          errorMsg = 'Permission denied. Please check Firebase Security Rules for auditLog collection.';
        } else if (errorMsg.includes('index')) {
          errorMsg = 'Firebase index is building. Please wait 5-15 minutes or check Firebase Console → Indexes.';
        }

        setError(errorMsg);
        setLoading(false);
      }
    };

    fetchHistory();
  }, [filters, isAdmin]);

  // Error boundary
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg border border-red-200 p-6">
          <h2 className="text-lg font-bold text-red-900 mb-2">Error Loading Audit Log</h2>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <button
            onClick={onBack}
            className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-all text-sm font-semibold"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-lg transition-all"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" strokeWidth={2} />
              </button>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-slate-900 rounded-lg">
                  <FileText className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Audit Log</h1>
                  <p className="text-xs text-slate-500 font-medium">
                    {loading ? 'Loading...' : `${history.length.toLocaleString()} changes recorded`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-600" strokeWidth={2} />
            <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">Filters</span>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {/* Time Range */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                Time Range
              </label>
              <select
                value={filters.days}
                onChange={(e) => setFilters({ ...filters, days: parseInt(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Last 24 hours</option>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
            </div>

            {/* User Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                Changed By
              </label>
              <select
                value={filters.user}
                onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Users</option>
                {users.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* Field Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                Field Changed
              </label>
              <select
                value={filters.field}
                onChange={(e) => setFilters({ ...filters, field: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Fields</option>
                <option value="price">Price</option>
                {isAdmin && <option value="cost">Cost</option>}
                <option value="stock">Stock</option>
                <option value="name">Name</option>
                <option value="code">Code</option>
                <option value="attributes">Attributes</option>
              </select>
            </div>

            {/* Limit */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                Max Results
              </label>
              <select
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={50}>50 changes</option>
                <option value={100}>100 changes</option>
                <option value={200}>200 changes</option>
                <option value={500}>500 changes</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <main className="max-w-7xl mx-auto px-6 py-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="bg-white rounded-lg border border-slate-200 p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-slate-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-slate-200">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
              <Clock className="w-8 h-8 text-slate-400" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No changes found</h3>
            <p className="text-sm text-slate-500">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((record, index) => {
              const timestamp = record.changedAt?.toDate?.() || new Date();
              const isNumericField = ['price', 'cost', 'stock'].includes(record.fieldChanged);
              const isIncrease = record.delta > 0;

              // Field names mapping
              const fieldNames = {
                price: 'Sale Price',
                cost: 'Cost Price',
                stock: 'Stock',
                name: 'Product Name',
                code: 'Product Code',
                attributes: 'Description/Attributes'
              };

              // Border colors
              let borderColor = '#3b82f6'; // blue for text changes
              if (isNumericField) {
                borderColor = isIncrease ? '#dc2626' : '#059669'; // red/green for numeric
              }

              return (
                <div
                  key={record.id}
                  className="bg-white rounded-lg border-l-4 border-r border-t border-b transition-all hover:shadow-md"
                  style={{ borderLeftColor: borderColor }}
                >
                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Icon & Indicator */}
                      <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${
                        isNumericField
                          ? isIncrease ? 'bg-red-100' : 'bg-emerald-100'
                          : 'bg-blue-100'
                      }`}>
                        {isNumericField ? (
                          isIncrease ? (
                            <TrendingUp className="w-6 h-6 text-red-600" strokeWidth={2.5} />
                          ) : (
                            <TrendingDown className="w-6 h-6 text-emerald-600" strokeWidth={2.5} />
                          )
                        ) : (
                          <FileText className="w-6 h-6 text-blue-600" strokeWidth={2.5} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                            isNumericField
                              ? isIncrease
                                ? 'bg-red-100 text-red-700'
                                : 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {isNumericField ? (isIncrease ? 'INCREASE' : 'DECREASE') : 'MODIFIED'}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {timestamp.toLocaleDateString('vi-VN')} at {timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="text-sm">
                          <span className="font-bold text-slate-900">{record.productName || 'Unknown Product'}</span>
                          <span className="text-slate-500 mx-2">•</span>
                          <span className="text-slate-600">
                            <span className="font-semibold">{fieldNames[record.fieldChanged] || record.fieldChanged}</span>
                            {' changed from '}
                            {isNumericField ? (
                              <>
                                <span className="font-mono text-slate-900">{formatPrice(record.oldValue)} {['price', 'cost'].includes(record.fieldChanged) ? 'đ' : ''}</span>
                                {' to '}
                                <span className="font-mono font-bold text-slate-900">{formatPrice(record.newValue)} {['price', 'cost'].includes(record.fieldChanged) ? 'đ' : ''}</span>
                              </>
                            ) : (
                              <>
                                <span className="text-slate-900">"{record.oldValue || '(empty)'}"</span>
                                {' to '}
                                <span className="font-bold text-slate-900">"{record.newValue || '(empty)'}"</span>
                              </>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <UserIcon className="w-3 h-3" />
                            <span>{record.changedBy}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            <span className="font-mono">{record.productCode || 'N/A'}</span>
                          </div>
                          <div>
                            Source: <span className="font-semibold">
                              {record.source === 'inline_edit' ? 'Manual Edit' :
                               record.source === 'excel_upload' ? 'Excel Import' :
                               record.source}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Delta - only for numeric fields */}
                      {isNumericField && record.delta !== undefined && (
                        <div className="text-right">
                          <div className={`text-xl font-black font-mono ${
                            isIncrease ? 'text-red-700' : 'text-emerald-700'
                          }`}>
                            {isIncrease ? '+' : ''}{formatPrice(record.delta)} {['price', 'cost'].includes(record.fieldChanged) ? 'đ' : ''}
                          </div>
                          {record.oldValue !== 0 && (
                            <div className="text-xs text-slate-500 font-medium mt-1">
                              {((Math.abs(record.delta) / record.oldValue) * 100).toFixed(1)}%
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary Footer */}
        {!loading && history.length > 0 && (
          <div className="mt-6 bg-slate-900 rounded-lg p-4 text-white">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-black">{history.length}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Total Changes</div>
              </div>
              <div>
                <div className="text-2xl font-black text-red-400">
                  {history.filter(r => r.delta > 0).length}
                </div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Increases</div>
              </div>
              <div>
                <div className="text-2xl font-black text-emerald-400">
                  {history.filter(r => r.delta < 0).length}
                </div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Decreases</div>
              </div>
              <div>
                <div className="text-2xl font-black">{users.length}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Users Involved</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
