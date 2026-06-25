import React, { useEffect, useMemo, useState } from 'react';
import * as Motion from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import {
    User,
    Car,
    FileText,
    Bell,
    History,
    CreditCard,
    UserPlus,
    ShieldCheck,
    HelpCircle,
    LogOut,
    ArrowRight,
    Star,
    Route,
    ChevronRight,
    CheckCircle2,
    Wallet,
    Info,
    Gift,
    Shield,
    BadgePercent,
    Check,
    Mail,
    HandCoins,
    Phone,
    X,
    Landmark,
    Menu,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DriverBottomNav from '../../shared/components/DriverBottomNav';
import { clearDriverAuthState, getCurrentDriver } from '../services/registrationService';
import api from '../../../shared/api/axiosInstance';

const unwrapDriver = (response) => response?.data?.data || response?.data || response || null;
const ROUTE_BOOKING_STORAGE_KEY = 'driver_route_booking_preferences';

const readRouteBookingPreferences = () => {
    try {
        const raw = localStorage.getItem(ROUTE_BOOKING_STORAGE_KEY);
        return raw ? JSON.parse(raw) : { enabled: false, coordinates: null, label: '' };
    } catch {
        return { enabled: false, coordinates: null, label: '' };
    }
};

const writeRouteBookingPreferences = (nextValue) => {
    localStorage.setItem(ROUTE_BOOKING_STORAGE_KEY, JSON.stringify(nextValue));
    return nextValue;
};

const formatRouteBookingLabel = (coordinates) => {
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
        return 'Receive requests from your selected area';
    }

    const [lng, lat] = coordinates;
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
        return 'Receive requests from your selected area';
    }

    return `Selected area ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
};

const normalizeRouteBookingPreferences = (routeBooking = null) => {
    const coordinates = Array.isArray(routeBooking?.coordinates) && routeBooking.coordinates.length === 2
        ? routeBooking.coordinates
        : null;

    return {
        enabled: Boolean(routeBooking?.enabled && coordinates),
        coordinates,
        label: String(routeBooking?.label || (coordinates ? formatRouteBookingLabel(coordinates) : '')).trim(),
        updatedAt: routeBooking?.updatedAt || null,
    };
};

const normalizeBankDetails = (bankDetails = {}) => ({
    accountHolderName: String(bankDetails?.accountHolderName || '').trim(),
    upiId: String(bankDetails?.upiId || '').trim(),
    qrCodeImage: String(bankDetails?.qrCodeImage || '').trim(),
    accountNumber: String(bankDetails?.accountNumber || '').trim(),
    ifsc: String(bankDetails?.ifsc || '').trim().toUpperCase(),
    branchName: String(bankDetails?.branchName || '').trim(),
    updatedAt: bankDetails?.updatedAt || null,
});

const DriverProfile = () => {
    const navigate = useNavigate();
    const [routeBookingPreferences, setRouteBookingPreferences] = useState(() => readRouteBookingPreferences());
    const [isLogoutOpen, setIsLogoutOpen] = useState(false);
    const [legalModal, setLegalModal] = useState(null);
    const [driver, setDriver] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [routeBookingBusy, setRouteBookingBusy] = useState(false);
    const [isOnline, setIsOnline] = useState(false);
    const [profileTab, setProfileTab] = useState('identity');
    const [isTogglingOnline, setIsTogglingOnline] = useState(false);
    const role = localStorage.getItem('role') || 'driver';
    const isOwner = role === 'owner';
    const routePrefix = isOwner ? '/taxi/owner' : '/taxi/driver';

    const toggleOnlineStatus = async () => {
        if (isTogglingOnline) return;
        setIsTogglingOnline(true);
        try {
            if (isOnline) {
                const response = await api.patch('/drivers/offline');
                const driverData = unwrapDriver(response);
                setIsOnline(Boolean(driverData?.isOnline));
            } else {
                let coords = [75.8577, 22.7196]; // fallback indore coords
                if (navigator.geolocation) {
                    try {
                        const pos = await new Promise((resolve, reject) => {
                            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 });
                        });
                        coords = [pos.coords.longitude, pos.coords.latitude];
                    } catch (err) {
                        console.warn("Geolocation failed, using default indore coords", err);
                    }
                }
                const response = await api.patch('/drivers/online', { location: coords });
                const driverData = unwrapDriver(response);
                setIsOnline(Boolean(driverData?.isOnline));
            }
        } catch (err) {
            console.error("Failed to toggle online status", err);
        } finally {
            setIsTogglingOnline(false);
        }
    };

    useEffect(() => {
        let active = true;

        const loadDriver = async () => {
            setIsLoading(true);
            setError('');

            try {
                const response = await getCurrentDriver();
                if (!active) return;
                const nextDriver = unwrapDriver(response);
                setDriver(nextDriver);
                setIsOnline(Boolean(nextDriver?.isOnline));
                const nextRouteBooking = normalizeRouteBookingPreferences(nextDriver?.routeBooking);
                setRouteBookingPreferences(writeRouteBookingPreferences(nextRouteBooking));
            } catch (err) {
                if (!active) return;
                setError(err?.message || 'Unable to load driver profile');
            } finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        };

        loadDriver();

        return () => {
            active = false;
        };
    }, []);

    const openLegal = (type) => {
        const contentMap = {
            driver_app: {
                title: 'Driver Application',
                Icon: UserPlus,
                description: 'Join the Rydon24 fleet as a certified driver.',
                content: `Rydon24 is always looking for professional, dedicated drivers to join our growing ecosystem. 

