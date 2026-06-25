import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Shield, FileText, CheckCircle2, AlertCircle, Clock, Check, ChevronRight } from 'lucide-react';
import api from '../../../../shared/api/axiosInstance';
import toast from 'react-hot-toast';

const InsurancePortal = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('apply'); // 'apply' or 'my_policies'
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('car');
  const [duration, setDuration] = useState('1_month');
  const [provider, setProvider] = useState('acko');
  const [policies, setPolicies] = useState([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [premiumRates, setPremiumRates] = useState({
    bike: { '1_month': 100, '6_months': 500, '1_year': 900 },
    auto: { '1_month': 150, '6_months': 750, '1_year': 1300 },
    car: { '1_month': 300, '6_months': 1500, '1_year': 2700 },
    truck: { '1_month': 500, '6_months': 2500, '1_year': 4500 },
  });

  const providers = [
    { id: 'acko', name: 'Acko Gen', multiplier: 1 },
    { id: 'icici', name: 'ICICI Lombard', multiplier: 1.1 },
    { id: 'reliance', name: 'Reliance Gen', multiplier: 0.95 },
    { id: 'digit', name: 'Go Digit', multiplier: 1.05 },
  ];

  const fetchPlans = async () => {
    try {
      const res = await api.get('/insurance/plans');
      if (res.data && Array.isArray(res.data)) {
        const ratesMap = {};
        res.data.forEach(plan => {
          ratesMap[plan.vehicleType] = plan.rates;
        });
        setPremiumRates(prev => ({ ...prev, ...ratesMap }));
      }
    } catch (err) {
      console.error('Failed to load premium rates dynamically', err);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const basePremium = premiumRates[vehicleType]?.[duration] || 0;
  const selectedProvider = providers.find((p) => p.id === provider) || providers[0];
  const calculatedPremium = basePremium * selectedProvider.multiplier;

  const fetchPolicies = async () => {
    try {
      setLoadingPolicies(true);
      const res = await api.get('/insurance/me');
      setPolicies(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load your insurance policies');
    } finally {
      setLoadingPolicies(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'my_policies') {
      fetchPolicies();
    }
  }, [activeTab]);

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (!vehicleNumber.trim()) {
      return toast.error('Please enter your vehicle number');
    }

    // Basic license plate format validation
    const cleanPlate = vehicleNumber.replace(/\s+/g, '').toUpperCase();
    if (cleanPlate.length < 6) {
      return toast.error('Please enter a valid vehicle number');
    }

    try {
      setSubmitting(true);
      await api.post('/insurance', {
        vehicleNumber: cleanPlate,
        vehicleType,
        duration,
        provider,
      });
      toast.success('Insurance request submitted successfully!');
      setVehicleNumber('');
      setActiveTab('my_policies');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to submit insurance application');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { bg: 'bg-amber-50 text-amber-700 border-amber-100', icon: <Clock size={12} />, label: 'Pending Approval' },
      approved: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: <CheckCircle2 size={12} />, label: 'Approved' },
      active: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: <Shield size={12} />, label: 'Active Policy' },
      rejected: { bg: 'bg-rose-50 text-rose-700 border-rose-100', icon: <AlertCircle size={12} />, label: 'Rejected' },
    };
    const config = configs[status] || configs.pending;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${config.bg}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const getDurationLabel = (d) => {
    if (d === '1_month') return '1 Month Plan';
    if (d === '6_months') return '6 Months Plan';
    return '1 Year Annual Plan';
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#F3F4F6_38%,#EEF2F7_100%)] pb-24 max-w-lg mx-auto relative font-sans no-scrollbar">
      {/* Upper Glows */}
      <div className="absolute -top-16 right-[-40px] h-44 w-44 rounded-full bg-indigo-100/60 blur-3xl pointer-events-none" />
      <div className="absolute top-52 left-[-60px] h-52 w-52 rounded-full bg-emerald-100/60 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 px-5 pt-6 pb-4 flex items-center justify-between border-b border-slate-800 bg-slate-900 shadow-md">
        <button
          onClick={() => navigate('/user')}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/5 active:scale-95 transition-all"
        >
          <ArrowLeft size={16} className="text-white" />
        </button>
        <h1 className="text-[16px] font-black text-white tracking-tight">Vehicle Insurance</h1>
        <div className="w-9 h-9" /> {/* Spacer */}
      </div>

      {/* Tabs */}
      <div className="px-5 mt-6 relative z-10">
        <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200/40">
          <button
            onClick={() => setActiveTab('apply')}
            className={`flex-1 py-3 text-center text-xs font-bold rounded-xl transition-all ${
              activeTab === 'apply' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Apply Insurance
          </button>
          <button
            onClick={() => setActiveTab('my_policies')}
            className={`flex-1 py-3 text-center text-xs font-bold rounded-xl transition-all ${
              activeTab === 'my_policies' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            My Policies
          </button>
        </div>
      </div>

      {/* Active Tab Panel */}
      <div className="relative z-10 px-5 mt-6">
        <AnimatePresence mode="wait">
          {activeTab === 'apply' ? (
            <motion.form
              key="apply"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              onSubmit={handlePurchase}
              className="space-y-5 rounded-[28px] border border-white/80 bg-white/70 p-5 shadow-[0_24px_48px_rgba(15,23,42,0.06)] backdrop-blur-xl"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Instant Vehicle Insurance</h3>
                  <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-0.5">Secure your vehicle today</p>
                </div>
              </div>

              {/* Vehicle Number */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Vehicle Number *</label>
                <input
                  type="text"
                  placeholder="e.g. MP09AB1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 bg-white/90 focus:border-indigo-500 outline-none transition-colors shadow-inner uppercase"
                />
              </div>

              {/* Vehicle Type */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Vehicle Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {['bike', 'car', 'auto', 'truck'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setVehicleType(type)}
                      className={`py-3 text-center text-xs font-bold rounded-xl border capitalize transition-all ${
                        vehicleType === type
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-600 shadow-sm'
                          : 'border-slate-200 bg-white/90 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Provider Selection */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Insurance Provider</label>
                <div className="grid grid-cols-2 gap-2">
                  {providers.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setProvider(item.id)}
                      className={`py-3 px-2 text-center text-xs font-bold rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${
                        provider === item.id
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-600 shadow-sm'
                          : 'border-slate-200 bg-white/90 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <span>{item.name}</span>
                      <span className="text-[9px] font-medium opacity-80">
                        {item.multiplier === 1 ? 'Base Premium' : item.multiplier > 1 ? `+${Math.round((item.multiplier - 1) * 100)}% Premium` : `-${Math.round((1 - item.multiplier) * 100)}% Discount`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Selection */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Policy Tenure</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '1_month', label: '1 Month' },
                    { id: '6_months', label: '6 Months' },
                    { id: '1_year', label: '1 Year' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDuration(item.id)}
                      className={`py-3 text-center text-xs font-bold rounded-xl border transition-all ${
                        duration === item.id
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-600 shadow-sm'
                          : 'border-slate-200 bg-white/90 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Premium Calculation Summary */}
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-2.5">
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span>Standard Coverage Premium</span>
                  <span>₹{calculatedPremium.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span>GST & Service Taxes</span>
                  <span className="text-emerald-600">Included</span>
                </div>
                <div className="h-px bg-slate-200/60 my-2" />
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-800">Total Premium Cost</span>
                  <span className="text-xl font-extrabold text-slate-900">₹{calculatedPremium.toFixed(0)}</span>
                </div>
              </div>

              {/* Purchase Trigger */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-98 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
              >
                {submitting ? 'Processing Request...' : `Purchase Plan (₹${calculatedPremium.toFixed(0)})`}
              </button>
            </motion.form>
          ) : (
            <motion.div
              key="my_policies"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-4"
            >
              {loadingPolicies ? (
                <div className="py-16 text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto" />
                  <p className="mt-3 text-xs font-semibold text-slate-400">Loading your policies...</p>
                </div>
              ) : policies.length > 0 ? (
                policies.map((p) => (
                  <div
                    key={p._id || p.id}
                    className="rounded-[28px] border border-white/80 bg-white/70 p-5 shadow-[0_16px_32px_rgba(15,23,42,0.04)] backdrop-blur-xl space-y-4 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100/50">
                          <FileText size={16} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">{p.vehicleNumber}</h4>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{p.provider || 'Acko'} • {p.vehicleType}</p>
                        </div>
                      </div>
                      {getStatusBadge(p.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Plan Term</p>
                        <p className="font-bold text-slate-800">{getDurationLabel(p.duration)}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Premium Amount</p>
                        <p className="font-extrabold text-slate-900">₹{p.premiumAmount?.toFixed(0)}</p>
                      </div>
                      {p.policyNumber && (
                        <div className="space-y-0.5 col-span-2 border-t border-slate-100 pt-2 flex justify-between items-center mt-1">
                          <div>
                            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Policy ID</p>
                            <p className="font-bold text-indigo-600 font-mono mt-0.5">{p.policyNumber}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Expires On</p>
                            <p className="font-semibold text-slate-600 mt-0.5">
                              {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString('en-IN') : 'Active'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center rounded-[28px] border border-white/80 bg-white/70 shadow-sm p-6">
                  <Shield size={44} className="mx-auto text-slate-300 stroke-[1.5]" />
                  <h3 className="mt-4 text-sm font-bold text-slate-800">No policies found</h3>
                  <p className="mt-1.5 text-xs text-slate-400 leading-normal max-w-[240px] mx-auto">
                    You don't have any active or pending insurance applications. Apply above to secure your rides!
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default InsurancePortal;
