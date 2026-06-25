import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import {
    AlertCircle,
    ArrowLeft,
    ArrowDownLeft,
    ArrowUpRight,
    CheckCircle2,
    Clock3,
    IndianRupee,
    RefreshCw,
    Wallet,
    X,
    ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DriverBottomNav from '../../shared/components/DriverBottomNav';
import api from '../../../shared/api/axiosInstance';
import { API_BASE_URL } from '../../../shared/api/runtimeConfig';
import { socketService } from '../../../shared/api/socket';
import { useSettings } from '../../../shared/context/SettingsContext';
import { isMobileOrWebView, openExternalCheckout } from '../../../shared/utils/externalNavigation';
import { rememberPendingPhonePeRedirect } from '../../../shared/utils/phonePeResume';
import { getLocalDriverToken } from '../services/registrationService';

const PHONEPE_DRIVER_WALLET_FLOW_KEY = 'driver-wallet-topup';

const emptyWallet = {
    balance: 0,
    cashLimit: 0,
    minimumBalanceForOrders: 0,
    availableForOrders: 0,
    isBlocked: false,
};

const money = (value) => {
    const amount = Number(value || 0);
    const sign = amount < 0 ? '-' : '';
    return `${sign}Rs ${Math.abs(amount).toFixed(2)}`;
};

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const isEnabled = (value, fallback = true) => {
    if (value === undefined || value === null || value === '') return fallback;
    return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const transactionLabel = (type = '') => {
    const labels = {
        ride_earning: 'Online ride earning',
        commission_deduction: 'Cash ride commission',
        top_up: 'Wallet top-up',
        adjustment: 'Wallet adjustment',
    };

    return labels[type] || String(type || 'Wallet transaction').replace(/_/g, ' ');
};

const withdrawalStatusMeta = (status = '') => {
    const normalized = String(status || '').toLowerCase();

    if (normalized === 'completed' || normalized === 'approved') {
        return {
            label: 'Approved',
            className: 'bg-emerald-100 text-emerald-700',
        };
    }

    if (normalized === 'cancelled' || normalized === 'rejected') {
        return {
            label: 'Rejected',
            className: 'bg-rose-100 text-rose-700',
        };
    }

    return {
        label: 'Pending',
        className: 'bg-amber-100 text-amber-700',
    };
};

const transactionHint = (tx = {}) => {
    const payment = tx.metadata?.paymentMethod;
    const commission = tx.metadata?.commissionAmount;
    const fare = tx.metadata?.fare;
    const source = String(tx.metadata?.source || '').toLowerCase();

    if (tx.type === 'commission_deduction') {
        return `COD ride${fare ? ` of ${money(fare)}` : ''}${commission ? `, admin commission ${money(commission)}` : ''}`;
    }

    if (tx.type === 'ride_earning') {
        return `${payment === 'online' ? 'Online' : 'Ride'} payout after admin commission`;
    }

    if (tx.type === 'adjustment' && source === 'user_wallet_transfer') {
        return tx.description || 'Received from rider wallet';
    }

    return tx.description || 'Updated by wallet activity';
};

const shortenText = (value, maxLength = 88) => {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
        return 'Updated by wallet activity';
    }

    return normalized.length > maxLength
        ? `${normalized.slice(0, maxLength - 3).trimEnd()}...`
        : normalized;
};

const formatDate = (value) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return 'Just now';

    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

const normalizeWalletResponse = (payload) => {
    const data = payload?.data || payload || {};
    return {
        wallet: data.wallet || emptyWallet,
        transactions: Array.isArray(data.transactions) ? data.transactions : [],
        withdrawalRequests: Array.isArray(data.withdrawalRequests) ? data.withdrawalRequests : [],
        settings: data.settings || {},
    };
};

const WALLET_FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'ride_earning', label: 'Online rides' },
    { id: 'commission_deduction', label: 'Cash commission' },
    { id: 'top_up', label: 'Top-ups' },
    { id: 'adjustment', label: 'Adjustments' },
];

