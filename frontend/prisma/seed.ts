import { db } from "@/src/app/lib/db";
import bcrypt from "bcryptjs";

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
    // CUSTOMERS (5 customers)
    // ============================================
    console.log("Seeding customers...")
    
    const customers = await Promise.all([
        upsertCustomer("Ana Reyes", "09171234567"),
        upsertCustomer("Carlos Mendoza", "09182345678"),
        upsertCustomer("Patricia Lim", "09193456789"),
        upsertCustomer("Roberto Cruz", "09204567890"),
        upsertCustomer("Diana Santos", "09215678901"),
    ]);

    console.log(`Created ${customers.length} customers`);

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
