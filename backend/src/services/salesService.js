const prisma = require("../prisma/client");

// GET all sales
const getAllSales = async () => {
  return prisma.sale.findMany({
    include: {
      service: true,
      branch: true,
      staff: true,
      customer: true,
      saleAddOns: {
        include: { addOn: true },
      },
      materials: {
        include: { material: true },
      },
      payments: true,
    },
  });
};

// GET sale by ID
const getSaleById = async (id) => {
  return prisma.sale.findUnique({
    where: { id },
    include: {
      service: true,
      branch: true,
      staff: true,
      customer: true,
      saleAddOns: {
        include: { addOn: true },
      },
      materials: {
        include: { material: true },
      },
      payments: true,
    },
  });
};

// CREATE sale
const createSale = async (data) => {
  const {
    serviceId,
    branchId,
    staffId,
    customerId,
    basePrice,
    addOns = 0,
    total,
    saleAddOns,
    materials,
  } = data;

  return prisma.sale.create({
    data: {
      serviceId,
      branchId,
      staffId,
      customerId,
      basePrice,
      addOns,
      total,

      saleAddOns: saleAddOns?.length
        ? {
            create: saleAddOns.map((a) => ({
              addOnId: a.addOnId,
              price: a.price,
            })),
          }
        : undefined,

      materials: materials?.length
        ? {
            create: materials.map((m) => ({
              materialId: m.materialId,
              quantity: m.quantity,
            })),
          }
        : undefined,
    },

    include: {
      service: true,
      branch: true,
      staff: true,
      customer: true,
      saleAddOns: { include: { addOn: true } },
      materials: { include: { material: true } },
    },
  });
};

// UPDATE sale
const updateSale = async (id, data) => {
  return prisma.sale.update({
    where: { id },
    data,
    include: {
      service: true,
      branch: true,
      staff: true,
      customer: true,
      saleAddOns: { include: { addOn: true } },
      materials: { include: { material: true } },
      payments: true,
    },
  });
};

// DELETE sale
const deleteSale = async (id) => {
  return prisma.sale.delete({
    where: { id },
  });
};

module.exports = {
  getAllSales,
  getSaleById,
  createSale,
  updateSale,
  deleteSale,
};
