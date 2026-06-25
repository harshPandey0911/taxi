import mongoose from 'mongoose';

const insuranceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaxiUser',
      required: true,
      index: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    vehicleType: {
      type: String,
      enum: ['bike', 'car', 'auto', 'truck'],
      required: true,
    },
    duration: {
      type: String,
      enum: ['1_month', '6_months', '1_year'],
      required: true,
    },
    premiumAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'active'],
      default: 'pending',
      index: true,
    },
    policyNumber: {
      type: String,
      default: '',
      trim: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

insuranceSchema.index({ vehicleNumber: 1 });
insuranceSchema.index({ status: 1, userId: 1 });

const InsuranceModel = mongoose.models.TaxiInsurance || mongoose.model('TaxiInsurance', insuranceSchema);

export const Insurance = InsuranceModel;
