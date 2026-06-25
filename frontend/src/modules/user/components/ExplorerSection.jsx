import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield } from 'lucide-react';
import insuranceBannerImg from '@/assets/images/insurance_banner.png';

const ExplorerSection = () => {
  const navigate = useNavigate();

  return (
    <div className="px-5 pb-8 flex flex-col gap-10">
      {/* Vehicle Insurance Section */}
      <div>
        <div className="mb-4 ml-1">
          <h2 className="text-[19px] font-black text-gray-900 tracking-tight">Vehicle Insurance</h2>
          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">
            Instant coverage plans for your rides
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/taxi/user/insurance')}
          className="w-full text-left rounded-[28px] overflow-hidden border border-white/80 bg-white/70 shadow-[0_24px_48px_rgba(15,23,42,0.06)] backdrop-blur-xl relative group active:scale-[0.99] transition-all duration-300"
        >
          <div className="relative h-[220px] w-full overflow-hidden">
            <img
              src={insuranceBannerImg}
              alt="Vehicle Insurance banner"
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
            />
          </div>

          <div className="p-4 flex items-center justify-between bg-white/50 border-t border-slate-100">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Policy Terms</p>
              <p className="text-[13px] font-bold text-slate-800 mt-0.5">Monthly, 6-Month, & Annual Coverage</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-100 group-hover:translate-x-1 transition-transform">
              <ArrowRight size={18} strokeWidth={3} />
            </div>
          </div>
        </button>
      </div>

    </div>
  );
};

export default ExplorerSection;