Steps to apply:
1. Ensure you have a valid Commercial Driving License.
2. Visit the Rydon24 Driver Onboarding center or use the Mobile App.
3. Submit required documents: Aadhaar, PAN, License, and Police Verification.
4. Complete the Biometric enrollment process at any authorized Service Center.
5. Once approved, you can start accepting rides and managing your earnings via the dashboard.`
            },
            terms: {
                title: 'Terms and Conditions',
                Icon: FileText,
                description: 'General rules for using the Rydon24 platform.',
                content: `By using the Rydon24 platform, you agree to comply with all applicable transport regulations and our safety standards.

Key Highlights:
• Professionalism: Drivers and Staff must maintain a high standard of service.
• Vehicle Readiness: All vehicles listed must be in active, roadworthy condition.
• Compliance: You must ensure all permits and insurance are valid.
• Platform Fees: Rydon24 charges a service fee for every successful booking handled.
• Account Security: You are responsible for keeping your credentials and biometric data secure.`
            },
            privacy: {
                title: 'Privacy Policy',
                Icon: Shield,
                description: 'How we handle your data and biometrics.',
                content: `Rydon24 takes data security seriously. We collect specific information to ensure safety and service quality.

Data Collected:
• Biometrics: Fingerprint hashes are stored encrypted (AES-256) for verification only. Raw images are never stored permanently.
• Location: Live GPS tracking is used during active bookings for safety.
• Contact: Phone and email are used for booking updates and support.
• Vehicle Data: Inspection logs and photos are kept for insurance purposes.

We do not share your biometric data with third-party advertising networks.`
            },
            refund: {
                title: 'Refund Policy',
                Icon: HandCoins,
                description: 'Cancellation and refund guidelines.',
                content: `Transparent refund rules for customers and partners.

Booking Cancellations:
• Customer-initiated: Refund varies based on how close the pickup time is.
• Operator-initiated: If a vehicle fails inspection, a full refund is processed to the customer.
• Service Center Fees: Fees for inspections are non-refundable once the inspection report is generated.

