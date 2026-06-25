import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Package,
  DollarSign,
  Bell,
  User,
  Briefcase,
  Bus,
  Car,
  Users,
} from "lucide-react";
import { useSettings } from "../../../shared/context/SettingsContext";
import { getVisibleDriverNotifications, getUnreadDriverNotificationCount } from "../../driver/utils/notificationState";
import { getDriverNotifications } from "../../driver/services/registrationService";

const isEnabledFlag = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  return ["1", "true", "yes", "on", "enabled"].includes(String(value || "").trim().toLowerCase());
};

const DriverBottomNav = () => {
  const location = useLocation();
  const { settings } = useSettings();
  const role = String(localStorage.getItem("role") || "driver").toLowerCase();
  const isOwner = role === "owner";
  const routePrefix = isOwner ? "/taxi/owner" : "/taxi/driver";
  const busEnabled = isEnabledFlag(settings.transportRide?.enable_bus_service);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (isOwner) return;
    const fetchCount = async () => {
      try {
        const response = await getDriverNotifications();
        const results = response?.data?.results || [];
        const visibleNotifications = getVisibleDriverNotifications(results);
        setNotificationCount(getUnreadDriverNotificationCount(visibleNotifications));
      } catch {
        setNotificationCount(32);
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [isOwner]);

  const navItems = isOwner
    ? [
        { icon: Home, label: "Dashboard", path: `${routePrefix}/dashboard` },
        { icon: Users, label: "Drivers", path: `${routePrefix}/manage-drivers` },
        { icon: Car, label: "Vehicle", path: `${routePrefix}/vehicle-fleet` },
        { icon: Briefcase, label: "Pooling", path: `${routePrefix}/pooling-vehicles` },
        ...(busEnabled ? [{ icon: Bus, label: "Bus", path: `${routePrefix}/bus-service` }] : []),
        { icon: User, label: "Account", path: `${routePrefix}/profile` },
      ]
    : [
        { icon: Home, label: "Dashboard", path: `${routePrefix}/home` },
        { icon: Package, label: "History", path: `${routePrefix}/history` },
        { icon: DollarSign, label: "Payouts", path: `${routePrefix}/wallet` },
        { icon: Bell, label: "Alerts", path: `${routePrefix}/notifications`, badge: notificationCount },
        { icon: User, label: "Profile", path: `${routePrefix}/profile` },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 shadow-[0_-1px_0_0_#f1f5f9] font-['Poppins'] max-w-lg mx-auto left-1/2 -translate-x-1/2 w-full">
      <div
        className="grid w-full pb-[env(safe-area-inset-bottom)]"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(`${item.path}/`) ||
            (item.path === `${routePrefix}/home` &&
              location.pathname === `${routePrefix}/dashboard`);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center py-2.5 gap-1 group"
            >
              {/* Active top indicator */}
              <span
                className={`absolute top-0 left-1/2 -translate-x-1/2 h-[2.5px] rounded-b-full transition-all duration-300 ${
                  isActive ? "w-8 bg-indigo-500" : "w-0 bg-transparent"
                }`}
              />

              {/* Icon */}
              <div className="relative">
                <Icon
                  size={isActive ? 21 : 20}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={`transition-all duration-200 ${
                    isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-500"
                  }`}
                />
                {/* Notification badge */}
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-rose-500 px-1 text-[7px] font-black text-white">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[9.5px] leading-none tracking-wide transition-all duration-200 ${
                  isActive
                    ? "text-indigo-600 font-semibold"
                    : "text-slate-400 font-medium group-hover:text-slate-500"
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default DriverBottomNav;
