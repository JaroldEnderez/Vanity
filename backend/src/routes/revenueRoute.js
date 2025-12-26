const express = require("express");
const router = express.Router();
const revenueController = require("../controllers/revenueController");

router.get("/total", revenueController.getTotalRevenue);
router.get("/by-branch", revenueController.getRevenueByBranch);
router.get("/by-service", revenueController.getRevenueByService);
router.get("/daily", revenueController.getDailyRevenue);

module.exports = router;
