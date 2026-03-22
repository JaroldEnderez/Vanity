import { db } from "./db";
import { WALK_IN_CUSTOMER_ID, WALK_IN_CUSTOMER_NAME } from "./walkInCustomer";

/** Ensures the Walk-in system customer row exists (idempotent). Call from API routes. */
export async function ensureWalkInCustomer(): Promise<void> {
  await db.customer.upsert({
    where: { id: WALK_IN_CUSTOMER_ID },
    create: {
      id: WALK_IN_CUSTOMER_ID,
      name: WALK_IN_CUSTOMER_NAME,
    },
    update: {
      name: WALK_IN_CUSTOMER_NAME,
    },
  });
}
