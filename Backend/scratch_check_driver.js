import mongoose from 'mongoose';
import { matchDrivers } from './src/modules/taxi/services/matchingService.js';
import { Driver } from './src/modules/taxi/driver/models/Driver.js';
import { Zone } from './src/modules/taxi/driver/models/Zone.js';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const pickup = [75.9048, 22.7039];
    const vehicleTypeId = '69dcb5faba63a3e24641c45d'; // Taxi
    const serviceLocationId = '6a13d62f743d446530c45535';

    console.log(`Matching drivers for pickup coords ${pickup} and vehicleTypeId ${vehicleTypeId}`);

    const result = await matchDrivers(pickup, {
      maxDistance: 25000,
      limit: 30,
      vehicleTypeId,
      serviceLocationId,
      allowCrossZoneFallback: false,
      strictZoneOnly: true,
    });

    console.log('--- MATCHING RESULTS ---');
    console.log('Zone found:', result.zone?.name, 'Zone ID:', result.zone?._id);
    console.log('Search radius (meters):', result.searchRadiusMeters);
    console.log('Zone boundary cap (meters):', result.zoneBoundaryCapMeters);
    console.log('Number of drivers returned:', result.drivers?.length);
    console.log('Drivers list:', result.drivers?.map(d => ({ name: d.name, phone: d.phone, distance: d.distanceMeters })));

    // Let's check why our specific driver was not returned
    const phone = '7223077890';
    const driver = await Driver.findOne({ phone }).lean();
    if (driver) {
      console.log('\n--- TARGET DRIVER CHECK ---');
      console.log('Driver Name:', driver.name);
      console.log('isOnline:', driver.isOnline);
      console.log('isOnRide:', driver.isOnRide);
      console.log('wallet.isBlocked:', driver.wallet?.isBlocked);
      console.log('zoneId:', driver.zoneId);
      console.log('service_location_id:', driver.service_location_id);
      console.log('vehicleTypeId:', driver.vehicleTypeId);

      // Let's compute distance using the distance function in matchingService
      const EARTH_RADIUS_METERS = 6371000;
      const getDistanceBetweenMeters = (origin, target) => {
        const [originLng, originLat] = origin;
        const [targetLng, targetLat] = target;
        const dLat = ((targetLat - originLat) * Math.PI) / 180;
        const dLng = ((targetLng - originLng) * Math.PI) / 180;
        const lat1 = (originLat * Math.PI) / 180;
        const lat2 = (targetLat * Math.PI) / 180;
        const a = (Math.sin(dLat / 2) ** 2) + (Math.cos(lat1) * Math.cos(lat2) * (Math.sin(dLng / 2) ** 2));
        return Math.round(2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      };

      const dist = getDistanceBetweenMeters(pickup, driver.location.coordinates);
      console.log('Calculated distance (meters):', dist);
      console.log('Is within effectiveMaxDistance?', dist <= result.searchRadiusMeters);

      // Let's check active/scheduled blockages
      const { getDriverIdsBlockedByUpcomingScheduledRides } = await import('./src/modules/taxi/services/rideService.js');
      const blockedDriverIds = await getDriverIdsBlockedByUpcomingScheduledRides([String(driver._id)]);
      console.log('Is blocked by scheduled ride?', blockedDriverIds.has(String(driver._id)));
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
