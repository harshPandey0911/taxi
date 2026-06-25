import mongoose from 'mongoose';

const insurancePlanSchema = new mongoose.Schema(
  {
    vehicleType: {
      type: String,
      enum: ['bike', 'car', 'auto', 'truck'],
      required: true,
      unique: true,
      lowercase: true,
    },
    rates: {
      '1_month': { type: Number, required: true },
      '6_months': { type: Number, required: true },
      '1_year': { type: Number, required: true },
    },
  },
  {
    timestamps: true,
  }
);

const InsurancePlanModel = mongoose.models.TaxiInsurancePlan || mongoose.model('TaxiInsurancePlan', insurancePlanSchema);

export const InsurancePlan = InsurancePlanModel;

// Helper to seed initial plan rates if they don't exist
export const seedInsurancePlans = async () => {
  try {
    const count = await InsurancePlan.countDocuments();
    if (count === 0) {
      const defaultPlans = [
        { vehicleType: 'bike', rates: { '1_month': 100, '6_months': 500, '1_year': 900 } },
        { vehicleType: 'auto', rates: { '1_month': 150, '6_months': 750, '1_year': 1300 } },
        { vehicleType: 'car', rates: { '1_month': 300, '6_months': 1500, '1_year': 2700 } },
        { vehicleType: 'truck', rates: { '1_month': 500, '6_months': 2500, '1_year': 4500 } },
      ];
      await InsurancePlan.insertMany(defaultPlans);
      console.log('Successfully seeded default Taxi Insurance Plans');
    }
  } catch (err) {
    console.error('Error seeding Taxi Insurance Plans:', err);
  }
};
