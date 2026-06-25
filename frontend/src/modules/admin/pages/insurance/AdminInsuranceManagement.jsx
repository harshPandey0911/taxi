import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Search, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  FileText, 
  AlertCircle, 
  Clock, 
  ChevronRight,
  Filter
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import api from '../../../../shared/api/axiosInstance';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from "framer-motion";

const labelClass = "block text-xs font-semibold text-gray-500 mb-1.5";
const selectClass = "w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M6%209L12%2015L18%209%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:18px] bg-[right_12px_center] bg-no-repeat";

const AdminInsuranceManagement = () => {
  const [activeTab, setActiveTab] = useState('applications'); // 'applications' or 'plans'
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    vehicleType: '',
  });

  // State for Dynamic Pricing Plans
  const [plans, setPlans] = useState([]);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editRates, setEditRates] = useState({ '1_month': 0, '6_months': 0, '1_year': 0 });
  const [updatingPlan, setUpdatingPlan] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/insurance/admin');
      setRequests(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load insurance requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await api.get('/insurance/admin/plans');
      setPlans(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load premium plans');
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchPlans();
  }, []);

  const handleUpdatePlan = async (e) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      setUpdatingPlan(true);
      await api.put('/insurance/admin/plans', {
        vehicleType: editingPlan.vehicleType,
        rates: editRates
      });
      toast.success(`Premium rates for ${editingPlan.vehicleType} updated successfully!`);
      setEditingPlan(null);
      fetchPlans();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to update rates');
    } finally {
      setUpdatingPlan(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.patch(`/insurance/admin/${id}`, { status });
      toast.success(`Request successfully ${status}!`);
      fetchRequests();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to update insurance status');
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesSearch = 
        (r.vehicleNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.userId?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.policyNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus =
        !filters.status || r.status === filters.status;
      
      const matchesType =
        !filters.vehicleType || r.vehicleType === filters.vehicleType;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [filters, requests, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    return {
      pending: requests.filter(r => r.status === 'pending').length,
      active: requests.filter(r => r.status === 'active' || r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
    };
  }, [requests]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / entriesPerPage));
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;
    return filteredRequests.slice(startIndex, startIndex + entriesPerPage);
  }, [currentPage, entriesPerPage, filteredRequests]);

  useEffect(() => {
    setCurrentPage(1);
  }, [entriesPerPage, filters, searchTerm]);

  const getStatusBadgeClass = (status) => {
    const classes = {
      pending: 'bg-amber-50 text-amber-600 border border-amber-100',
      approved: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      active: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      rejected: 'bg-rose-50 text-rose-600 border border-rose-100',
    };
    return classes[status] || classes.pending;
  };

  const getDurationLabel = (d) => {
    if (d === '1_month') return '1 Month';
    if (d === '6_months') return '6 Months';
    return '1 Year';
  };

  return (
    <div className="min-h-screen bg-[#F3F4F9] animate-in fade-in duration-500 font-sans flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between shrink-0">
        <h1 className="text-[14px] font-black text-slate-800 uppercase tracking-tight">Insurance Management</h1>
        <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
          <span>Settings</span>
          <ChevronRight size={12} className="opacity-30" />
          <span className="text-gray-500">Vehicle Insurance</span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="bg-white border-b border-gray-100 px-8 py-1 flex gap-6 shrink-0 shadow-sm">
        <button
          onClick={() => setActiveTab('applications')}
          className={`pb-3 pt-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
            activeTab === 'applications' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Applications
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-3 pt-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
            activeTab === 'plans' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Manage Premium Rates
        </button>
      </div>

      {/* Summary Cards */}
      <div className="px-8 pt-8 grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0 max-w-7xl w-full mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Pending Requests</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{stats.pending}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Shield size={22} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Active Policies</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{stats.active}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle size={22} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Rejected Requests</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{stats.rejected}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 lg:p-10">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'applications' ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
              {/* Toolbar */}
              <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-3 text-[13px] text-gray-400 font-medium">
                  <span>show</span>
                  <select 
                    value={entriesPerPage} onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                    className="bg-white border border-gray-300 rounded-md px-2 py-1 text-slate-700 outline-none focus:border-indigo-500"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span>entries</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by Vehicle / User / Policy"
                      className="h-10 w-64 rounded-full border border-gray-200 bg-white pl-9 pr-4 text-[13px] font-medium text-slate-700 outline-none transition-colors focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen((current) => !current)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#EF6C4D] text-white rounded-lg text-[13px] font-bold shadow-md hover:bg-[#D95B3D] transition-colors"
                  >
                    <Filter size={16} /> {isFilterOpen ? 'Hide Filters' : 'Filters'}
                  </button>
                </div>
              </div>

              {/* Filters */}
              <AnimatePresence initial={false}>
                {isFilterOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-t border-gray-100"
                  >
                    <div className="grid grid-cols-1 gap-4 px-8 py-6 md:grid-cols-3">
                      <div>
                        <label className={labelClass}>Plan Status</label>
                        <select
                          value={filters.status}
                          onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                          className={selectClass}
                        >
                          <option value="">All Statuses</option>
                          <option value="pending">Pending</option>
                          <option value="active">Active</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Vehicle Type</label>
                        <select
                          value={filters.vehicleType}
                          onChange={(e) => setFilters(f => ({ ...f, vehicleType: e.target.value }))}
                          className={selectClass}
                        >
                          <option value="">All Types</option>
                          <option value="bike">Bike</option>
                          <option value="car">Car</option>
                          <option value="auto">Auto</option>
                          <option value="truck">Truck</option>
                        </select>
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => setFilters({ status: '', vehicleType: '' })}
                          className="h-[42px] w-full rounded-lg border border-gray-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                        >
                          Reset Filters
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Table */}
              <div className="px-8 pb-8">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#E9E9E9]">
                        <th className="px-6 py-4 text-[13px] font-bold text-slate-700">User Details</th>
                        <th className="px-6 py-4 text-[13px] font-bold text-slate-700">Vehicle Number</th>
                        <th className="px-6 py-4 text-[13px] font-bold text-slate-700">Vehicle Type</th>
                        <th className="px-6 py-4 text-[13px] font-bold text-slate-700">Plan Duration</th>
                        <th className="px-6 py-4 text-[13px] font-bold text-slate-700">Premium Cost</th>
                        <th className="px-6 py-4 text-[13px] font-bold text-slate-700">Policy Number</th>
                        <th className="px-6 py-4 text-[13px] font-bold text-slate-700">Status</th>
                        <th className="px-6 py-4 text-[13px] font-bold text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {loading ? (
                        <tr>
                          <td colSpan="8" className="py-24 text-center">
                            <Loader2 className="animate-spin text-indigo-600 mx-auto" size={32} />
                          </td>
                        </tr>
                      ) : paginatedRequests.length > 0 ? (
                        paginatedRequests.map(r => (
                          <tr key={r._id || r.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-50 last:border-0">
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-slate-700">{r.userId?.name || 'Customer'}</span>
                                <span className="text-[11px] text-gray-400 mt-0.5">{r.userId?.phone || 'No phone'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span className="text-[14px] font-bold text-slate-700 uppercase">{r.vehicleNumber}</span>
                            </td>
                            <td className="px-6 py-5">
                              <span className="text-[14px] font-medium text-slate-600 capitalize">{r.vehicleType}</span>
                            </td>
                            <td className="px-6 py-5">
                              <span className="text-[14px] font-medium text-slate-600">{getDurationLabel(r.duration)}</span>
                            </td>
                            <td className="px-6 py-5">
                              <span className="text-[14px] font-extrabold text-slate-800">₹{r.premiumAmount}</span>
                            </td>
                            <td className="px-6 py-5">
                              <span className="text-[13px] font-bold font-mono text-indigo-600">{r.policyNumber || 'N/A'}</span>
                            </td>
                            <td className="px-6 py-5">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(r.status)}`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              {r.status === 'pending' ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleUpdateStatus(r._id || r.id, 'active')}
                                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1"
                                  >
                                    <CheckCircle size={14} /> Approve
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(r._id || r.id, 'rejected')}
                                    className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1"
                                  >
                                    <XCircle size={14} /> Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 font-semibold italic">Processed</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="py-32 text-center text-gray-400 font-medium italic">
                            No insurance applications found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="mt-6 flex flex-col gap-4 border-t border-gray-100 pt-5 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
                  <span>
                    Showing {paginatedRequests.length ? (currentPage - 1) * entriesPerPage + 1 : 0} to{' '}
                    {(currentPage - 1) * entriesPerPage + paginatedRequests.length} of {filteredRequests.length} entries
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="min-w-[90px] text-center font-semibold text-slate-700">
                      Page {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Dynamic Rates Management Panel */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="border-b border-gray-100 pb-4 mb-6">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Active Coverage Premium Settings</h3>
                  <p className="text-[11px] text-gray-400 mt-1 font-semibold">Change dynamic vehicle policy pricing configurations stored in MongoDB database.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Rates list */}
                  <div className="space-y-4">
                    {plans.map((plan) => (
                      <div key={plan._id} className="p-5 border border-gray-100 rounded-2xl flex items-center justify-between hover:border-indigo-100 transition-colors bg-slate-50/50">
                        <div>
                          <span className="text-[14px] font-black uppercase text-indigo-600 tracking-tight">{plan.vehicleType} Insurance</span>
                          <div className="flex gap-4 mt-2 text-xs font-semibold text-slate-500">
                            <span>1 Month: ₹{plan.rates?.['1_month']}</span>
                            <span>6 Months: ₹{plan.rates?.['6_months']}</span>
                            <span>1 Year: ₹{plan.rates?.['1_year']}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setEditingPlan(plan);
                            setEditRates(plan.rates);
                          }}
                          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-colors"
                        >
                          Edit Rates
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Editor modal / container */}
                  <div>
                    {editingPlan ? (
                      <form onSubmit={handleUpdatePlan} className="p-6 border border-indigo-100 rounded-2xl bg-indigo-50/20 space-y-4">
                        <h4 className="text-xs font-black uppercase text-indigo-600 tracking-widest">Edit {editingPlan.vehicleType} Rates</h4>
                        
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">1 Month Premium Cost (₹)</label>
                          <input
                            type="number"
                            value={editRates['1_month']}
                            onChange={(e) => setEditRates(prev => ({ ...prev, '1_month': Number(e.target.value) }))}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 bg-white focus:border-indigo-500 outline-none transition-colors"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">6 Months Premium Cost (₹)</label>
                          <input
                            type="number"
                            value={editRates['6_months']}
                            onChange={(e) => setEditRates(prev => ({ ...prev, '6_months': Number(e.target.value) }))}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 bg-white focus:border-indigo-500 outline-none transition-colors"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">1 Year Premium Cost (₹)</label>
                          <input
                            type="number"
                            value={editRates['1_year']}
                            onChange={(e) => setEditRates(prev => ({ ...prev, '1_year': Number(e.target.value) }))}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 bg-white focus:border-indigo-500 outline-none transition-colors"
                          />
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            type="submit"
                            disabled={updatingPlan}
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-indigo-200 transition-colors disabled:opacity-50"
                          >
                            {updatingPlan ? 'Saving...' : 'Update Plan'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPlan(null)}
                            className="px-4 py-3 bg-white border border-gray-200 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="h-full min-h-[250px] border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-8 text-center text-slate-400">
                        <Shield size={36} className="opacity-30 mb-3" />
                        <p className="text-xs font-bold">Select a plan from the list to start editing its dynamic premium rates.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminInsuranceManagement;
