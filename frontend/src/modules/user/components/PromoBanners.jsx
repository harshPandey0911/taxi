import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Clock3, ShieldCheck, Sparkles } from 'lucide-react';

const rotatingCards = [
  {
    icon: Clock3,
    iconClass: 'text-orange-600',
    title: 'In a hurry?',
    description: 'Auto for shorter wait times.',
    actionClass: 'bg-orange-50 text-orange-500',
    path: '/taxi/user/ride/select-location',
    images: [
      { src: '/2_AutoRickshaw.png', alt: 'Auto' },
      { src: '/1_Bike.png', alt: 'Bike' },
    ],
  },
  {
    icon: ShieldCheck,
    iconClass: 'text-blue-600',
    title: 'Need more space?',
    description: 'Cab for luggage or comfort.',
    actionClass: 'bg-blue-50 text-blue-500',
    path: '/taxi/user/ride/select-location',
    images: [
      { src: '/4_Taxi.png', alt: 'Taxi' },
      { src: '/white_sedan_banner_car.png', alt: 'Sedan' },
    ],
  },
];

const ImageCarousel = ({ images, className }) => {
  const activeImage = images?.[0];

  if (!activeImage) return null;

  return (
    <div className={className}>
      <img src={activeImage.src} alt={activeImage.alt} className="w-full object-contain drop-shadow-xl" />
    </div>
  );
};

const PromoCard = ({ icon: Icon, iconClass, title, description, actionClass, path, images, onNavigate }) => (
  <motion.div
    whileTap={{ scale: 0.98 }}
    onClick={() => onNavigate(path)}
    className="relative min-h-[140px] overflow-hidden rounded-2xl border border-white/80 bg-white/88 p-3.5 shadow-[0_12px_28px_rgba(15,23,42,0.07)]"
  >
    <div className={`flex items-center gap-2 ${iconClass}`}>
      <Icon size={11} strokeWidth={2.5} />
    </div>
    <h3 className="mt-2.5 text-[17px] font-black leading-snug tracking-tight text-gray-900">{title}</h3>
    <p className="mt-1 max-w-[132px] text-[10px] font-bold leading-snug text-gray-500">{description}</p>
    <div className={`mt-3 inline-flex h-8 w-8 items-center justify-center rounded-full ${actionClass}`}>
      <ArrowRight size={15} strokeWidth={2.5} />
    </div>
    <ImageCarousel images={images} className="absolute bottom-1 right-1 w-[74px] opacity-95 pointer-events-none" />
  </motion.div>
);

const PromoBanners = () => {
  const navigate = useNavigate();

  return (
    <div className="px-5 space-y-4">
      <div className="mb-1 ml-1">
        <h2 className="text-[19px] font-black text-gray-900 tracking-tight">Recommended for you</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {rotatingCards.map((card, index) => (
          <PromoCard key={`${String(card.title || '').trim() || 'promo'}-${index}`} {...card} onNavigate={navigate} />
        ))}
      </div>
    </div>
  );
};

export default PromoBanners;
