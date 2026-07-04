import { z } from "zod";

// ---------------------------------------------------------------------------
// Create Request
// ---------------------------------------------------------------------------
const baseCreateRequestSchema = z.object({
  resource_type_id: z.string().uuid("Invalid resource type ID"),
  quantity: z.number().int().positive("Quantity must be greater than 0"),
  urgency_level: z.enum(["critical", "high", "medium", "low"]),
  timeframe_hours: z.number().int().positive().optional(),
  additional_notes: z.string().optional(),
  classification: z.enum(["normal", "emergency"]).default("normal"),
  broadcast_radius_km: z.number().int().positive().optional(),
});

export const createRequestSchema = baseCreateRequestSchema.superRefine(
  (data, ctx) => {
    if (data.classification === "emergency") {
      // broadcast_radius_km is required for emergency
      if (
        data.broadcast_radius_km === undefined ||
        data.broadcast_radius_km <= 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "broadcast_radius_km is required and must be > 0 for emergency requests",
          path: ["broadcast_radius_km"],
        });
      }

      // urgency_level must be critical or high for emergency
      if (!["critical", "high"].includes(data.urgency_level)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "urgency_level must be 'critical' or 'high' for emergency requests",
          path: ["urgency_level"],
        });
      }
    }
  }
);

export type CreateRequestInput = z.infer<typeof createRequestSchema>;

// ---------------------------------------------------------------------------
// Acknowledge Request (Emergency only)
// ---------------------------------------------------------------------------
export const acknowledgeRequestSchema = z.object({
  estimated_response_time: z.string().optional(),
});

export type AcknowledgeRequestInput = z.infer<typeof acknowledgeRequestSchema>;

// ---------------------------------------------------------------------------
// Fulfill Request
// ---------------------------------------------------------------------------
export const fulfillRequestSchema = z.object({
  responding_facility_id: z
    .string()
    .uuid("Invalid responding facility ID")
    .optional(),
  price_per_unit: z.number().nonnegative("Price must be >= 0").optional(),
  quantity_fulfilled: z.number().int().positive().optional(),
});

export type FulfillRequestInput = z.infer<typeof fulfillRequestSchema>;

// ---------------------------------------------------------------------------
// Cancel Request
// ---------------------------------------------------------------------------
export const cancelRequestSchema = z.object({
  reason: z.string().optional(),
});

export type CancelRequestInput = z.infer<typeof cancelRequestSchema>;
