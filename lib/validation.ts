import { z } from "zod";
import { categories, priorities, statuses } from "@/lib/utils";

const coordinate = z.number().finite();

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().email("Enter a valid email address").toLowerCase(),
  password: z.string().min(8, "Password must have at least 8 characters").max(100),
  phone: z.string().trim().max(20).optional(),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z.string().trim().max(20).optional(),
});

export const attachmentSchema = z.object({
  url: z.string().url().max(2048),
  filename: z.string().min(1).max(180),
  mimeType: z.enum(["image/jpeg", "image/png", "application/pdf"]),
  size: z.number().int().positive().max(10 * 1024 * 1024),
});

export const complaintSchema = z.object({
  description: z.string().trim().min(20, "Please describe the issue in at least 20 characters").max(4000),
  address: z.string().trim().max(300).optional(),
  location: z.object({
    latitude: coordinate.min(-90).max(90),
    longitude: coordinate.min(-180).max(180),
    accuracy: z.number().nonnegative().max(100_000).optional(),
  }).optional(),
  attachments: z.array(attachmentSchema).max(6).default([]),
});

export const complaintUpdateSchema = z.object({
  status: z.enum(statuses).optional(),
  priority: z.enum(priorities).optional(),
  category: z.enum(categories).optional(),
  department: z.string().trim().max(100).optional(),
  assignedOfficer: z.string().regex(/^[a-fA-F0-9]{24}$/).optional().nullable(),
  assignmentDecision: z.enum(["ACCEPTED", "DECLINED"]).optional(),
  remarks: z.string().trim().max(2000).optional(),
  resolutionRemarks: z.string().trim().max(2000).optional(),
  resolutionEvidence: z.array(attachmentSchema).max(6).optional(),
});

export const reportQuerySchema = z.object({
  scope: z.enum(["overall", "officer"]).default("overall"),
  officerId: z.string().regex(/^[a-fA-F0-9]{24}$/).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export const chatSchema = z.object({ message: z.string().trim().min(1).max(1000) });

export const officerSchema = z.object({
  name: z.string().trim().min(2, "Enter the officer's full name").max(80),
  email: z.string().trim().email("Enter a valid email address").toLowerCase(),
  password: z.string().min(8, "Use at least 8 characters for the temporary password").max(100),
  department: z.string().trim().min(2, "Select or enter a department").max(100),
  phone: z.string().trim().max(20).optional(),
});

export const managedUserSchema = z.object({
  active: z.boolean().optional(),
  department: z.string().trim().max(100).optional(),
  name: z.string().trim().min(2).max(80).optional(),
});

export const departmentSchema = z.object({
  name: z.string().trim().min(2, "Enter a department name").max(100),
  categories: z.array(z.string().trim().min(2).max(80)).min(1, "Map at least one category").max(20),
  active: z.boolean().default(true),
});
