const prisma = require("../prisma/client");

const getAllCustomers = async () => {
  return await prisma.customer.findMany({
    include: { sales: true },
  });
};

const getCustomerById = async (id) => {
  return await prisma.customer.findUnique({
    where: { id },
    include: { sales: true },
  });
};

const getCustomerByPhone = async (phone) => {
  return await prisma.customer.findUnique({
    where: { phone },
    include: { sales: true },
  });
};

const createCustomer = async (data) => {
  return await prisma.customer.create({
    data: {
      name: data.name,
      phone: data.phone,
    },
  });
};

const updateCustomer = async (id, data) => {
  return await prisma.customer.update({
    where: { id },
    data: {
      name: data.name,
      phone: data.phone,
    },
  });
};

const deleteCustomer = async (id) => {
  return await prisma.customer.delete({
    where: { id },
  });
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  getCustomerByPhone,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};