const StatPill = ({ label, value, tone = 'dark' }) => {
    const toneClass = tone === 'good' ? 'text-emerald-700 bg-emerald-50' : tone === 'warn' ? 'text-amber-700 bg-amber-50' : 'text-slate-700 bg-slate-100';

    return (
        <div className={`rounded-2xl px-4 py-3 ${toneClass}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">{label}</p>
            <p className="mt-1 text-base font-black">{value}</p>
        </div>
    );
};

const isOwnerManagedDriverProfile = (driver = {}) =>
    Boolean(
        driver?.owner_id
        || driver?.ownerId
        || driver?.fleet_id
        || driver?.fleetId
        || driver?.owner?._id,
    );

const withDriverAuthorization = (config = {}) => {
    const token = getLocalDriverToken();

    if (!token) {
        return config;
    }

    return {
        ...config,
        headers: {
            ...(config.headers || {}),
            Authorization: `Bearer ${token}`,
        },
    };
};

const DriverWallet = () => {
    const navigate = useNavigate();
    const { settings: appSettings } = useSettings();
    const appName = appSettings.general?.app_name || 'App';
    const activePaymentGateway = appSettings.paymentGateway || null;
    const [wallet, setWallet] = useState(emptyWallet);
    const [transactions, setTransactions] = useState([]);
    const [withdrawalRequests, setWithdrawalRequests] = useState([]);
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [showTopUp, setShowTopUp] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState('500');
    const [processingTopUp, setProcessingTopUp] = useState(false);
    const [topUpSuccess, setTopUpSuccess] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [processingWithdraw, setProcessingWithdraw] = useState(false);
    const [withdrawSuccess, setWithdrawSuccess] = useState(false);
    const [driverProfile, setDriverProfile] = useState({
        salary: 0,
        isOwnerManagedDriver: false,
    });

    const loadWallet = useCallback(async ({ quiet = false } = {}) => {
        if (!quiet) setRefreshing(true);
        setError('');

        try {
            const token = getLocalDriverToken();
            if (!token) {
                setLoading(false);
                setRefreshing(false);
                navigate('/taxi/driver/login', { replace: true });
                return;
            }

            const authConfig = withDriverAuthorization();
            const [walletResponse, profileResponse] = await Promise.all([
                api.get('/drivers/wallet', authConfig),
                api.get('/drivers/me', authConfig).catch(() => null),
            ]);
            const next = normalizeWalletResponse(walletResponse);
            const profile = profileResponse?.data?.data || profileResponse?.data || profileResponse || {};
            setWallet(next.wallet);
            setTransactions(next.transactions);
            setWithdrawalRequests(next.withdrawalRequests);
            setSettings(next.settings);
            setDriverProfile({
                salary: toNumber(profile.salary, 0),
                isOwnerManagedDriver: isOwnerManagedDriverProfile(profile),
            });
        } catch (requestError) {
            setError(requestError?.response?.data?.message || requestError?.message || 'Could not load wallet.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [navigate]);

    useEffect(() => {
        loadWallet({ quiet: true });

        const token = getLocalDriverToken();
        const socket = token ? socketService.connect({ role: 'driver' }) : null;
        const onWalletUpdated = (payload) => {
            if (payload?.wallet) setWallet(payload.wallet);
            if (payload?.transaction) {
                setTransactions((previous) => [
                    payload.transaction,
                    ...previous.filter((item) => item._id !== payload.transaction._id),
                ].slice(0, 50));
            }
        };

        if (socket) socketService.on('driver:wallet:updated', onWalletUpdated);

        return () => {
            socketService.off('driver:wallet:updated', onWalletUpdated);
        };
    }, [loadWallet]);

    const rules = useMemo(() => {
        const minimumBalance = toNumber(
            wallet.minimumBalanceForOrders,
            toNumber(settings.driver_wallet_minimum_amount_to_get_an_order, 0),
        );
        const availableForOrders = toNumber(wallet.availableForOrders, toNumber(wallet.balance) - minimumBalance);
        const minimumTopUp = toNumber(wallet.minimumTopUpAmount, toNumber(settings.minimum_amount_added_to_wallet, 0));
        const minimumTransferAmount = toNumber(wallet.minimumTransferAmount, toNumber(settings.minimum_wallet_amount_for_transfer, 0));
        const walletEnabled = wallet.isWalletEnabled ?? isEnabled(settings.show_wallet_feature_for_driver, true);
        const transferEnabled = wallet.isTransferEnabled ?? isEnabled(settings.enable_wallet_transfer_driver, true);
        const canReceiveOrders = walletEnabled && !wallet.isBlocked && availableForOrders >= 0;

        return {
            minimumBalance,
            availableForOrders,
            minimumTopUp,
            minimumTransferAmount,
            walletEnabled,
            transferEnabled,
            canReceiveOrders,
        };
    }, [settings, wallet]);

    const quickAmounts = useMemo(() => {
        const base = Math.max(rules.minimumTopUp, 100);
        return [base, base * 2, base * 5].map((amount) => String(Math.round(amount)));
    }, [rules.minimumTopUp]);

    const walletSummary = useMemo(() => {
        const onlineRideEarnings = transactions
            .filter((tx) => tx.type === 'ride_earning')
            .reduce((sum, tx) => sum + Math.max(Number(tx.amount || 0), 0), 0);
        const cashRideCommission = transactions
            .filter((tx) => tx.type === 'commission_deduction')
            .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);
        const totalAppEarnings = transactions
            .filter((tx) => ['ride_earning', 'adjustment'].includes(tx.type))
            .reduce((sum, tx) => {
                const amount = Number(tx.amount || 0);
                const source = String(tx.metadata?.source || tx.metadata?.category || '').toLowerCase();

                if (tx.type === 'ride_earning') {
                    return sum + Math.max(amount, 0);
                }

                return source === 'driver_incentive' ? sum + Math.max(amount, 0) : sum;
            }, 0);

        return {
            totalAppEarnings,
            onlineRideEarnings,
            cashRideCommission,
        };
    }, [transactions]);

    const filteredTransactions = useMemo(() => {
        if (activeFilter === 'all') {
            return transactions;
        }

        return transactions.filter((tx) => tx.type === activeFilter);
    }, [activeFilter, transactions]);

    const recentTransactions = useMemo(() => filteredTransactions.slice(0, 20), [filteredTransactions]);
    const recentWithdrawalRequests = useMemo(
        () => withdrawalRequests.slice(0, 5),
        [withdrawalRequests],
    );
    const walletTopUpGatewayLabel = activePaymentGateway?.label || 'payment gateway';
    const supportsWalletTopUp = activePaymentGateway?.supportsWalletTopUp === true;
    const walletTopUpMode = activePaymentGateway?.walletTopUpMode || '';
    const canTopUpWallet = supportsWalletTopUp && ['razorpay_checkout', 'phonepe_redirect'].includes(walletTopUpMode);

    const loadRazorpayScript = useCallback(() =>
        new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        }), []);

    const handleTopUp = async () => {
        const amount = Number(topUpAmount);

        if (!rules.walletEnabled) {
            setError('Wallet is disabled by admin.');
            return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            setError('Enter a valid top-up amount.');
            return;
        }

        if (rules.minimumTopUp > 0 && amount < rules.minimumTopUp) {
            setError(`Minimum top-up amount is Rs ${rules.minimumTopUp}.`);
            return;
        }

        setProcessingTopUp(true);
        setError('');

        try {
            if (!activePaymentGateway) {
                throw new Error('No payment gateway is enabled by admin right now.');
            }

            if (!supportsWalletTopUp || !canTopUpWallet) {
                throw new Error(`${walletTopUpGatewayLabel} is enabled by admin, but driver wallet top-up is not implemented for it yet.`);
            }

            if (walletTopUpMode === 'phonepe_redirect') {
                const sessionResponse = await api.post('/drivers/wallet/top-up/phonepe/order', {
                    amount,
                }, withDriverAuthorization());
                const session = sessionResponse?.data || sessionResponse || {};

                if (!session?.checkoutUrl) {
                    throw new Error('Could not initiate PhonePe payment. Please try again.');
                }

                rememberPendingPhonePeRedirect(PHONEPE_DRIVER_WALLET_FLOW_KEY, {
                    merchantTransactionId: session.merchantTransactionId,
                    checkoutUrl: session.checkoutUrl,
                });
                const opened = await openExternalCheckout(session.checkoutUrl);
                if (!opened) {
                    throw new Error('PhonePe checkout could not open outside the app WebView. Please update the app bridge or open this payment flow in your browser.');
                }
                setProcessingTopUp(false);
                return;
            }

            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded) {
                throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
            }

            // 1. Create order on backend
            const orderResponse = await api.post('/drivers/wallet/top-up/razorpay/order', {
                amount,
            }, withDriverAuthorization());
            const orderData = orderResponse?.data || orderResponse;

            if (!orderData?.orderId && !orderData?.checkoutUrl) {
                throw new Error('Could not initiate payment. Please try again.');
            }

            if (orderData?.checkoutUrl) {
                const opened = await openExternalCheckout(orderData.checkoutUrl);
                if (!opened) {
                    throw new Error('Razorpay checkout could not open outside the app WebView. Please update the app bridge or open this payment flow in your browser.');
                }
                setProcessingTopUp(false);
                return;
            }

            let driverInfo = {};
            try {
                driverInfo = JSON.parse(localStorage.getItem('driverInfo') || '{}');
            } catch {
                driverInfo = {};
            }

            // 2. Open Razorpay checkout
            const driverPhone = driverInfo?.phone || driverInfo?.mobile || '';
            const cleanedPhoneDigits = String(driverPhone).replace(/\D/g, '');
            const finalPhoneDigits = (cleanedPhoneDigits.length === 12 && cleanedPhoneDigits.startsWith('91')) ? cleanedPhoneDigits.slice(2) : cleanedPhoneDigits;
            const prefillContact = finalPhoneDigits.length === 10 ? `+91${finalPhoneDigits}` : '';

            // In Flutter WebView, UPI app intents (Google Pay, PhonePe, Paytm)
            // cannot be launched from Razorpay's inline modal because WebViews
            // block intent:// and upi:// deep-link URLs. This causes UPI payment
            // options to be hidden entirely from the checkout UI.
            //
            // The fix: detect WebView and switch to redirect mode (callback_url +
            // redirect: true). Razorpay then does a full-page redirect flow where
            // UPI intents work properly. After payment, Razorpay POSTs to our
            // backend callback endpoint which verifies the payment and redirects
            // the user back to the /razorpay/status frontend page.
            if (isMobileOrWebView()) {
                const callbackUrl = orderData.callbackUrl
                    || `${API_BASE_URL}/drivers/wallet/top-up/razorpay/callback`;

                if (callbackUrl.startsWith('http://')) {
                    console.warn('[Razorpay] Warning: Using cleartext HTTP callback URL on mobile/WebView. This will fail with ERR_CLEARTEXT_NOT_PERMITTED on Android unless cleartext traffic is explicitly permitted.');
                }

                // Initialize the Razorpay JS SDK with redirect mode (callback_url + redirect: true).
                // Using redirect mode for all mobile devices guarantees native UPI app intent launching
                // across all mobile browsers and WebView containers alike.
                const rzp = new window.Razorpay({
                    key: orderData.keyId,
                    amount: orderData.amount,
                    currency: orderData.currency || 'INR',
                    name: appName,
                    description: 'Wallet Topup',
                    order_id: orderData.orderId,
                    callback_url: callbackUrl,
                    redirect: true,
                    prefill: {
                        name: driverInfo?.name || driverInfo?.full_name || '',
                        email: driverInfo?.email || '',
                        contact: prefillContact,
                    },
                    modal: {
                        ondismiss: () => {
                            setProcessingTopUp(false);
                        },
                    },
                    theme: {
                        color: '#E85D04',
                    },
                });

                rzp.on('payment.failed', (event) => {
                    const message = event?.error?.description || event?.error?.reason || 'Payment failed';
                    setError(message);
                    setProcessingTopUp(false);
                });
                rzp.open();
                return;
            }

            // Regular browser flow — use handler function for inline verification
            const options = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency || 'INR',
                name: appName,
                description: 'Wallet Topup',
                order_id: orderData.orderId,
                prefill: {
                    name: driverInfo?.name || driverInfo?.full_name || '',
                    email: driverInfo?.email || '',
                    contact: prefillContact,
                },
                modal: {
                    ondismiss: () => {
                        setProcessingTopUp(false);
                    },
                },
                theme: {
                    color: '#E85D04',
                },
                handler: async (response) => {
                    try {
                        const verifyResponse = await api.post('/drivers/wallet/top-up/razorpay/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        }, withDriverAuthorization());

                        const result = verifyResponse?.data || verifyResponse;
                        if (result?.wallet) {
                            setWallet(result.wallet);
                        }
                        if (result?.transaction) {
                            setTransactions((previous) => [
                                result.transaction,
                                ...previous.filter((item) => item._id !== result.transaction._id),
                            ].slice(0, 50));
                        }
                        
                        setTopUpSuccess(true);
                        setTimeout(() => {
                            setTopUpSuccess(false);
                            setShowTopUp(false);
                            setTopUpAmount('500');
                        }, 1400);
                    } catch (verifyError) {
                        setError(verifyError?.message || 'Payment verification failed');
                    } finally {
                        setProcessingTopUp(false);
                    }
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (event) => {
                const message = event?.error?.description || event?.error?.reason || 'Payment failed';
                setError(message);
                setProcessingTopUp(false);
            });
            rzp.open();
        } catch (requestError) {
            setError(requestError?.response?.data?.message || requestError?.message || 'Top-up request failed.');
            setProcessingTopUp(false);
        }
    };

    const handleUserStyleTopUp = async () => {
        const amount = Number(topUpAmount);

        if (!rules.walletEnabled) {
            setError('Wallet is disabled by admin.');
            return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            setError('Enter a valid top-up amount.');
            return;
        }

        if (rules.minimumTopUp > 0 && amount < rules.minimumTopUp) {
            setError(`Minimum top-up amount is Rs ${rules.minimumTopUp}.`);
            return;
        }

        setProcessingTopUp(true);
        setError('');

        try {
            if (!activePaymentGateway) {
                throw new Error('No payment gateway is enabled by admin right now.');
            }

            if (!supportsWalletTopUp || walletTopUpMode !== 'razorpay_checkout') {
                throw new Error(`${walletTopUpGatewayLabel} is enabled by admin, but this test flow needs Razorpay wallet top-up.`);
            }

            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded) {
                throw new Error('Razorpay SDK failed to load');
            }

            const orderResponse = await api.post('/drivers/wallet/top-up/razorpay/order', {
                amount,
            }, withDriverAuthorization());
            const orderData = orderResponse?.data || orderResponse || {};

            if (!orderData?.orderId || !orderData?.keyId) {
                throw new Error('Unable to start payment');
            }

            let driverInfo = {};
            try {
                driverInfo = JSON.parse(localStorage.getItem('driverInfo') || '{}');
            } catch {
                driverInfo = {};
            }

            const driverPhone = driverInfo?.phone || driverInfo?.mobile || '';
            const cleanedPhoneDigits = String(driverPhone).replace(/\D/g, '');
            const finalPhoneDigits = (cleanedPhoneDigits.length === 12 && cleanedPhoneDigits.startsWith('91')) ? cleanedPhoneDigits.slice(2) : cleanedPhoneDigits;
            const prefillContact = finalPhoneDigits.length === 10 ? `+91${finalPhoneDigits}` : '';

            const rzp = new window.Razorpay({
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency || 'INR',
                name: appName,
                description: 'Wallet Topup',
                order_id: orderData.orderId,
                prefill: {
                    name: driverInfo?.name || driverInfo?.full_name || '',
                    email: driverInfo?.email || '',
                    contact: prefillContact,
                },
                modal: {
                    ondismiss: () => {
                        setProcessingTopUp(false);
                    },
                },
                handler: async (response) => {
                    try {
                        const verifyResponse = await api.post('/drivers/wallet/top-up/razorpay/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        }, withDriverAuthorization());

                        const result = verifyResponse?.data || verifyResponse || {};
                        if (result?.wallet) {
                            setWallet(result.wallet);
                        }
                        if (result?.transaction) {
                            setTransactions((previous) => [
                                result.transaction,
                                ...previous.filter((item) => item._id !== result.transaction._id),
                            ].slice(0, 50));
                        }

                        setTopUpSuccess(true);
                        setTimeout(() => {
                            setTopUpSuccess(false);
                            setShowTopUp(false);
                            setTopUpAmount('500');
                        }, 1400);
                    } catch (verifyError) {
                        setError(verifyError?.message || 'Payment verification failed');
                    } finally {
                        setProcessingTopUp(false);
                    }
                },
                theme: {
                    color: '#E85D04',
                },
            });

            rzp.on('payment.failed', (event) => {
                const message = event?.error?.description || event?.error?.reason || 'Payment failed';
                setError(message);
                setProcessingTopUp(false);
            });

            rzp.open();
        } catch (requestError) {
            setError(requestError?.response?.data?.message || requestError?.message || 'Top-up request failed.');
            setProcessingTopUp(false);
        }
    };

    const handleWithdrawRequest = async () => {
        const amount = Number(withdrawAmount);

        if (!rules.transferEnabled) {
            setError('Withdrawals are disabled by admin.');
            return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            setError('Enter a valid withdrawal amount.');
            return;
        }

        if (rules.minimumTransferAmount > 0 && amount < rules.minimumTransferAmount) {
            setError(`Minimum withdrawal amount is Rs ${rules.minimumTransferAmount}.`);
            return;
        }

        if (amount > Number(wallet.balance || 0)) {
            setError('Withdrawal amount cannot exceed current balance.');
            return;
        }

        setProcessingWithdraw(true);
        setError('');

        try {
            const response = await api.post('/drivers/wallet/withdrawals', {
                amount,
                payment_method: 'bank_transfer',
            }, withDriverAuthorization());
            const payload = response?.data || response || {};

            if (payload?.request) {
                setWithdrawalRequests((previous) => [
                    payload.request,
                    ...previous.filter((item) => item._id !== payload.request._id),
                ].slice(0, 10));
            }

            setWithdrawSuccess(true);
            setTimeout(() => {
                setWithdrawSuccess(false);
                setShowWithdraw(false);
                setWithdrawAmount('');
            }, 1800);
        } catch (requestError) {
            setError(requestError?.response?.data?.message || requestError?.message || 'Could not send withdrawal request.');
        } finally {
            setProcessingWithdraw(false);
        }
    };


    const statusCopy = rules.walletEnabled
        ? rules.canReceiveOrders
            ? 'Ready for orders'
            : 'Top up to receive orders'
        : 'Wallet disabled';

    const walletIntro = driverProfile.isOwnerManagedDriver
        ? 'Monthly salary and wallet activity'
        : 'Cash commission and online earnings';
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
        <div className="min-h-screen bg-[#f8fafc] pb-24 text-slate-900 font-['Poppins'] max-w-lg mx-auto relative shadow-xl border-x border-slate-100">
            {/* Header Block */}
            <div className="bg-[#0c1527] text-white pt-4 pb-3 px-5 sticky top-0 z-50 shadow-md">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-base font-black tracking-tight">Financial Hub</h1>
                        <p className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400 mt-0.5">EARNINGS & TRANSFERS</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadWallet()}
                        disabled={refreshing}
                        className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white shadow-sm disabled:opacity-60 hover:bg-white/20 transition-all"
                        aria-label="Refresh wallet"
                    >
                        <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative pt-4 px-3 space-y-3 z-10">
                
                {/* Available Funds Card */}
                <div className="bg-white rounded-[22px] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.05)] border border-slate-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                             <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-normal text-base shrink-0 select-none">
                                ₹
                            </div>
                            <div className="text-left leading-tight">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">AVAILABLE FUNDS</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-black tracking-tight text-slate-950">
                                {formatIndianCurrency(wallet.balance)}
                            </h2>
                            <div className="flex items-center gap-1 justify-end mt-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400">VERIFIED PARTNER</span>
                            </div>
                        </div>
                    </div>

                    {/* Request Withdrawal Button */}
                    <button
                        type="button"
                        onClick={() => setShowWithdraw(true)}
                        disabled={!rules.transferEnabled || Number(wallet.balance || 0) <= 0}
                        className="mt-4 w-full py-3 bg-[#0c1527] hover:bg-[#16223b] text-white font-black rounded-xl tracking-widest text-[10px] uppercase shadow-sm disabled:bg-slate-100 disabled:text-slate-400 transition-all duration-300"
                    >
                        REQUEST WITHDRAWAL
                    </button>

                    {/* Stats Grids */}
                    <div className="grid grid-cols-2 gap-2.5 mt-3">
                        {/* Total Earned */}
                        <div className="bg-slate-50 rounded-xl p-3 text-left border border-slate-100">
                            <p className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400">TOTAL EARNED</p>
                            <p className="text-base font-black text-slate-800 mt-0.5">
                                {formatIndianCurrency(walletSummary.totalAppEarnings)}
                            </p>
                        </div>

                        {/* In Hand */}
                        <div className="bg-slate-50 rounded-xl p-3 text-left relative border border-slate-100">
                            <span className="absolute top-1.5 right-1.5 bg-indigo-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">
                                SETTLE
                            </span>
                            <p className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400 mt-1">IN HAND</p>
                            <p className="text-base font-black text-slate-800 mt-0.5">
                                {formatIndianCurrency(wallet.balance)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Payout Policy Option */}
                <div className="bg-white rounded-xl px-3.5 py-2.5 shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                            <AlertCircle size={13} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">PAYOUT POLICY</span>
                    </div>
                    <ChevronRight size={13} className="text-slate-400" />
                </div>

                {/* Quick Topup / Test flow if gateway active */}
                {rules.walletEnabled && (
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Add Money Controls</p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShowTopUp(true)}
                                disabled={!rules.walletEnabled || !canTopUpWallet}
                                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-lg text-[10px] uppercase tracking-widest disabled:bg-slate-100 disabled:text-slate-400 transition-all duration-300"
                            >
                                Top Up Wallet
                            </button>
                            {walletTopUpMode === 'razorpay_checkout' && (
                                <button
                                    type="button"
                                    onClick={handleUserStyleTopUp}
                                    disabled={processingTopUp || !rules.walletEnabled}
                                    className="flex-1 py-2 border border-emerald-200 bg-emerald-50 text-emerald-800 font-black rounded-lg text-[10px] uppercase tracking-widest disabled:bg-slate-100 disabled:text-slate-400 transition-all duration-300 flex items-center justify-center gap-1"
                                >
                                    {processingTopUp ? <RefreshCw className="animate-spin" size={11} /> : 'Test Add'}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Error Banner */}
                {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-[10px] font-normal text-rose-700">
                        <AlertCircle className="mt-0.5 shrink-0" size={13} />
                        <p>{error}</p>
                    </div>
                )}

                {/* Tabs Filter */}
                <div className="flex bg-slate-100 rounded-xl p-1 font-sans text-[9px] font-black uppercase tracking-widest">
                    <button
                        onClick={() => setActiveFilter('all')}
                        className={`flex-1 py-2 rounded-lg text-center transition-all ${activeFilter === 'all' ? 'bg-[#0c1527] text-white shadow-sm' : 'text-slate-500'}`}
                    >
                        ALL
                    </button>
                    <button
                        onClick={() => setActiveFilter('commission_deduction')}
                        className={`flex-1 py-2 rounded-lg text-center transition-all ${activeFilter === 'commission_deduction' ? 'bg-[#0c1527] text-white shadow-sm' : 'text-slate-500'}`}
                    >
                        PENDING
                    </button>
                    <button
                        onClick={() => setActiveFilter('ride_earning')}
                        className={`flex-1 py-2 rounded-lg text-center transition-all ${activeFilter === 'ride_earning' ? 'bg-[#0c1527] text-white shadow-sm' : 'text-slate-500'}`}
                    >
                        COMPLETED
                    </button>
                </div>

                {/* Transfer History List */}
                <div className="space-y-2 pb-6">
                    <div className="flex items-center gap-1.5">
                        <span className="w-1 h-3 bg-indigo-600 rounded-full"></span>
                        <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400">TRANSFER HISTORY</h3>
                    </div>

                    <div className="bg-white rounded-[18px] p-4 border border-slate-100 shadow-sm min-h-[160px] flex flex-col justify-center">
                        {loading ? (
                            <div className="text-center py-6">
                                <RefreshCw className="mx-auto animate-spin text-indigo-600" size={20} />
                                <p className="mt-2 text-[10px] font-black text-slate-400">Loading activity...</p>
                            </div>
                        ) : filteredTransactions.length === 0 ? (
                            <div className="text-center py-6">
                                <span className="text-3xl text-slate-200 font-normal block mb-1.5 select-none">₹</span>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">NO ACTIVITY RECORDED</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {filteredTransactions.slice(0, 15).map((tx, index) => {
                                    const isDebit = Number(tx.amount || 0) < 0;
                                    return (
                                        <div key={tx._id || index} className="flex items-center justify-between pb-2.5 border-b border-slate-50 last:border-b-0 last:pb-0">
                                            <div className="text-left">
                                                <p className="text-[11px] font-black text-slate-800">{transactionLabel(tx.type)}</p>
                                                <p className="text-[9px] text-slate-400 mt-0.5">{formatDate(tx.createdAt)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-[11px] font-black ${isDebit ? 'text-rose-500' : 'text-emerald-600'}`}>
                                                    {formatIndianCurrency(tx.amount)}
                                                </p>
                                                <p className="text-[8px] text-slate-400 mt-0.5 font-normal">Bal {formatIndianCurrency(tx.balanceAfter)}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Bottom Nav Component */}
            <DriverBottomNav />

            {/* Top Up Drawer Modal */}
            <AnimatePresence>
                {showTopUp && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 px-3 backdrop-blur-sm max-w-lg mx-auto">
                        <Motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="w-full rounded-t-[2.5rem] bg-white p-6 pb-10 shadow-2xl space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-slate-950">Top up wallet</h3>
                                    <p className="text-xs font-bold text-slate-500 mt-1">
                                        Minimum amount: {formatIndianCurrency(rules.minimumTopUp)}
                                        {activePaymentGateway ? ` • Via ${walletTopUpGatewayLabel}` : ''}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowTopUp(false)}
                                    className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600"
                                    aria-label="Close top-up"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {topUpSuccess ? (
                                <div className="grid place-items-center py-10 text-center">
                                    <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                                        <CheckCircle2 size={32} />
                                    </div>
                                    <p className="mt-4 text-base font-black text-slate-900">Wallet updated successfully</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="rounded-2xl bg-slate-50 p-5 text-center border border-slate-100">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Amount to Add</p>
                                        <div className="flex items-center justify-center gap-1.5 mt-2">
                                            <span className="text-3xl font-black text-slate-900">₹</span>
                                            <input
                                                type="number"
                                                min="1"
                                                value={topUpAmount}
                                                onChange={(event) => setTopUpAmount(event.target.value)}
                                                className="w-40 bg-transparent text-3xl font-black text-slate-950 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {quickAmounts.map((amount) => (
                                            <button
                                                key={amount}
                                                type="button"
                                                onClick={() => setTopUpAmount(amount)}
                                                className="rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-black text-slate-700 shadow-sm"
                                            >
                                                {formatIndianCurrency(amount)}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleTopUp}
                                        disabled={processingTopUp || !rules.walletEnabled}
                                        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#0c1527] text-xs font-black uppercase tracking-widest text-white disabled:bg-slate-100 disabled:text-slate-400"
                                    >
                                        {processingTopUp ? <RefreshCw className="animate-spin" size={18} /> : 'CONFIRM TOP UP'}
                                    </button>
                                </div>
                            )}
                        </Motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Withdrawal Drawer Modal */}
            <AnimatePresence>
                {showWithdraw && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 px-3 backdrop-blur-sm max-w-lg mx-auto">
                        <Motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="w-full rounded-t-[2.5rem] bg-white p-6 pb-10 shadow-2xl space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-slate-950">Withdraw request</h3>
                                     <p className="text-xs font-normal text-slate-500 mt-1">Minimum amount: {formatIndianCurrency(rules.minimumTransferAmount)}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowWithdraw(false)}
                                    className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600"
                                    aria-label="Close withdrawal"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {withdrawSuccess ? (
                                <div className="grid place-items-center py-10 text-center">
                                    <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                                        <CheckCircle2 size={32} />
                                    </div>
                                    <p className="mt-4 text-base font-black text-slate-900">Request Sent Successfully</p>
                                     <p className="mt-1 text-xs text-slate-400 font-normal">Admin will review your request shortly.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="rounded-2xl bg-slate-50 p-5 text-center border border-slate-100">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Withdrawal Amount</p>
                                        <div className="flex items-center justify-center gap-1.5 mt-2">
                                            <span className="text-3xl font-black text-slate-900">₹</span>
                                            <input
                                                type="number"
                                                min="1"
                                                value={withdrawAmount}
                                                onChange={(event) => setWithdrawAmount(event.target.value)}
                                                className="w-40 bg-transparent text-3xl font-black text-slate-950 outline-none"
                                                placeholder="0"
                                            />
                                        </div>
                                         <p className="mt-2 text-xs font-normal text-slate-400">Available: {formatIndianCurrency(wallet.balance)}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleWithdrawRequest}
                                        disabled={processingWithdraw || !rules.transferEnabled}
                                        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#0c1527] text-xs font-black uppercase tracking-widest text-white disabled:bg-slate-100 disabled:text-slate-400"
                                    >
                                        {processingWithdraw ? <RefreshCw className="animate-spin" size={18} /> : 'CONFIRM WITHDRAWAL'}
                                    </button>
                                </div>
                            )}
                        </Motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DriverWallet;
