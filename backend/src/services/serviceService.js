const prisma = require("../prisma/client");

const getAllServices = async () => {
  return await prisma.service.findMany({
    include: { branch: true },
  });
};

const getServiceById = async (id) => {
  return await prisma.service.findUnique({
    where: { id },
    include: { branch: true },
  });
};

const createService = async (data) => {
  return await prisma.service.create({
    data: {
      name: data.name,
      description: data.description,
      durationMin: data.durationMin,
      price: data.price,
      branchId: data.branchId,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });
};

const updateService = async (id, data) => {
  return await prisma.service.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      durationMin: data.durationMin,
      price: data.price,
      branchId: data.branchId,
      isActive: data.isActive,
    },
  });
};

const deleteService = async (id) => {
  return await prisma.service.delete({
    where: { id },
  });
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};




