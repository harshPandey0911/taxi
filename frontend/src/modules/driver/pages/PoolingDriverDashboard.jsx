import React, { useEffect, useState } from 'react';
import { Car, LoaderCircle, LogOut, Phone, ShieldCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clearDriverAuthState, getCurrentDriver } from '../services/registrationService';

const unwrap = (response) => response?.data?.data || response?.data || response;

const PoolingDriverDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const response = await getCurrentDriver();
        if (active) {
          setProfile(unwrap(response));
        }
      } catch (err) {
        if (active) {
          setError(err?.message || 'Unable to load pooling driver profile');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const vehicle = profile?.poolingVehicle || {};
  const image = profile?.vehicleImage || vehicle?.images?.[0] || '';

  const handleLogout = () => {
    clearDriverAuthState();
    navigate('/taxi/driver/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoaderCircle className="animate-spin text-slate-900" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-8">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Pooling Driver</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
              {profile?.name || 'Pooling Driver'}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm"
            aria-label="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-100 bg-rose-50 p-5 text-sm font-bold text-rose-600">
            {error}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[36px] border border-white bg-white shadow-xl shadow-slate-200/60">
          <div className="bg-slate-900 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest">
                <ShieldCheck size={12} />
                Connected
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {profile?.status || 'active'}
              </span>
            </div>

            <div className="mt-8 flex items-center gap-5">
              <div className="flex h-24 w-28 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white/10">
                {image ? (
                  <img src={image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Car size={36} className="text-white/60" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-2xl font-black">{profile?.vehicleMake || vehicle?.name || 'Pooling Vehicle'}</p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-teal-300">
                  {profile?.vehicleNumber || vehicle?.vehicleNumber || 'No plate'}
                </p>
                <p className="mt-3 text-sm font-semibold text-slate-300">
                  {[profile?.vehicleModel, profile?.vehicleColor].filter(Boolean).join(' - ') || 'Vehicle details'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-6">
            <div className="rounded-3xl bg-slate-50 p-5">
              <Phone className="text-teal-600" size={22} />
              <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Phone</p>
              <p className="mt-1 text-sm font-black text-slate-900">+91 {profile?.phone || '-'}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <Users className="text-teal-600" size={22} />
              <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Capacity</p>
              <p className="mt-1 text-sm font-black text-slate-900">{vehicle?.capacity || 0} seats</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-teal-100 bg-teal-50 p-5 text-sm font-semibold leading-6 text-teal-800">
          This login is connected directly to the pooling vehicle assigned with your phone number.
        </div>
      </div>
    </div>
  );
};

export default PoolingDriverDashboard;
