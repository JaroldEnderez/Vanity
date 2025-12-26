const prisma = require("../prisma/client");

const getAllBranches = async () => {
  return await prisma.branch.findMany({
    include: { staff: true, services: true },
  });
};

const getBranchById = async (id) => {
  return await prisma.branch.findUnique({
    where: { id },
    include: { staff: true, services: true },
  });
};

const createBranch = async (data) => {
  return await prisma.branch.create({
    data: { name: data.name, address: data.address },
  });
};

const updateBranch = async (id, data) => {
  return await prisma.branch.update({
    where: { id },
    data: { name: data.name, address: data.address },
  });
};

const deleteBranch = async (id) => {
  return await prisma.branch.delete({
    where: { id },
  });
};

module.exports = {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
};

