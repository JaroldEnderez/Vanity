import { db } from "@/src/app/lib/db";

async function main(){
    console.log("Seeding services...")

    await db.service.createMany({
        data: [
            { name: "Haircut", price: 250, durationMin: 30 },
            { name: "Hair Coloring", price: 1500, durationMin: 120 },
            { name: "Manicure", price: 300, durationMin: 45 },
            { name: "Pedicure", price: 350, durationMin: 60 },
            { name: "Hair Spa", price: 800, durationMin: 90 },
        ]
    })

    console.log("Services seeded.")
}

main()
.catch((e) => {
    console.error(e);
    process.exit(1)
})
.finally(async()=> {
    await db.$disconnect()
})