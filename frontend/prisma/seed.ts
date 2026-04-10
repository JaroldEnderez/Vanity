import "./load-env";
import { db } from "@/src/app/lib/db";
import bcrypt from "bcryptjs";
import { SaleStatus } from "@prisma/client";
import { WALK_IN_CUSTOMER_ID, WALK_IN_CUSTOMER_NAME } from "@/src/app/lib/walkInCustomer";

// Helper to create or find branch account
async function upsertBranchAccount(email: string, password: string, branchId: string) {
    const existing = await db.branchAccount.findFirst({
        where: { branchId },
    });
    if (existing) return existing;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    return db.branchAccount.create({
        data: { email, password: hashedPassword, branchId },
    });
}

// Helper to create or find staff
async function upsertStaff(name: string, role: string, branchId: string) {
    const existing = await db.staff.findFirst({
        where: { name, branchId },
    });
    if (existing) return existing;
    return db.staff.create({
        data: { name, role, branchId },
    });
}

// Helper to create or find customer
async function upsertCustomer(name: string, phone?: string) {
    if (phone) {
        const existing = await db.customer.findFirst({
            where: { phone },
        });
        if (existing) return existing;
    }
    const existingByName = await db.customer.findFirst({
        where: { name },
    });
    if (existingByName) return existingByName;
    return db.customer.create({
        data: { name, phone },
    });
}

