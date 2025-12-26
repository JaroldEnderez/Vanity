const serviceService = require("../services/serviceService");

// GET all services
const getAllServices = async (req, res) => {
  try {
    const services = await serviceService.getAllServices();
    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch services" });
  }
};

// GET service by ID
const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await serviceService.getServiceById(id);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }
    res.json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch service" });
  }
};

// CREATE service
const createService = async (req, res) => {
  try {
    const { name, description, durationMin, price, branchId, isActive } = req.body;
    const service = await serviceService.createService({
      name,
      description,
      durationMin,
      price,
      branchId,
      isActive,
    });
    res.status(201).json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create service" });
  }
};

// UPDATE service
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, durationMin, price, branchId, isActive } = req.body;
    const service = await serviceService.updateService(id, {
      name,
      description,
      durationMin,
      price,
      branchId,
      isActive,
    });
    res.json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update service" });
  }
};

// DELETE service
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    await serviceService.deleteService(id);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete service" });
  }
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};

