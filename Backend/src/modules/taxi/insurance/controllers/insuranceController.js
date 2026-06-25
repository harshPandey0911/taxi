import { asyncHandler } from '../../../../utils/asyncHandler.js';
import { ApiError } from '../../../../utils/ApiError.js';
import { Insurance } from '../models/Insurance.js';
import { InsurancePlan, seedInsurancePlans } from '../models/InsurancePlan.js';

// Calculate premium based on vehicle type and duration dynamically
const calculatePremium = async (vehicleType, duration) => {
  const defaultRates = {
    bike: { '1_month': 100, '6_months': 500, '1_year': 900 },
    auto: { '1_month': 150, '6_months': 750, '1_year': 1300 },
    car: { '1_month': 300, '6_months': 1500, '1_year': 2700 },
    truck: { '1_month': 500, '6_months': 2500, '1_year': 4500 },
  };

  const type = String(vehicleType).toLowerCase();
  
  // Try to find the rates in database
  let dbPlan = await InsurancePlan.findOne({ vehicleType: type });
  if (!dbPlan) {
    await seedInsurancePlans();
    dbPlan = await InsurancePlan.findOne({ vehicleType: type });
  }

  const typeRates = dbPlan ? dbPlan.rates : defaultRates[type];
  if (!typeRates) {
    throw new ApiError(400, 'Invalid vehicle type for premium calculation');
  }

  const premium = typeRates[duration];
  if (!premium) {
    throw new ApiError(400, 'Invalid duration type for premium calculation');
  }

  return premium;
};

// Create a new insurance purchase request
export const createInsuranceRequest = asyncHandler(async (req, res) => {
  const { vehicleNumber, vehicleType, duration } = req.body;
  const userId = req.user?.id || req.user?.sub;

  if (!userId) {
    throw new ApiError(401, 'Authorization token is required');
  }

  if (!vehicleNumber || !vehicleType || !duration) {
    throw new ApiError(400, 'Missing required fields: vehicleNumber, vehicleType, duration');
  }

  const premiumAmount = await calculatePremium(vehicleType, duration);

  const insurance = await Insurance.create({
    userId,
    vehicleNumber,
    vehicleType,
    duration,
    premiumAmount,
    status: 'pending',
  });

  return res.status(201).json({
    success: true,
    message: 'Insurance request submitted successfully',
    data: insurance,
  });
});

// Get user's insurance history
export const getUserInsurances = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?.sub;

  if (!userId) {
    throw new ApiError(401, 'Authorization token is required');
  }

  const insurances = await Insurance.find({ userId }).sort({ createdAt: -1 });

  return res.json({
    success: true,
    data: insurances,
  });
});

// Admin: Get all insurance requests
export const getAdminInsurances = asyncHandler(async (req, res) => {
  const { status, vehicleNumber } = req.query;
  const query = {};

  if (status) {
    query.status = status;
  }

  if (vehicleNumber) {
    query.vehicleNumber = new RegExp(String(vehicleNumber).trim(), 'i');
  }

  const insurances = await Insurance.find(query)
    .populate('userId', 'name phone email')
    .sort({ createdAt: -1 });

  return res.json({
    success: true,
    data: insurances,
  });
});

// Admin: Update insurance request status
export const updateInsuranceStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['approved', 'rejected', 'active'].includes(status)) {
    throw new ApiError(400, 'Invalid status update. Choose approved, rejected or active');
  }

  const insurance = await Insurance.findById(id);

  if (!insurance) {
    throw new ApiError(404, 'Insurance request not found');
  }

  insurance.status = status;

  if (status === 'approved' || status === 'active') {
    // Generate simple policy number if not already present
    if (!insurance.policyNumber) {
      insurance.policyNumber = `POL-${Math.floor(10000000 + Math.random() * 90000000)}`;
    }

    // Set expiration date based on duration
    const now = new Date();
    if (insurance.duration === '1_month') {
      now.setMonth(now.getMonth() + 1);
    } else if (insurance.duration === '6_months') {
      now.setMonth(now.getMonth() + 6);
    } else if (insurance.duration === '1_year') {
      now.setFullYear(now.getFullYear() + 1);
    }
    insurance.expiresAt = now;
  }

  await insurance.save();

  return res.json({
    success: true,
    message: `Insurance request successfully updated to ${status}`,
    data: insurance,
  });
});

// Get all insurance plans (prices)
export const getInsurancePlans = asyncHandler(async (req, res) => {
  let plans = await InsurancePlan.find({});
  if (plans.length === 0) {
    await seedInsurancePlans();
    plans = await InsurancePlan.find({});
  }
  return res.json({
    success: true,
    data: plans,
  });
});

// Admin: Update insurance plan prices
export const updateInsurancePlan = asyncHandler(async (req, res) => {
  const { vehicleType, rates } = req.body;

  if (!vehicleType || !rates) {
    throw new ApiError(400, 'Missing required fields: vehicleType, rates');
  }

  const type = String(vehicleType).toLowerCase();
  if (!['bike', 'car', 'auto', 'truck'].includes(type)) {
    throw new ApiError(400, 'Invalid vehicle type');
  }

  let plan = await InsurancePlan.findOne({ vehicleType: type });
  if (!plan) {
    plan = new InsurancePlan({ vehicleType: type });
  }

  plan.rates = {
    '1_month': Number(rates['1_month']),
    '6_months': Number(rates['6_months']),
    '1_year': Number(rates['1_year']),
  };

  await plan.save();

  return res.json({
    success: true,
    message: `Premium rates for ${type} updated successfully`,
    data: plan,
  });
});
