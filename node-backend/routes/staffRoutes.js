const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware); // Protect all staff routes

router.get('/dashboard', staffController.getDashboardStats);
router.get('/export', staffController.exportStaffData);
router.get('/next-id', staffController.getNextId);
router.get('/search/:empId', staffController.searchByEmployeeId);
router.get('/', staffController.getAllStaff);
router.get('/:id', staffController.getStaffById);
router.post('/', staffController.createStaff);
router.put('/bulk-pay', staffController.payBulkSalary);
router.put('/:id/pay', staffController.paySalary);
router.put('/:id', staffController.updateStaff);
router.delete('/all', staffController.deleteAllStaff);
router.delete('/:id', staffController.deleteStaff);

module.exports = router;
