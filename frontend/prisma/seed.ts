import { db } from "@/src/app/lib/db";

async function main(){
    console.log("Seeding branches and staff...")
    
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

    // Create staff with unique names for each branch
    const staff = await Promise.all([
        // Downtown Plaza staff
        db.staff.create({
            data: {
                name: "Maria Santos",
                role: "Senior Stylist",
                branchId: branches[0].id,
            }
        }),
        db.staff.create({
            data: {
                name: "James Rodriguez",
                role: "Cashier",
                branchId: branches[0].id,
            }
        }),
        db.staff.create({
            data: {
                name: "Sophia Chen",
                role: "Color Specialist",
                branchId: branches[0].id,
            }
        }),

        // Mall of Elegance staff
        db.staff.create({
            data: {
                name: "David Kim",
                role: "Master Stylist",
                branchId: branches[1].id,
            }
        }),
        db.staff.create({
            data: {
                name: "Emma Wilson",
                role: "Receptionist",
                branchId: branches[1].id,
            }
        }),
        db.staff.create({
            data: {
                name: "Michael Brown",
                role: "Hair Technician",
                branchId: branches[1].id,
            }
        }),

        // Riverside Salon staff
        db.staff.create({
            data: {
                name: "Isabella Garcia",
                role: "Lead Stylist",
                branchId: branches[2].id,
            }
        }),
        db.staff.create({
            data: {
                name: "Alexander Taylor",
                role: "Cashier",
                branchId: branches[2].id,
            }
        }),
        db.staff.create({
            data: {
                name: "Olivia Martinez",
                role: "Nail Specialist",
                branchId: branches[2].id,
            }
        }),
    ]);

    console.log(`Created ${staff.length} staff members`);

    console.log("Seeding services...")

    const services = [
        { name: "Haircut", price: 250, durationMin: 30 },
        { name: "Hair Coloring", price: 1500, durationMin: 120 },
        { name: "Manicure", price: 300, durationMin: 45 },
        { name: "Pedicure", price: 350, durationMin: 60 },
        { name: "Hair Spa", price: 800, durationMin: 90 },
    ];

    for (const service of services) {
        const existing = await db.service.findFirst({
            where: { name: service.name },
        });

        if (!existing) {
            await db.service.create({
                data: service,
            });
        }
    }

    console.log("Services seeded.")
    console.log("\n=== Summary ===")
    console.log(`Branches: ${branches.map(b => b.name).join(", ")}`)
    console.log(`Staff: ${staff.map(s => `${s.name} (${s.role})`).join(", ")}`)
}

main()
.catch((e) => {
    console.error(e);
    process.exit(1)
})
.finally(async()=> {
    await db.$disconnect()
})