Processing Time: Refunds are typically credited back to the original payment method within 5-7 working days.`
            }
        };
        setLegalModal(contentMap[type]);
    };

    const handleLogout = () => {
        clearDriverAuthState();
        setIsLogoutOpen(false);
        navigate(`${routePrefix}/login`, { replace: true });
    };

    // Dynamic Section Data with Project-mapped Paths
    const driverName = useMemo(() => {
        if (!driver?.name) return 'Driver';
        return String(driver.name);
    }, [driver?.name]);

    const driverPhone = useMemo(() => driver?.phone || 'N/A', [driver?.phone]);
    const driverEmail = useMemo(() => driver?.email || 'N/A', [driver?.email]);
    const driverVehicle = useMemo(() => {
        const parts = [driver?.registerFor, driver?.vehicleType].filter(Boolean);
        return parts.length > 0 ? parts.join(' - ') : 'N/A';
    }, [driver?.registerFor, driver?.vehicleType]);
    const driverLocation = useMemo(() => driver?.city || 'N/A', [driver?.city]);
    const driverNumber = useMemo(() => driver?.vehicleNumber || 'N/A', [driver?.vehicleNumber]);
    const driverColor = useMemo(() => driver?.vehicleColor || 'N/A', [driver?.vehicleColor]);
    const driverRating = useMemo(() => Number(driver?.rating || 0), [driver?.rating]);
    const routeBookingSubtitle = useMemo(() => {
        if (!routeBookingPreferences.enabled) {
            return 'Receive requests from your live location';
        }

        return routeBookingPreferences.label || formatRouteBookingLabel(routeBookingPreferences.coordinates);
    }, [routeBookingPreferences.coordinates, routeBookingPreferences.enabled, routeBookingPreferences.label]);
    const bankDetails = useMemo(() => normalizeBankDetails(driver?.bankDetails), [driver?.bankDetails]);
    const bankDetailsSubtitle = useMemo(() => {
        if (bankDetails.accountHolderName) return bankDetails.accountHolderName;
        if (bankDetails.upiId) return bankDetails.upiId;
        if (bankDetails.accountNumber) return `A/C ${bankDetails.accountNumber.slice(-4).padStart(bankDetails.accountNumber.length, '*')}`;
        return 'Add UPI, QR and bank account';
    }, [bankDetails.accountHolderName, bankDetails.accountNumber, bankDetails.upiId]);

    const hasProfileImage = Boolean(driver?.profileImage);

    const openBankDetails = () => {
        navigate(`${routePrefix}/profile/bank-details`);
    };

    const handleRouteBookingToggle = async () => {
        if (routeBookingBusy) {
            return;
        }

        if (routeBookingPreferences.enabled) {
            setRouteBookingBusy(true);
            setError('');
            try {
                const response = await updateDriverProfile({
                    routeBooking: {
                        enabled: false,
                    },
                });
                const nextRouteBooking = normalizeRouteBookingPreferences(
                    unwrapDriver(response)?.routeBooking || { enabled: false },
                );
                setRouteBookingPreferences(writeRouteBookingPreferences(nextRouteBooking));
            } catch (err) {
                setError(err?.response?.data?.message || err?.message || 'Could not update route booking.');
            } finally {
                setRouteBookingBusy(false);
            }
            return;
        }

        if (!navigator.geolocation) {
            setError('Location is not available on this device.');
            return;
        }

        setRouteBookingBusy(true);
        setError('');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const nextCoordinates = [position.coords.longitude, position.coords.latitude];
                const nextLabel = formatRouteBookingLabel(nextCoordinates);

                try {
                    const response = await updateDriverProfile({
                        routeBooking: {
                            enabled: true,
                            coordinates: nextCoordinates,
                            label: nextLabel,
                        },
                    });
                    const nextRouteBooking = normalizeRouteBookingPreferences(
                        unwrapDriver(response)?.routeBooking || {
                            enabled: true,
                            coordinates: nextCoordinates,
                            label: nextLabel,
                        },
                    );
                    setRouteBookingPreferences(writeRouteBookingPreferences(nextRouteBooking));
                } catch (err) {
                    setError(err?.response?.data?.message || err?.message || 'Could not update route booking.');
                } finally {
                    setRouteBookingBusy(false);
                }
            },
            () => {
                setRouteBookingBusy(false);
                setError('Please allow location permission to enable route booking.');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
        );
    };

    const sections = [
        ...(isOwner ? [{
            title: 'Fleet Management',
            items: [
                { id: 'fleet', label: 'Manage Fleet', icon: <Car size={20} />, path: `${routePrefix}/vehicle-fleet` },
                { id: 'drivers', label: 'Manage Drivers', icon: <UserPlus size={20} />, path: `${routePrefix}/manage-drivers` },
            ]
        }] : []),
        {
            title: 'Your Account',
            items: [
                { id: 'personal', label: 'Personal Information', sub: driverPhone, icon: <User size={20} />, path: `${routePrefix}/edit-profile` },
                { id: 'wallet', label: 'Wallet', icon: <Wallet size={20} />, path: `${routePrefix}/wallet` },
                { id: 'bankDetails', label: 'Bank Details', sub: bankDetailsSubtitle, icon: <Landmark size={20} />, action: openBankDetails },
                ...(!isOwner ? [
                    { id: 'vehicle', label: 'My Vehicle', icon: <Car size={20} />, path: `${routePrefix}/vehicle-fleet` },
                ] : []),
                { id: 'docs', label: 'Documents', icon: <FileText size={20} />, path: `${routePrefix}/documents` },
                { id: 'history', label: 'Ride History', icon: <History size={20} />, path: `${routePrefix}/history` },
                { id: 'notifications', label: 'Notifications', icon: <Bell size={20} />, path: `${routePrefix}/notifications` },
            ]
        },
        {
            title: 'Benefits',
            items: [
                { id: 'refer', label: 'Refer & Earn', icon: <Gift size={20} />, path: `${routePrefix}/referral` },
                { id: 'incentives', label: 'Incentives', icon: <BadgePercent size={20} />, path: `${routePrefix}/incentives` },
                { id: 'sos', label: 'Emergency SOS', icon: <Shield size={20} />, path: `${routePrefix}/security` },
            ]
        },
        {
            title: 'Preferences',
            items: [
                { id: 'routeBooking', label: 'My Route Booking', sub: routeBookingSubtitle, icon: <Route size={20} />, type: 'toggle' },
            ]
        },
        {
            title: 'Legal & Support',
            items: [
                { id: 'driver_app', label: 'Driver Application', icon: <UserPlus size={20} />, action: () => openLegal('driver_app') },
                { id: 'terms', label: 'Terms & Conditions', icon: <FileText size={20} />, action: () => openLegal('terms') },
                { id: 'privacy', label: 'Privacy Policy', icon: <Shield size={20} />, action: () => openLegal('privacy') },
                { id: 'refund', label: 'Refund Policy', icon: <HandCoins size={20} />, action: () => openLegal('refund') },
            ]
        },
        {
            title: 'Danger Zone',
            items: [
                { id: 'deleteAccount', label: 'Delete Account', icon: <LogOut size={20} />, path: `${routePrefix}/delete-account` },
            ]
        }
    ];

    const formatIndianCurrency = (amount) => {
        const numericVal = Number(amount || 0);
        const sign = numericVal < 0 ? '-' : '';
        const absVal = Math.abs(numericVal);
        const formatted = absVal.toLocaleString('en-IN', {
            minimumFractionDigits: absVal % 1 === 0 ? 0 : 2,
            maximumFractionDigits: 2
        });
        return `${sign}₹${formatted}`;
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-32 text-slate-900 font-['Poppins'] max-w-lg mx-auto relative shadow-xl border-x border-slate-100 select-none">
            {/* Dark Header Area */}
            <div className="bg-[#0c1527] text-white pt-4 pb-12 px-5 relative">
                {/* Brand Navigation Bar */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button className="text-white hover:opacity-85">
                            <Menu size={22} />
                        </button>
                        <div>
                            <h2 className="text-sm font-black tracking-tight text-white uppercase">NINJA TRUCK</h2>
                            <p className="text-[8px] font-extrabold uppercase tracking-widest text-indigo-300 mt-0.5">PARTNER APP</p>
                        </div>
                    </div>

                    {/* LIVE Toggle status */}
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black tracking-widest ${isOnline ? 'text-emerald-400' : 'text-slate-400'}`}>LIVE</span>
                        <button
                            onClick={toggleOnlineStatus}
                            disabled={isTogglingOnline}
                            className={`w-12 h-6 rounded-full relative transition-all duration-300 ${isOnline ? 'bg-emerald-500' : 'bg-slate-700'}`}
                        >
                            <Motion.motion.div
                                animate={{ x: isOnline ? 26 : 2 }}
                                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
                            />
                        </button>
                    </div>
                </div>

                {/* Partner Account Header Title & edit button */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-black tracking-tight">Partner Account</h1>
                        <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mt-0.5">STATUS & CREDENTIALS</p>
                    </div>
                    <button
                        onClick={() => navigate(`${routePrefix}/edit-profile`)}
                        className="w-10 h-10 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </button>
                </div>

                {/* Profile Avatar Card Info */}
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-[20px] bg-slate-800 border border-white/10 overflow-hidden relative shadow-lg">
                        {hasProfileImage ? (
                            <img src={driver?.profileImage} alt={driverName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400">
                                <User size={28} />
                            </div>
                        )}
                    </div>
                    <div className="text-left space-y-1">
                        <div className="flex items-center gap-1.5">
                            <h2 className="text-lg font-black tracking-tight">{isLoading ? 'Loading...' : driverName}</h2>
                            <CheckCircle2 size={16} className="text-emerald-400 fill-emerald-400/20" />
                        </div>
                        <div className="flex flex-col gap-0.5 text-[10px] font-normal text-slate-300 tracking-wide">
                            <div className="flex items-center gap-1.5">
                                <Mail size={11} className="opacity-70" />
                                <span>{driverEmail}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Phone size={11} className="opacity-70" />
                                <span>{driverPhone}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grids Section */}
            <div className="relative -mt-6 px-4 z-10 grid grid-cols-2 gap-3">
                {/* Total Earnings */}
                <div className="bg-white rounded-3xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">TOTAL EARNINGS</p>
                        <p className="text-xs font-black text-slate-800 mt-0.5">{formatIndianCurrency(driver?.todaySummary?.earnings || 0)}</p>
                    </div>
                </div>

                {/* Available Payout */}
                <div className="bg-white rounded-3xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0 select-none font-normal text-base font-['Poppins']">
                        ₹
                    </div>
                    <div className="text-left">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">AVAILABLE PAYOUT</p>
                        <p className="text-xs font-black text-slate-800 mt-0.5">{formatIndianCurrency(driver?.wallet?.balance || 0)}</p>
                    </div>
                </div>

                {/* Cash in Hand */}
                <div className="bg-white rounded-3xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">CASH IN HAND</p>
                        <p className="text-xs font-black text-slate-800 mt-0.5">{formatIndianCurrency(driver?.wallet?.balance || 0)}</p>
                    </div>
                </div>

                {/* Total Deliveries */}
                <div className="bg-white rounded-3xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-500 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17h2m10 0h2" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">TOTAL DELIVERIES</p>
                        <p className="text-xs font-black text-slate-800 mt-0.5">{driver?.todaySummary?.rides || 0}</p>
                    </div>
                </div>
            </div>

            {/* Profile Tab Navigation Switch */}
            <div className="flex bg-slate-100 rounded-2xl p-1 mx-4 mt-5 font-sans text-[10px] font-black uppercase tracking-widest">
                <button
                    onClick={() => setProfileTab('identity')}
                    className={`flex-1 py-2.5 rounded-xl text-center transition-all ${profileTab === 'identity' ? 'bg-[#0c1527] text-white shadow-sm' : 'text-slate-500'}`}
                >
                    IDENTITY
                </button>
                <button
                    onClick={() => setProfileTab('settlement')}
                    className={`flex-1 py-2.5 rounded-xl text-center transition-all ${profileTab === 'settlement' ? 'bg-[#0c1527] text-white shadow-sm' : 'text-slate-500'}`}
                >
                    SETTLEMENT
                </button>
            </div>

            {/* Personal Ledger / Dynamic Detail Fields */}
            {profileTab === 'identity' ? (
                <div className="mt-5 mx-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-indigo-600 rounded-full"></span>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">PERSONAL LEDGER</h3>
                    </div>

                    <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm space-y-4">
                        {/* Full name inputcard */}
                        <div className="text-left">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">FULL NAME</label>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-black text-slate-800">
                                {isLoading ? '...' : driverName}
                            </div>
                        </div>

                        {/* Vehicle Type & Plate Number details */}
                        <div className="grid grid-cols-2 gap-3 text-left">
                            <div>
                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">VEHICLE TYPE</label>
                                <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-black text-slate-800">
                                    {driverVehicle || 'N/A'}
                                </div>
                            </div>
                            <div>
                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">PLATE NUMBER</label>
                                <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-black text-slate-800 truncate">
                                    {driverNumber || 'REGISTERING...'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mt-5 mx-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-indigo-600 rounded-full"></span>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">SETTLEMENT DETAILS</h3>
                    </div>

                    <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm space-y-4">
                        <div className="text-left">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">ACCOUNT HOLDER</label>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-black text-slate-800">
                                {bankDetails.accountHolderName || 'N/A'}
                            </div>
                        </div>
                        <div className="text-left">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">UPI ID</label>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-black text-slate-800">
                                {bankDetails.upiId || 'N/A'}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={openBankDetails}
                            className="w-full py-3 bg-[#0c1527] hover:bg-[#16223b] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                        >
                            UPDATE BANK DETAILS
                        </button>
                    </div>
                </div>
            )}

            {/* List Menus for options */}
            <div className="mt-6 px-4 space-y-2">
                {sections.map((section, sIdx) => (
                    <div key={sIdx} className="space-y-2 text-left">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{section.title}</h4>
                        <div className="bg-white rounded-[24px] border border-slate-100 p-2 shadow-sm space-y-1">
                            {section.items.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        if (item.action) item.action();
                                        else if (item.path) navigate(item.path);
                                    }}
                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-all text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="text-indigo-600 bg-indigo-50/50 p-2 rounded-lg">{item.icon}</div>
                                        <div>
                                            <p className="text-xs font-black text-slate-800">{item.label}</p>
                                            {item.sub && <p className="text-[9px] text-slate-400 font-normal mt-0.5">{item.sub}</p>}
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-400" />
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Sign Out Trigger */}
            <div className="px-6 py-6 text-center">
                <button
                    onClick={() => setIsLogoutOpen(true)}
                    className="inline-flex items-center gap-2 text-rose-500 font-black text-xs uppercase tracking-widest hover:text-rose-600 transition-colors"
                >
                    <LogOut size={14} />
                    Logout Account
                </button>
            </div>

            {/* Bottom Nav */}
            <DriverBottomNav />

            {/* Confirm Logout Drawer */}
            <AnimatePresence>
                {isLogoutOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 px-5 backdrop-blur-sm">
                        <Motion.motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-xs rounded-[28px] bg-white p-6 shadow-2xl border border-slate-100 space-y-6"
                        >
                            <div className="text-center space-y-2">
                                <h3 className="text-base font-black text-slate-900">Confirm Logout</h3>
                                <p className="text-xs font-normal text-slate-500">Are you sure you want to sign out from your account?</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setIsLogoutOpen(false)}
                                    className="py-3 rounded-xl border border-slate-200 text-xs font-black text-slate-600"
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="py-3 rounded-xl bg-rose-500 text-white text-xs font-black"
                                >
                                    LOGOUT
                                </button>
                            </div>
                        </Motion.motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Legal / Policy Modal */}
            <AnimatePresence>
                {legalModal && (
                    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 backdrop-blur-sm px-4 pb-8 sm:items-center sm:pb-0 max-w-lg mx-auto">
                        <Motion.motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            className="w-full overflow-hidden rounded-[32px] bg-white shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                        <legalModal.Icon size={22} />
                                    </div>
                                    <button
                                        onClick={() => setLegalModal(null)}
                                        className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="text-left">
                                    <h3 className="text-lg font-black text-slate-950">{legalModal.title}</h3>
                                    <p className="text-xs text-slate-400 font-normal mt-1">{legalModal.description}</p>
                                </div>

                                <div className="max-h-[30vh] overflow-y-auto text-left text-xs leading-6 text-slate-600 font-normal whitespace-pre-line pr-1">
                                    {legalModal.content}
                                </div>

                                <button
                                    onClick={() => setLegalModal(null)}
                                    className="w-full rounded-2xl bg-[#0c1527] py-4 text-xs font-black uppercase tracking-widest text-white shadow-md"
                                >
                                    UNDERSTOOD
                                </button>
                            </div>
                        </Motion.motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DriverProfile;
