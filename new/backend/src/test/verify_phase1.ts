import { prisma } from "../config/prisma.js";
import { CoordinationService } from "../modules/coordination/coordination.service.js";
import { FacilityService } from "../modules/facility/facility.service.js";
import { generateToken } from "../config/jwt.js";
import { Prisma } from "@prisma/client";

async function verify() {
  console.log("=== STARTING PHASE 1 VERIFICATION ===");

  // 1. Ensure test resource types exist
  let drugResourceType = await prisma.resourceTypeInfo.findUnique({
    where: { name: "Paracetamol 500mg Tablet" },
  });

  if (!drugResourceType) {
    drugResourceType = await prisma.resourceTypeInfo.create({
      data: {
        name: "Paracetamol 500mg Tablet",
        type: "DRUG",
        defaultPrice: new Prisma.Decimal(2.5),
      },
    });
    console.log("Created test ResourceTypeInfo: Paracetamol 500mg Tablet");
  } else {
    console.log("Test ResourceTypeInfo already exists");
  }

  // 2. Fetch or create Requesting Facility (Hospital)
  let requestFacility = await prisma.facility.findUnique({
    where: { name: "Requesting Hospital" },
  });

  if (!requestFacility) {
    requestFacility = await prisma.facility.create({
      data: {
        name: "Requesting Hospital",
        location: "5.6037,-0.1870 Accra GH",
        type: "HOSPITAL",
        phone: "+233240000001",
        balance: new Prisma.Decimal(500.0), // Start with 500.00
      },
    });
    console.log("Created Requesting Hospital with balance 500.00");
  } else {
    // Reset balance to 500
    requestFacility = await prisma.facility.update({
      where: { id: requestFacility.id },
      data: { balance: new Prisma.Decimal(500.0) },
    });
    console.log("Reset Requesting Hospital balance to 500.00");
  }

  // 3. Fetch or create Responding Facility (Pharmacy/Hospital)
  let respondFacility = await prisma.facility.findUnique({
    where: { name: "Responding Pharmacy" },
  });

  if (!respondFacility) {
    respondFacility = await prisma.facility.create({
      data: {
        name: "Responding Pharmacy",
        location: "5.6037,-0.1870 Accra GH",
        type: "PHARMACY",
        phone: "+233240000002",
        balance: new Prisma.Decimal(0.0),
      },
    });
    console.log("Created Responding Pharmacy with balance 0.00");
  } else {
    respondFacility = await prisma.facility.update({
      where: { id: respondFacility.id },
      data: { balance: new Prisma.Decimal(0.0) },
    });
    console.log("Reset Responding Pharmacy balance to 0.00");
  }

  // Ensure responding facility has inventory for this drug
  let inventoryItem = await prisma.inventoryItem.findFirst({
    where: {
      facilityId: respondFacility.id,
      resourceType: "DRUG",
      name: "Paracetamol 500mg Tablet",
    },
  });

  if (!inventoryItem) {
    inventoryItem = await prisma.inventoryItem.create({
      data: {
        facilityId: respondFacility.id,
        resourceType: "DRUG",
        name: "Paracetamol 500mg Tablet",
        quantity: 1000,
        price: new Prisma.Decimal(2.0),
        isMovable: true,
      },
    });
    console.log("Created inventory stock for Responding Pharmacy (1000 Qty @ 2.00)");
  } else {
    inventoryItem = await prisma.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: { quantity: 1000, price: new Prisma.Decimal(2.0) },
    });
    console.log("Reset inventory stock for Responding Pharmacy to 1000 Qty");
  }

  // 4. Create test User
  const testUserEmail = "test-coordinator@reqhospital.com";
  let user = await prisma.user.findUnique({
    where: { email: testUserEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: testUserEmail,
        passwordHash: "dummy-hash",
        role: "COORDINATION_MANAGER",
        facilityId: requestFacility.id,
        isFirstLogin: false,
        isActive: true,
      },
    });
    console.log("Created test user:", testUserEmail);
  }

  // Generate JWT token (for route/API level testing)
  const token = generateToken({
    user_id: user.id,
    email: user.email,
    role: user.role,
    facility_id: user.facilityId,
    is_first_login: user.isFirstLogin,
  });
  console.log("Generated test token successfully");

  // === FLOW 1: REQUEST CREATION & UPFRONT DEDUCTION ===
  console.log("\n--- FLOW 1: Request Creation with Upfront Deduction ---");
  const reqQty = 100;
  const createResult = await CoordinationService.createRequest(user.id, requestFacility.id, {
    resource_type_id: drugResourceType.id,
    quantity: reqQty,
    urgency_level: "medium",
    classification: "normal",
  });

  console.log("Created request ID:", createResult.request.id);
  console.log("Initial Estimate Cost (100 * 2.50):", Number(createResult.request.totalAmount));
  console.log("Balance After Request Creation (Expected 250.00):", Number(createResult.balance_after));

  if (Number(createResult.balance_after) !== 250.00) {
    throw new Error(`Upfront deduction failed! Expected 250.00, got ${createResult.balance_after}`);
  }
  console.log("✅ Flow 1 Passed: Upfront balance deducted successfully!");

  // === FLOW 2: FULFILLMENT & RECONCILIATION ===
  console.log("\n--- FLOW 2: Request Fulfillment & Payout/Reconciliation ---");
  // Fulfill request. The responder's price is 2.00, which is cheaper than 2.50.
  // Requester should be refunded difference: (2.50 - 2.00) * 100 = 50.00 refund.
  // Requester balance: 250.00 + 50.00 = 300.00.
  // Responder payout: 2.00 * 100 = 200.00.
  // Responder inventory quantity: 1000 - 100 = 900.
  const fulfilledReq = await CoordinationService.fulfillRequest(
    createResult.request.id,
    requestFacility.id,
    false, // isSuperAdmin
    user.id,
    {
      responding_facility_id: respondFacility.id,
      price_per_unit: 2.0,
    }
  );

  console.log("Request Status after fulfillment:", fulfilledReq.request.status);
  console.log("Fulfillment Final Unit Price:", Number(fulfilledReq.request.pricePerUnit));
  console.log("Fulfillment Final Total Amount:", Number(fulfilledReq.request.totalAmount));

  // Check requesting facility balance
  const reqFacBal = await prisma.facility.findUnique({
    where: { id: requestFacility.id },
  });
  console.log("Requester Balance after adjustment (Expected 300.00):", Number(reqFacBal?.balance));
  if (Number(reqFacBal?.balance) !== 300.00) {
    throw new Error(`Requester balance adjustment failed! Expected 300.00, got ${reqFacBal?.balance}`);
  }

  // Check responding facility balance
  const resFacBal = await prisma.facility.findUnique({
    where: { id: respondFacility.id },
  });
  console.log("Responder Balance after payout (Expected 200.00):", Number(resFacBal?.balance));
  if (Number(resFacBal?.balance) !== 200.00) {
    throw new Error(`Responder payout failed! Expected 200.00, got ${resFacBal?.balance}`);
  }

  // Check responding facility inventory
  const updatedInv = await prisma.inventoryItem.findFirst({
    where: { facilityId: respondFacility.id, resourceType: "DRUG", name: "Paracetamol 500mg Tablet" },
  });
  console.log("Responder Inventory Quantity after deduction (Expected 900):", updatedInv?.quantity);
  if (updatedInv?.quantity !== 900) {
    throw new Error(`Responder inventory deduction failed! Expected 900, got ${updatedInv?.quantity}`);
  }
  console.log("✅ Flow 2 Passed: Fulfillment and reconciliation payout succeeded!");

  // === FLOW 3: REQUEST CANCELLATION & REFUND ===
  console.log("\n--- FLOW 3: Request Creation & Cancellation Refund ---");
  // Create another request (deducts 250.00 from 300.00 -> balance becomes 50.00)
  const req2 = await CoordinationService.createRequest(user.id, requestFacility.id, {
    resource_type_id: drugResourceType.id,
    quantity: 100,
    urgency_level: "high",
    classification: "normal",
  });
  console.log("Created second request ID:", req2.request.id);

  // Cancel second request. Should refund 250.00, bringing balance back to 300.00.
  const cancelResult = await CoordinationService.cancelRequest(
    req2.request.id,
    requestFacility.id,
    false // isSuperAdmin
  );

  console.log("Request Status after cancellation:", cancelResult.request.status);
  console.log("Refunded Amount:", Number(cancelResult.refund_amount));
  console.log("Requester Balance after cancellation (Expected 300.00):", Number(cancelResult.balance_after));

  if (Number(cancelResult.balance_after) !== 300.00) {
    throw new Error(`Cancellation refund failed! Expected 300.00, got ${cancelResult.balance_after}`);
  }
  console.log("✅ Flow 3 Passed: Request cancellation and full refund succeeded!");

  // === FLOW 4: PAYSTACK WEBHOOK WEBHOOK TOP-UP PROCESSING ===
  console.log("\n--- FLOW 4: Paystack Webhook & Top-up Processing ---");
  // Initialize topup
  const topupInit = await FacilityService.initializeTopUp(
    requestFacility.id,
    user.email,
    500.0, // Top up 500.00
    "http://localhost:3000/callback"
  );
  console.log("Initialized Top-Up reference:", topupInit.reference);
  console.log("Initialize Top-Up payment url:", topupInit.payment_url);

  // Simulate webhook payload processing
  const webhookResult = await FacilityService.processPaystackWebhook(
    topupInit.reference,
    "success"
  );
  console.log("Webhook process status:", webhookResult.status);

  // Check requesting facility balance (should be 300.00 + 500.00 = 800.00)
  const finalFacBal = await prisma.facility.findUnique({
    where: { id: requestFacility.id },
  });
  console.log("Requester Balance after Top-up (Expected 800.00):", Number(finalFacBal?.balance));
  if (Number(finalFacBal?.balance) !== 800.00) {
    throw new Error(`Paystack top-up webhook processing failed! Expected 800.00, got ${finalFacBal?.balance}`);
  }

  // Check transaction status
  const ledgerTx = await prisma.balanceTransaction.findUnique({
    where: { id: topupInit.transaction_id },
  });
  console.log("Ledger Transaction Status (Expected completed):", ledgerTx?.status);
  if (ledgerTx?.status !== "completed") {
    throw new Error(`Ledger status update failed! Expected completed, got ${ledgerTx?.status}`);
  }
  console.log("✅ Flow 4 Passed: Paystack mock webhook integration successfully top-up balance!");

  console.log("\n=== ALL FLOWS PASSED SUCCESSFULLY ===");
}

verify()
  .catch((e) => {
    console.error("❌ Verification Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
