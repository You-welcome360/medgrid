import { z } from "zod";

export const bloodSchema = z.object({
  bloodGroup: z.enum([
    "A_POS",
    "A_NEG",
    "B_POS",
    "B_NEG",
    "AB_POS",
    "AB_NEG",
    "O_POS",
    "O_NEG",
  ]),
  quantity: z.number().int().min(0),
  expiryDate: z.string().datetime(),
});

export const drugSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().min(0),
  price: z.number().positive(),
  expiryDate: z.string().datetime(),
});

export const icuSchema = z.object({
  total: z.number().int().min(0),
  available: z.number().int().min(0),
});

export const ventilatorSchema = z.object({
  total: z.number().int().min(0),
  available: z.number().int().min(0),
});

export const oxygenSchema = z.object({
  total: z.number().int().min(0),
  available: z.number().int().min(0),
});

export const theatreSchema = z.object({
  total: z.number().int().min(0),
  available: z.number().int().min(0),
});

export const supplySchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().min(0),
  price: z.number().positive(),
  expiryDate: z.string().datetime(),
  category: z.string().optional(),
  unitMeasure: z.string().optional(),
});