async function main(){
    console.log("Seeding branches...")
    
    // Create branches with distinct names
    const branches = await Promise.all([
        db.branch.upsert({
            where: { name: "Downtown Plaza" },
            update: {},
            create: {
                name: "Downtown Plaza",
                address: "123 Main Street, Downtown District",
            }
        }),
        db.branch.upsert({
            where: { name: "Mall of Elegance" },
            update: {},
            create: {
                name: "Mall of Elegance",
                address: "456 Fashion Avenue, Shopping Center",
            }
        }),
        db.branch.upsert({
            where: { name: "Riverside Salon" },
            update: {},
            create: {
                name: "Riverside Salon",
                address: "789 River Road, Waterfront Area",
            }
        }),
    ]);

    console.log(`Created ${branches.length} branches`);

    // ============================================
    // OWNER ACCOUNT (separate from branches)
    // ============================================
    console.log("Seeding owner account...");
    const ownerPassword = await bcrypt.hash("owner123", 10);
    await db.ownerAccount.upsert({
        where: { email: "owner@vanity.com" },
        update: {},
        create: { email: "owner@vanity.com", password: ownerPassword },
    });
    console.log("Owner account: owner@vanity.com (password: owner123)");

    // ============================================
    // BRANCH ACCOUNTS (one login per branch)
    // ============================================
    console.log("Seeding branch accounts...")
    
    const accounts = await Promise.all([
        upsertBranchAccount("downtown@vanity.com", "password123", branches[0].id),
        upsertBranchAccount("mall@vanity.com", "password123", branches[1].id),
        upsertBranchAccount("riverside@vanity.com", "password123", branches[2].id),
    ]);

    console.log(`Created ${accounts.length} branch accounts`);

    // ============================================
    // STYLISTS (5 stylists across branches)
    // ============================================
    console.log("Seeding stylists...")
    
    const stylists = await Promise.all([
        upsertStaff("Maria Santos", "Senior Stylist", branches[0].id),
        upsertStaff("David Kim", "Master Stylist", branches[1].id),
        upsertStaff("Isabella Garcia", "Lead Stylist", branches[2].id),
        upsertStaff("Sophia Chen", "Color Specialist", branches[0].id),
        upsertStaff("Michael Brown", "Hair Technician", branches[1].id),
    ]);

    console.log(`Created ${stylists.length} stylists`);

    // ============================================
    // OTHER STAFF (cashiers, receptionists)
    // ============================================
    console.log("Seeding other staff...")
    
    const otherStaff = await Promise.all([
        upsertStaff("James Rodriguez", "Cashier", branches[0].id),
        upsertStaff("Emma Wilson", "Receptionist", branches[1].id),
        upsertStaff("Alexander Taylor", "Cashier", branches[2].id),
        upsertStaff("Olivia Martinez", "Nail Specialist", branches[2].id),
    ]);

    console.log(`Created ${otherStaff.length} other staff members`);

    // ============================================
    // CUSTOMERS (system Walk-in + sample customers)
    // ============================================
    console.log("Seeding customers...")

    await db.customer.upsert({
        where: { id: WALK_IN_CUSTOMER_ID },
        update: { name: WALK_IN_CUSTOMER_NAME },
        create: { id: WALK_IN_CUSTOMER_ID, name: WALK_IN_CUSTOMER_NAME },
    });
    console.log(`System customer: ${WALK_IN_CUSTOMER_NAME} (${WALK_IN_CUSTOMER_ID})`);
    
    const customers = await Promise.all([
        upsertCustomer("Ana Reyes", "09171234567"),
        upsertCustomer("Carlos Mendoza", "09182345678"),
        upsertCustomer("Patricia Lim", "09193456789"),
        upsertCustomer("Roberto Cruz", "09204567890"),
        upsertCustomer("Diana Santos", "09215678901"),
    ]);

    console.log(`Created ${customers.length} customers`);

    // ============================================
    // INVENTORY: Hair color products & variants
    // ============================================
    console.log("Seeding hair color inventory...")

    /** ml per retail tube (demo default; adjust per product in Inventory). */
    const TUBE_ML = 60;
    /** ml per retail bottle (1 L; 4 L bottles would use 4000 here). */
    const BOTTLE_ML = 1000;

    const hairColorMaterials = [
        // Loreal Majirel variants — stock stored as total ml
        {
            name: "5.1 Ash Brown",
            brand: "Loreal",
            productName: "Majirel",
            category: "HAIR_COLOR" as const,
            unit: "tube",
            packageAmount: TUBE_ML,
            packageMeasure: "ML" as const,
            stock: 3 * TUBE_ML,
        },
        {
            name: "6.3 Golden Brown",
            brand: "Loreal",
            productName: "Majirel",
            category: "HAIR_COLOR" as const,
            unit: "tube",
            packageAmount: TUBE_ML,
            packageMeasure: "ML" as const,
            stock: 5 * TUBE_ML,
        },
        {
            name: "7.1 Dark Blonde",
            brand: "Loreal",
            productName: "Majirel",
            category: "HAIR_COLOR" as const,
            unit: "tube",
            packageAmount: TUBE_ML,
            packageMeasure: "ML" as const,
            stock: 4 * TUBE_ML,
        },
        // Matrix SoColor variants
        {
            name: "6A Dark Ash Blonde",
            brand: "Matrix",
            productName: "SoColor",
            category: "HAIR_COLOR" as const,
            unit: "tube",
            packageAmount: TUBE_ML,
            packageMeasure: "ML" as const,
            stock: 4 * TUBE_ML,
        },
        {
            name: "7C Copper Blonde",
            brand: "Matrix",
            productName: "SoColor",
            category: "HAIR_COLOR" as const,
            unit: "tube",
            packageAmount: TUBE_ML,
            packageMeasure: "ML" as const,
            stock: 6 * TUBE_ML,
        },
        // Developers — stock stored as total ml
        {
            name: "20 Volume Developer",
            brand: "Loreal",
            productName: "Oxydant",
            category: "DEVELOPER" as const,
            unit: "bottle",
            packageAmount: BOTTLE_ML,
            packageMeasure: "ML" as const,
            stock: 10 * BOTTLE_ML,
        },
        {
            name: "30 Volume Developer",
            brand: "Matrix",
            productName: "Cream Developer",
            category: "DEVELOPER" as const,
            unit: "bottle",
            packageAmount: BOTTLE_ML,
            packageMeasure: "ML" as const,
            stock: 8 * BOTTLE_ML,
        },
    ];

    for (const material of hairColorMaterials) {
        const existing = await db.material.findFirst({
            where: {
                name: material.name,
                brand: material.brand,
                productName: material.productName,
            },
        });

        if (!existing) {
            await db.material.create({
                data: material,
            });
        } else {
            await db.material.update({
                where: { id: existing.id },
                data: {
                    brand: material.brand,
                    productName: material.productName,
                    category: material.category,
                    unit: material.unit,
                    packageAmount: material.packageAmount,
                    packageMeasure: material.packageMeasure,
                    stock: existing.stock || material.stock,
                },
            });
        }
    }

    console.log("Hair color inventory seeded.");

    console.log("Seeding services...")

    const services = [
        { name: "Haircut", category: "default" as const, price: 250, durationMin: 30 },
        { name: "Hair Coloring", category: "Hair_coloring" as const, price: 1500, durationMin: 120 },
        { name: "Full Hair Color", category: "Hair_coloring" as const, price: 1800, durationMin: 150 },
        { name: "Balayage", category: "Hair_coloring" as const, price: 2500, durationMin: 180 },
        { name: "Hair Spa", category: "default" as const, price: 800, durationMin: 90 },
        { name: "Keratin Treatment", category: "default" as const, price: 3500, durationMin: 120 },
        { name: "Rebond", category: "default" as const, price: 4000, durationMin: 240 },
        { name: "Perm", category: "default" as const, price: 1200, durationMin: 90 },
        { name: "Blow Dry & Styling", category: "default" as const, price: 400, durationMin: 45 },
        { name: "Manicure", category: "default" as const, price: 300, durationMin: 45 },
        { name: "Pedicure", category: "default" as const, price: 350, durationMin: 60 },
        { name: "Gel Nails", category: "default" as const, price: 600, durationMin: 60 },
    ];

    for (const service of services) {
        const existing = await db.service.findFirst({
            where: { name: service.name },
        });

        if (!existing) {
            await db.service.create({
                data: service,
            });
        } else {
            await db.service.update({
                where: { id: existing.id },
                data: { category: service.category },
            });
        }
    }

    console.log("Services seeded.")

    // ============================================
    // SERVICE ↔ MATERIAL RECIPES (required for stock deduction on sale)
    // ============================================
    console.log("Linking hair coloring services to materials...")
    const tubeColor = await db.material.findFirst({
        where: { name: "5.1 Ash Brown", brand: "Loreal", productName: "Majirel" },
    })
    const developer = await db.material.findFirst({
        where: { name: "30 Volume Developer", brand: "Matrix", productName: "Cream Developer" },
    })
    // Quantities in ml (tube ≈ 60 ml, half of 1 L bottle = 500 ml developer)
    const hairColoringRecipe = [
        { materialId: tubeColor?.id, qty: TUBE_ML },
        { materialId: developer?.id, qty: 500 },
    ].filter((x): x is { materialId: string; qty: number } => Boolean(x.materialId))

    if (hairColoringRecipe.length > 0) {
        const colorServiceNames = ["Hair Coloring", "Full Hair Color", "Balayage"] as const
        for (const name of colorServiceNames) {
            const svc = await db.service.findFirst({ where: { name } })
            if (!svc) continue
            await db.serviceMaterial.deleteMany({ where: { serviceId: svc.id } })
            await db.serviceMaterial.createMany({
                data: hairColoringRecipe.map((r) => ({
                    serviceId: svc.id,
                    materialId: r.materialId,
                    quantity: r.qty,
                })),
            })
            await db.service.update({
                where: { id: svc.id },
                data: { usesMaterials: true },
            })
        }
        console.log("Hair coloring services linked to inventory materials.")
    } else {
        console.warn("Skipped service–material links: materials not found (run hair color seed first).")
    }

    // ============================================
    // DEMO SALES (Mar 1–22, 2026) — random times for chart testing
    // ============================================
    console.log("Seeding demo sales (Mar 2026)...")

    const marchStart = new Date(2026, 2, 1, 0, 0, 0, 0)
    const marchEnd = new Date(2026, 2, 22, 23, 59, 59, 999)

    const demoBranch = branches[0]
    const branchStaffList = await db.staff.findMany({
        where: { branchId: demoBranch.id },
    })
    const demoServices = await db.service.findMany({
        where: { isActive: true },
    })

    if (branchStaffList.length === 0 || demoServices.length === 0) {
        console.warn("Skipped demo sales: need at least one staff and one service on the branch.")
    } else {
        const demoSaleFilter = { name: "Chart seed demo" as const }
        await db.saleService.deleteMany({ where: { sale: demoSaleFilter } })
        await db.saleAddOn.deleteMany({ where: { sale: demoSaleFilter } })
        await db.saleMaterial.deleteMany({ where: { sale: demoSaleFilter } })
        await db.payment.deleteMany({ where: { sale: demoSaleFilter } })
        await db.sale.deleteMany({ where: demoSaleFilter })

        const randomEndedAt = () =>
            new Date(
                marchStart.getTime() +
                    Math.random() * (marchEnd.getTime() - marchStart.getTime()),
            )

        for (let i = 0; i < 10; i++) {
            const endedAt = randomEndedAt()
            const staff = branchStaffList[Math.floor(Math.random() * branchStaffList.length)]!
            const service = demoServices[Math.floor(Math.random() * demoServices.length)]!
            const createdAt = new Date(
                endedAt.getTime() - (30 + Math.random() * 90) * 60 * 1000,
            )

            await db.sale.create({
                data: {
                    branchId: demoBranch.id,
                    staffId: staff.id,
                    name: "Chart seed demo",
                    status: SaleStatus.COMPLETED,
                    basePrice: service.price,
                    addOns: 0,
                    total: service.price,
                    endedAt,
                    createdAt,
                    saleServices: {
                        create: {
                            serviceId: service.id,
                            qty: 1,
                            price: service.price,
                        },
                    },
                },
            })
        }

        console.log("Created 10 demo sales (Mar 1–22, 2026, random times).")
    }

    console.log("\n=== Summary ===")
    console.log(`Owner: owner@vanity.com (password: owner123)`)
    console.log(`Branches: ${branches.map((b: { name: string }) => b.name).join(", ")}`)
    console.log(`\nBranch Login Accounts (password: password123):`)
    accounts.forEach((acc: { email: string }, i: number) => {
        console.log(`  - ${branches[i].name}: ${acc.email}`)
    });
    console.log(`\nStylists: ${stylists.map((s: { name: string; role: string | null }) => `${s.name} (${s.role})`).join(", ")}`)
    console.log(`Other Staff: ${otherStaff.map((s: { name: string; role: string | null }) => `${s.name} (${s.role})`).join(", ")}`)
    console.log(`Customers: ${customers.map((c: { name: string }) => c.name).join(", ")}`)
}

main()
.catch((e) => {
    console.error(e);
    process.exit(1)
})
.finally(async()=> {
    await db.$disconnect()
})
