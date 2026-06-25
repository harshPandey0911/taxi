import { Router } from 'express';
import { authenticate } from '../../middlewares/authMiddleware.js';
import {
  createInsuranceRequest,
  getUserInsurances,
  getAdminInsurances,
  updateInsuranceStatus,
  getInsurancePlans,
  updateInsurancePlan
} from '../controllers/insuranceController.js';

export const insuranceRouter = Router();

// User routes
insuranceRouter.post('/', authenticate(['user']), createInsuranceRequest);
insuranceRouter.get('/me', authenticate(['user']), getUserInsurances);
insuranceRouter.get('/plans', authenticate(['user', 'admin']), getInsurancePlans);

// Admin routes
insuranceRouter.get('/admin', authenticate(['admin']), getAdminInsurances);
insuranceRouter.patch('/admin/:id', authenticate(['admin']), updateInsuranceStatus);
insuranceRouter.get('/admin/plans', authenticate(['admin']), getInsurancePlans);
insuranceRouter.put('/admin/plans', authenticate(['admin']), updateInsurancePlan);
