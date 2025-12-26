const revenueService = require("../services/revenueService");

// ✅ DONE (you already had this)
const getTotalRevenue = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const totalRevenue = await revenueService.getTotalRevenue(
      new Date(startDate),
      new Date(endDate)
    );

    res.json(totalRevenue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get total revenue" });
  }
};

// ✅ Revenue by branch
const getRevenueByBranch = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const data = await revenueService.getRevenueByBranch(
      new Date(startDate),
      new Date(endDate)
    );

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get revenue by branch" });
  }
};

// ✅ Revenue by service
const getRevenueByService = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const data = await revenueService.getRevenueByService(
      new Date(startDate),
      new Date(endDate)
    );

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get revenue by service" });
  }
};

// ✅ Daily revenue
const getDailyRevenue = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const data = await revenueService.getDailyRevenue(
      new Date(startDate),
      new Date(endDate)
    );

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get daily revenue" });
  }
};

module.exports = {
  getTotalRevenue,
  getRevenueByBranch,
  getRevenueByService,
  getDailyRevenue,
};
