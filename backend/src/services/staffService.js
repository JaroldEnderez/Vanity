const prisma = require("../prisma/client");

const getAllStaff = async () => {
  return await prisma.staff.findMany({
    include: { branch: true },
  });
};

const getStaffById = async (id) => {
  return await prisma.staff.findUnique({
    where: { id },
    include: { branch: true },
  });
};

const createStaff = async (data) => {
  return await prisma.staff.create({
    data: { name: data.name, role: data.role, branchId: data.branchId },
  });
};

const updateStaff = async (id, data) => {
  return await prisma.staff.update({
    where: { id },
    data: { name: data.name, role: data.role, branchId: data.branchId },
  });
};

const deleteStaff = async (id) => {
  return await prisma.staff.delete({
    where: { id },
  });
};

module.exports = {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
};




