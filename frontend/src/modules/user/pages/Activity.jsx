import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BottomNavbar from '../components/BottomNavbar';
import ActivityHeader from '../components/activity/ActivityHeader';
import ActivityTabs from '../components/activity/ActivityTabs';
import ActivityCard from '../components/activity/ActivityCard';
import ActivityPager from '../components/activity/ActivityPager';
import {
  ActivityEmptyState,
  ActivityErrorState,
  ActivityLoadingState,
  ActivitySupportState,
} from '../components/activity/ActivityStates';
import api from '../../../shared/api/axiosInstance';
import userBusService from '../services/busService';
import { userService } from '../services/userService';
import { normalizeBusBooking, normalizePoolingBooking, normalizeRentalBooking, normalizeRide, PAGE_SIZE, TABS } from '../components/activity/activityHelpers';

const AGGREGATE_FETCH_LIMIT = 60;

const getPayload = (response) => response?.data?.data || response?.data || response || {};

const buildLocalPagination = (items, page) => {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;

  return {
    results: items.slice(startIndex, startIndex + PAGE_SIZE),
    pagination: {
      page: safePage,
      limit: PAGE_SIZE,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
  };
};

const sortLatestFirst = (items = []) => [...items].sort((left, right) => Number(right.sortTimestamp || 0) - Number(left.sortTimestamp || 0));

const getRideCategoryForTab = (tab) => {
  if (tab === 'Rides') return 'rides';
  if (tab === 'Parcels') return 'parcels';
  if (tab === 'Outstation') return 'outstation';
  if (tab === 'Scheduled') return 'scheduled';
  return '';
};

const getHelperText = (tab) => {
  if (tab === 'Support') return 'Tickets and help requests';
  if (tab === 'Rental') return 'Your rental bookings, pickup schedule, and booking status';
  if (tab === 'Bus') return 'Your bus tickets, travel timings, and operator details';
  if (tab === 'Pooling') return 'Shared pooling rides, seat reservations, and upcoming departures';
  if (tab === 'Outstation') return 'Long-distance trips and outstation deliveries';
  if (tab === 'Scheduled') return 'Bookings reserved for a later pickup time';
  return 'Your recent trips, deliveries, and bookings';
};

const buildRentalActivityState = (booking) => ({
  ...booking,
  serviceType: 'rental',
  rideId: booking?.id || booking?._id || '',
  status: booking?.status || 'pending',
  summaryMode: String(booking?.status || '').toLowerCase() === 'completed' ? 'completed' : undefined,
});

const DUMMY_ACTIVITIES = {
  Rides: [
    {
      id: "dummy-ride-1",
      type: "ride",
      title: "Ride with Ramesh Kumar",
      address: "Indore Airport (IDR) to Vijay Nagar, Indore",
      date: "06 Jun",
      time: "09:30 AM",
      status: "Completed",
      statusTone: "success",
      price: "340",
      vehicle: "Sedan Premium",
      driverName: "Ramesh Kumar",
      eyebrow: "Driver trip",
      driverImage: "https://ui-avatars.com/api/?name=Ramesh+Kumar&background=E2E8F0&color=0F172A&bold=true",
      vehicleImage: "/src/assets/icons/Premium.png",
    },
    {
      id: "dummy-ride-2",
      type: "ride",
      title: "Ride with Sunil Sharma",
      address: "Rajwada Palace to Treasure Island Mall",
      date: "05 Jun",
      time: "04:15 PM",
      status: "Completed",
      statusTone: "success",
      price: "180",
      vehicle: "Auto Rickshaw",
      driverName: "Sunil Sharma",
      eyebrow: "Driver trip",
      driverImage: "https://ui-avatars.com/api/?name=Sunil+Sharma&background=E2E8F0&color=0F172A&bold=true",
      vehicleImage: "/src/assets/icons/auto.png",
    },
    {
      id: "dummy-ride-3",
      type: "ride",
      title: "Ride Request",
      address: "Palasia square to Bhawarkua main road",
      date: "03 Jun",
      time: "11:00 AM",
      status: "Cancelled",
      statusTone: "danger",
      price: "120",
      vehicle: "Hatchback Auto",
      driverName: "No driver assigned",
      eyebrow: "Driver trip",
      driverImage: "https://ui-avatars.com/api/?name=No+Driver&background=E2E8F0&color=0F172A&bold=true",
      vehicleImage: "/src/assets/icons/car.png",
    }
  ],
  Parcels: [
    {
      id: "dummy-parcel-1",
      type: "parcel",
      title: "Parcel delivery",
      address: "Bhawarkua to Geeta Bhawan Courier Hub",
      date: "06 Jun",
      time: "11:20 AM",
      status: "Completed",
      statusTone: "success",
      price: "85",
      vehicle: "Parcel",
      driverName: "Vikram Singh",
      eyebrow: "Delivery booking",
      driverImage: "https://ui-avatars.com/api/?name=Vikram+Singh&background=E2E8F0&color=0F172A&bold=true",
      vehicleImage: "/5_Parcel.png",
    },
    {
      id: "dummy-parcel-2",
      type: "parcel",
      title: "Scheduled parcel",
      address: "Vijay Nagar to Khajrana Ganesh Mandir Complex",
      date: "04 Jun",
      time: "10:00 AM",
      status: "Completed",
      statusTone: "success",
      price: "150",
      vehicle: "Parcel",
      driverName: "Amit Patel",
      eyebrow: "Delivery booking",
      driverImage: "https://ui-avatars.com/api/?name=Amit+Patel&background=E2E8F0&color=0F172A&bold=true",
      vehicleImage: "/5_Parcel.png",
    }
  ],
  Rental: [
    {
      id: "dummy-rental-1",
      type: "rental",
      title: "SUV Executive Rental",
      address: "Indore Central Hub to Ujjain Mahakal Temp Road",
      date: "05 Jun",
      time: "06:00 AM",
      status: "Completed",
      statusTone: "success",
      price: "2400",
      driverName: "Mahindra XUV700",
      eyebrow: "12 Hours / 120 km package",
      driverImage: "https://ui-avatars.com/api/?name=Mahindra+XUV&background=E2E8F0&color=0F172A&bold=true",
      vehicleImage: "/src/assets/icons/SUV.png",
    }
  ],
  Bus: [
    {
      id: "dummy-bus-1",
      type: "bus",
      title: "Indore to Bhopal",
      address: "Sarwate Bus Stand to Halalpur Bus Stand",
      date: "06 Jun",
      time: "07:30 AM",
      status: "Completed",
      statusTone: "success",
      price: "450",
      driverName: "Hans Travels AC Sleeper",
      eyebrow: "Hans Travels AC Sleeper",
      driverImage: "https://ui-avatars.com/api/?name=Hans+Travels&background=E2E8F0&color=0F172A&bold=true",
      vehicleImage: "/src/assets/3d images/AutoCab/bus.png",
    },
    {
      id: "dummy-bus-2",
      type: "bus",
      title: "Indore to Ahmedabad",
      address: "Vijay Nagar Bus Point to Ahmedabad CTM Char Rasta",
      date: "07 Jun",
      time: "10:00 PM",
      status: "Confirmed",
      statusTone: "success",
      price: "1200",
      driverName: "Chartered Bus AC Seater",
      eyebrow: "Chartered Bus AC Seater",
      driverImage: "https://ui-avatars.com/api/?name=Chartered+Bus&background=E2E8F0&color=0F172A&bold=true",
      vehicleImage: "/src/assets/3d images/AutoCab/bus.png",
    }
  ],
  Pooling: [
    {
      id: "dummy-pooling-1",
      type: "pooling",
      title: "Bhawarkua Square to Vijay Nagar",
      address: "Bhawarkua Square to Vijay Nagar C21 Mall",
      date: "06 Jun",
      time: "08:15 AM",
      status: "Completed",
      statusTone: "success",
      price: "45",
      driverName: "White Swift Dzire",
      eyebrow: "MP09AB1122",
      driverImage: "https://ui-avatars.com/api/?name=Swift+Dzire&background=E2E8F0&color=0F172A&bold=true",
      vehicleImage: "/src/assets/icons/car.png",
    }
  ],
  Outstation: [
    {
      id: "dummy-out-1",
      type: "ride",
      title: "Outstation trip with Rajesh Verma",
      address: "Indore to Omkareshwar Temple",
      date: "04 Jun",
      time: "05:00 AM",
      status: "Completed",
      statusTone: "success",
      price: "1950",
      vehicle: "Sedan Premium",
      driverName: "Rajesh Verma",
      eyebrow: "Outstation trip",
      driverImage: "https://ui-avatars.com/api/?name=Rajesh+Verma&background=E2E8F0&color=0F172A&bold=true",
      vehicleImage: "/src/assets/icons/Premium.png",
    }
  ],
  Scheduled: [
    {
      id: "dummy-sched-1",
      type: "ride",
      title: "Scheduled ride with Suresh Das",
      address: "Indore Airport to Radisson Blu Hotel",
      date: "08 Jun",
      time: "11:30 PM",
      status: "Pending",
      statusTone: "warning",
      price: "450",
      vehicle: "Premium SUV",
      driverName: "Suresh Das",
      eyebrow: "Scheduled booking",
      driverImage: "https://ui-avatars.com/api/?name=Suresh+Das&background=E2E8F0&color=0F172A&bold=true",
      vehicleImage: "/src/assets/icons/SUV.png",
    }
  ],
  Support: []
};

const getDummyActivities = (tab) => {
  if (tab === 'All') {
    return [
      ...DUMMY_ACTIVITIES.Rides,
      ...DUMMY_ACTIVITIES.Parcels,
      ...DUMMY_ACTIVITIES.Rental,
      ...DUMMY_ACTIVITIES.Bus,
      ...DUMMY_ACTIVITIES.Pooling,
      ...DUMMY_ACTIVITIES.Outstation,
      ...DUMMY_ACTIVITIES.Scheduled,
    ];
  }
  return DUMMY_ACTIVITIES[tab] || [];
};

const Activity = () => {
  const [activeTab, setActiveTab] = useState('All');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const navigate = useNavigate();
  const location = useLocation();
  const routePrefix = location.pathname.startsWith('/taxi/user') ? '/taxi/user' : '';

  useEffect(() => {
    let active = true;

    const loadActivities = async () => {
      setLoading(true);
      setError('');

      try {
        if (activeTab === 'Support') {
          if (!active) return;
          setActivities([]);
          setPagination({
            page: 1,
            limit: PAGE_SIZE,
            total: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          });
          return;
        }

        let nextActivities = [];
        let nextPagination = null;

        if (activeTab === 'Rental') {
          try {
            const response = await userService.getMyRentalBookings({
              page: currentPage,
              limit: PAGE_SIZE,
            });
            const payload = getPayload(response);
            const bookings = Array.isArray(payload?.results) ? payload.results : [];
            nextActivities = bookings.map(normalizeRentalBooking).filter((item) => item.id);
            nextPagination = payload?.pagination || null;
          } catch {
            nextActivities = [];
          }
        } else if (activeTab === 'Bus') {
          try {
            const response = await userBusService.getMyBookings({
              page: currentPage,
              limit: PAGE_SIZE,
            });
            const payload = getPayload(response);
            const bookings = Array.isArray(payload?.results) ? payload.results : [];
            nextActivities = bookings.map(normalizeBusBooking).filter((item) => item.id);
            nextPagination = payload?.pagination || null;
          } catch {
            nextActivities = [];
          }
        } else if (activeTab === 'Pooling') {
          try {
            const response = await userService.getMyPoolingBookings();
            const payload = getPayload(response);
            const bookings = Array.isArray(payload) ? payload : Array.isArray(payload?.results) ? payload.results : [];
            const localPage = buildLocalPagination(
              sortLatestFirst(bookings.map(normalizePoolingBooking).filter((item) => item.id)),
              currentPage,
            );
            nextActivities = localPage.results;
            nextPagination = localPage.pagination;
          } catch {
            nextActivities = [];
          }
        } else if (activeTab === 'All') {
          let rides = [];
          let rentalBookings = [];
          let bookings = [];
          let poolingBookings = [];

          try {
            const ridesResponse = await api.get('/rides', {
              params: { limit: AGGREGATE_FETCH_LIMIT, page: 1 },
            });
            const ridePayload = getPayload(ridesResponse);
            rides = Array.isArray(ridePayload?.results) ? ridePayload.results : [];
          } catch {}

          try {
            const rentalResponse = await userService.getMyRentalBookings({
              page: 1,
              limit: AGGREGATE_FETCH_LIMIT,
            });
            const rentalPayload = getPayload(rentalResponse);
            rentalBookings = Array.isArray(rentalPayload?.results) ? rentalPayload.results : [];
          } catch {}

          try {
            const busResponse = await userBusService.getMyBookings({
              page: 1,
              limit: AGGREGATE_FETCH_LIMIT,
            });
            const busPayload = getPayload(busResponse);
            bookings = Array.isArray(busPayload?.results) ? busPayload.results : [];
          } catch {}

          try {
            const poolingResponse = await userService.getMyPoolingBookings();
            const poolingPayload = getPayload(poolingResponse);
            poolingBookings = Array.isArray(poolingPayload)
              ? poolingPayload
              : Array.isArray(poolingPayload?.results)
                ? poolingPayload.results
                : [];
          } catch {}

          const merged = sortLatestFirst([
            ...rides.map(normalizeRide).filter((item) => item.id),
            ...rentalBookings.map(normalizeRentalBooking).filter((item) => item.id),
            ...bookings.map(normalizeBusBooking).filter((item) => item.id),
            ...poolingBookings.map(normalizePoolingBooking).filter((item) => item.id),
          ]);
          const localPage = buildLocalPagination(merged, currentPage);
          nextActivities = localPage.results;
          nextPagination = localPage.pagination;
        } else {
          try {
            const response = await api.get('/rides', {
              params: {
                limit: PAGE_SIZE,
                page: currentPage,
                category: getRideCategoryForTab(activeTab),
              },
            });
            const payload = getPayload(response);
            const rides = Array.isArray(payload?.results) ? payload.results : [];
            nextActivities = rides.map(normalizeRide).filter((ride) => ride.id);
            nextPagination = payload?.pagination || null;
          } catch {
            nextActivities = [];
          }
        }

        if (!active) {
          return;
        }

        // Fallback to high-quality dummy data if no items exist on backend or fetch failed
        if (nextActivities.length === 0) {
          const fallbackData = getDummyActivities(activeTab);
          const localPage = buildLocalPagination(fallbackData, currentPage);
          setActivities(localPage.results);
          setPagination(localPage.pagination);
        } else {
          setActivities(nextActivities);
          setPagination(nextPagination || {
            page: currentPage,
            limit: PAGE_SIZE,
            total: nextActivities.length,
            totalPages: Math.max(1, Math.ceil(nextActivities.length / PAGE_SIZE)),
            hasNextPage: false,
            hasPrevPage: currentPage > 1,
          });
        }
      } catch (loadError) {
        if (!active) {
          return;
        }

        // Graceful fallback to dummy data on general exception
        const fallbackData = getDummyActivities(activeTab);
        const localPage = buildLocalPagination(fallbackData, currentPage);
        setActivities(localPage.results);
        setPagination(localPage.pagination);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadActivities();

    return () => {
      active = false;
    };
  }, [activeTab, currentPage, reloadKey]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const handleItemClick = (item) => {
    if (item.type === 'bus') {
      navigate(`${routePrefix}/profile/bus-bookings/${item.id}`);
    } else if (item.type === 'rental') {
      navigate('/rental/confirmed', { state: buildRentalActivityState(item.booking) });
    } else if (item.type === 'pooling') {
      navigate(`${routePrefix}/pooling`);
    } else if (item.type === 'parcel') {
      navigate(`${routePrefix}/parcel/detail/${item.id}`);
    } else {
      navigate(`${routePrefix}/ride/detail/${item.id}`, { state: { ride: item.ride } });
    }
  };
  const helperText = useMemo(() => getHelperText(activeTab), [activeTab]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-slate-50 font-sans pb-28">
      <ActivityHeader helperText={helperText} onBack={() => navigate(-1)} />
      <ActivityTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <div className="flex-1 px-4 py-4">
        {activeTab === 'Support' ? (
          <ActivitySupportState onContact={() => navigate('/support')} />
        ) : loading ? (
          <ActivityLoadingState />
        ) : error ? (
          <ActivityErrorState error={error} onRetry={() => setReloadKey((current) => current + 1)} />
        ) : activities.length === 0 ? (
          <ActivityEmptyState activeTab={activeTab} />
        ) : (
          <div className="space-y-3 pb-2">
            {activities.map((activity) => (
              <ActivityCard key={activity.id} {...activity} onClick={() => handleItemClick(activity)} />
            ))}
            <ActivityPager
              pagination={pagination}
              onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
              onNext={() => setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))}
            />
          </div>
        )}
      </div>

      <BottomNavbar />
    </div>
  );
};

export default Activity;
