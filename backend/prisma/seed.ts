import { PrismaClient} from "@prisma/client"
const prisma = new PrismaClient()

async function seedBaseData() {
  console.log("Seeding database...")

    const branch = await prisma.branch.create({
        data:{
            name: "Annex Branch 4",
            address: "Northside",
        }
    })

    const stylist = await prisma.staff.create({
        data:{
            name: "John",
            role: "STYLIST",
            branch: {
              connect:{id: branch.id}
            }
        }
    })

    const cashier = await prisma.staff.create({
    data: {
      name: "Ana Cashier",
      role: "CASHIER",
      branchId: branch.id,
    },
  });

  // 3️⃣ Services
  const haircut = await prisma.service.create({
    data: {
      name: "Haircut",
      price: 300,
      durationMin: 30,
      usesMaterials: false,
    },
  });

  const rebond = await prisma.service.create({
    data: {
      name: "Rebond",
      price: 2500,
      durationMin: 120,
      usesMaterials: true,
    },
  });

  // 4️⃣ Materials
  const rebondCream = await prisma.material.create({
    data: {
      name: "Rebond Cream",
      unit: "ml",
      stock: 5000,
    },
  });

  const neutralizer = await prisma.material.create({
    data: {
      name: "Neutralizer",
      unit: "ml",
      stock: 3000,
    },
  });

  // 5️⃣ Link service ↔ materials
  await prisma.serviceMaterial.createMany({
    data: [
      {
        serviceId: rebond.id,
        materialId: rebondCream.id,
        quantity: 50,
      },
      {
        serviceId: rebond.id,
        materialId: neutralizer.id,
        quantity: 30,
      },
    ],
  });

  // 6️⃣ Add-ons
  const hairSpa = await prisma.addOn.create({
    data: {
      name: "Hair Spa",
      price: 150,
      serviceId: haircut.id,
    },
  });

  const deepTreatment = await prisma.addOn.create({
    data: {
      name: "Deep Treatment",
      price: 300,
      serviceId: rebond.id,
    },
  });

  // 7️⃣ Customer
  const customer = await prisma.customer.create({
    data: {
      name: "Walk-in Customer",
      phone: "09171234567",
    },
  });

  console.log("✅ Seeding finished");

  console.log({
    branchId: branch.id,
    stylistId: stylist.id,
    cashierId: cashier.id,
    haircutServiceId: haircut.id,
    rebondServiceId: rebond.id,
    customerId: customer.id,
    hairSpaAddOnId: hairSpa.id,
    rebondCreamId: rebondCream.id,
  });
}

async function seedSalesData() {
  console.log('🌱 Seeding database...');

  // ─────────────────────
  // BRANCHES
  // ─────────────────────
  const branches = await prisma.branch.createMany({
    data: [
      { name: 'Main Branch', address: 'Downtown' },
      { name: 'Annex Branch', address: 'Northside' }
    ]
  });

  const allBranches = await prisma.branch.findMany();

  // ─────────────────────
  // STAFF
  // ─────────────────────
  const staffData = [];
  for (const branch of allBranches) {
    staffData.push(
      { name: 'Ana Cashier', role: 'CASHIER', branchId: branch.id },
      { name: 'John Stylist', role: 'STAFF', branchId: branch.id },
      { name: 'Mia Stylist', role: 'STAFF', branchId: branch.id }
    );
  }

  await prisma.staff.createMany({ data: staffData });
  const staff = await prisma.staff.findMany();

  // ─────────────────────
  // SERVICES
  // ─────────────────────
  const services = await prisma.service.createMany({
    data: [
      { name: 'Haircut', durationMin: 30, price: 300, isActive: true },
      { name: 'Hair Color', durationMin: 90, price: 1200, isActive: true },
      { name: 'Hair Spa', durationMin: 45, price: 600, isActive: true },
      { name: 'Beard Trim', durationMin: 15, price: 150, isActive: true },
      { name: 'Rebond', durationMin: 120, price: 1800, isActive: true },
      { name: 'Shampoo', durationMin: 10, price: 100, isActive: true }
    ]
  });

  const allServices = await prisma.service.findMany();

  // ─────────────────────
  // ADD-ONS
  // ─────────────────────
  for (const service of allServices) {
    if (service.name === 'Haircut') {
      await prisma.addOn.createMany({
        data: [
          { name: 'Hair Spa', price: 150, serviceId: service.id },
          { name: 'Shampoo', price: 100, serviceId: service.id }
        ]
      });
    }
  }

  // ─────────────────────
  // CUSTOMERS
  // ─────────────────────
  await prisma.customer.createMany({
    data: Array.from({ length: 20 }).map((_, i) => ({
      name: `Customer ${i + 1}`,
      phone: `0917${Math.floor(1000000 + Math.random() * 8999999)}`
    }))
  });

  const customers = await prisma.customer.findMany();
  const addOns = await prisma.addOn.findMany();

  // ─────────────────────
  // SALES (LAST 30 DAYS)
  // ─────────────────────
  const today = new Date();

  for (let i = 0; i < 80; i++) {
    const service = allServices[Math.floor(Math.random() * allServices.length)];
    const branch = allBranches[Math.floor(Math.random() * allBranches.length)];
    const cashier = staff.find(
      s => s.branchId === branch.id && s.role === 'CASHIER'
    )!;
    const customer = customers[Math.floor(Math.random() * customers.length)];

    const saleDate = new Date(today);
    saleDate.setDate(today.getDate() - Math.floor(Math.random() * 30));

    let addOnTotal = 0;
    const chosenAddOns = addOns.filter(a => a.serviceId === service.id);
    const selectedAddOns =
      Math.random() > 0.5 ? chosenAddOns.slice(0, 1) : [];

    addOnTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);

    const sale = await prisma.sale.create({
      data: {
        serviceId: service.id,
        branchId: branch.id,
        staffId: cashier.id,
        customerId: customer.id,
        basePrice: service.price,
        addOns: addOnTotal,
        total: service.price + addOnTotal,
        createdAt: saleDate
      }
    });

    for (const addOn of selectedAddOns) {
      await prisma.saleAddOn.create({
        data: {
          saleId: sale.id,
          addOnId: addOn.id,
          price: addOn.price
        }
      });
    }
  }

  console.log('✅ Seeding complete!');
}

async function main() {
  await seedBaseData()
  await seedSalesData()
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())