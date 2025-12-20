const prisma = require("../prisma/client");

// GET all sales
const getAllSales = async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({
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
    res.json(sales);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
};

// GET sale by ID
const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.findUnique({
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
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }
    res.json(sale);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch sale" });
  }
};

// CREATE sale
const createSale = async (req, res) => {
    try {
      const {
        serviceId,
        branchId,
        staffId,
        customerId,
        basePrice,
        addOns,      // number (total addons price)
        total,

        saleAddOns,      // [{ addOnId, price }]
        materials   // [{ materialId, quantity }]
      } = req.body;
  
      if (!serviceId || !branchId || !staffId || basePrice === undefined || total === undefined) {
        return res.status(400).json({
          error: "serviceId, branchId, staffId, basePrice, and total are required",
        });
      }
  
      const sale = await prisma.sale.create({
        data: {
          serviceId,
          branchId,
          staffId,
          customerId,
  
          basePrice,
          addOns: addOns || 0,
          total,
        
          saleAddOns: saleAddOns?. length
            ? {
                create: saleAddOns.map(a => ({
                    addOnId: a.addOnId,
                    price: a.price
                }))
            }: undefined,
  
          materials: materials?.length
            ? {
                create: materials.map(m => ({
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
          saleAddOns: {
            include: {addOn: true}
          },
          materials: {
            include: {material: true}
          }
        },
      });
  
      res.status(201).json(sale);
    } catch (err) {
      console.error("Error creating sale:", err);
      res.status(500).json({ error: "Failed to create sale", details: err.message });
    }
  };
  

// UPDATE sale
const updateSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceId, branchId, staffId, basePrice, addOns, total, customerId } = req.body;

    const sale = await prisma.sale.update({
      where: { id },
      data: {
        serviceId,
        branchId,
        staffId,
        basePrice,
        addOns,
        total,
        customerId,
      },
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
    res.json(sale);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update sale" });
  }
};

// DELETE sale
const deleteSale = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.sale.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete sale" });
  }
};

module.exports = {
  getAllSales,
  getSaleById,
  createSale,
  updateSale,
  deleteSale,
};

