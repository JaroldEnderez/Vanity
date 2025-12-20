const prisma = require("../prisma/client");

// GET all services
const getAllServices = async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      include: { branch: true },
    });
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
    const service = await prisma.service.findUnique({
      where: { id },
      include: { branch: true },
    });
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
    const service = await prisma.service.create({
      data: {
        name,
        description,
        durationMin,
        price,
        branchId,
        isActive: isActive !== undefined ? isActive : true,
      },
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
    const service = await prisma.service.update({
      where: { id },
      data: {
        name,
        description,
        durationMin,
        price,
        branchId,
        isActive,
      },
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
    await prisma.service.delete({
      where: { id },
    });
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

