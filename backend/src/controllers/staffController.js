const staffService = require("../services/staffService");

// GET all staff
const getAllStaff = async (req, res) => {
  try {
    const staff = await staffService.getAllStaff();
    res.json(staff);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch staff" });
  }
};

// GET staff by ID
const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await staffService.getStaffById(id);
    if (!staff) {
      res.status(404).json({ error: "Staff not found" });
      return;
    }
    res.json(staff);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch staff" });
  }
};

// CREATE staff
const createStaff = async (req, res) => {
  try {
    const { name, role, branchId } = req.body;
    const staff = await staffService.createStaff({ name, role, branchId });
    res.status(201).json(staff);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create staff" });
  }
};

// UPDATE staff
const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, branchId } = req.body;
    const staff = await staffService.updateStaff(id, { name, role, branchId });
    res.json(staff);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update staff" });
  }
};

// DELETE staff
const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    await staffService.deleteStaff(id);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete staff" });
  }
};

module.exports = {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
};

