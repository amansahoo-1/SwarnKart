// backend/controllers/inquiryController.js
import prisma from "../client/prismaClient.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  inquiryCreateSchema,
  inquiryUpdateSchema,
  inquiryIdParamSchema,
} from "../validations/inquiry.validation.js";
import { paginationSchema } from "../validations/common.validation.js";
import {
  errorResponse,
  successResponse,
} from "../middleware/errorMiddleware.js";

// Reusable inquiry select fields
const inquirySelectFields = {
  id: true,
  message: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  admin: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

// ✅ Create Inquiry (Public)
export const createInquiry = asyncHandler(async (req, res) => {
  const validatedData = inquiryCreateSchema.parse(req.body);

  const inquiry = await prisma.inquiry.create({
    data: validatedData,
    select: inquirySelectFields,
  });

  return successResponse(res, inquiry, "Inquiry submitted successfully", 201);
});

// ✅ Get All Inquiries (Admin only)
export const getInquiries = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = paginationSchema.parse(req.query);
  const skip = (page - 1) * limit;

  const whereClause = status ? { status } : {};

  const [inquiries, total] = await Promise.all([
    prisma.inquiry.findMany({
      where: whereClause,
      skip,
      take: limit,
      select: inquirySelectFields,
      orderBy: { createdAt: "desc" },
    }),
    prisma.inquiry.count({ where: whereClause }),
  ]);

  return successResponse(
    res,
    {
      inquiries,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
    "Inquiries fetched successfully"
  );
});

// ✅ Get Inquiry by ID (Admin only)
export const getInquiryById = asyncHandler(async (req, res) => {
  const { id } = inquiryIdParamSchema.parse(req.params);

  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
    select: inquirySelectFields,
  });

  if (!inquiry) {
    return errorResponse(res, "Inquiry not found", 404);
  }

  return successResponse(res, inquiry, "Inquiry details fetched");
});

// ✅ Assign Inquiry to Admin
export const assignInquiry = asyncHandler(async (req, res) => {
  const { id } = inquiryIdParamSchema.parse(req.params);
  const { adminId } = req.body;

  // Check if admin exists
  const adminExists = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { id: true },
  });

  if (!adminExists) {
    return errorResponse(res, "Admin not found", 404);
  }

  // Check if inquiry exists
  const inquiryExists = await prisma.inquiry.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!inquiryExists) {
    return errorResponse(res, "Inquiry not found", 404);
  }

  const updatedInquiry = await prisma.inquiry.update({
    where: { id },
    data: {
      adminId,
      status: "ASSIGNED",
      updatedAt: new Date(),
    },
    select: inquirySelectFields,
  });

  return successResponse(res, updatedInquiry, "Inquiry assigned successfully");
});

// ✅ Update Inquiry Status (Admin only)
export const updateInquiryStatus = asyncHandler(async (req, res) => {
  const { id } = inquiryIdParamSchema.parse(req.params);
  const { status } = inquiryUpdateSchema.parse(req.body);

  // Check if inquiry exists
  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
  });

  if (!inquiry) {
    return errorResponse(res, "Inquiry not found", 404);
  }

  // Validate status transition
  if (inquiry.status === "RESOLVED" && status !== "RESOLVED") {
    return errorResponse(res, "Cannot change status from RESOLVED", 400);
  }

  const updatedInquiry = await prisma.inquiry.update({
    where: { id },
    data: {
      status,
      updatedAt: new Date(),
    },
    select: inquirySelectFields,
  });

  return successResponse(res, updatedInquiry, "Inquiry status updated");
});

// ✅ Add Response to Inquiry (Admin only)
export const addInquiryResponse = asyncHandler(async (req, res) => {
  const { id } = inquiryIdParamSchema.parse(req.params);
  const { response } = req.body;

  // Check if inquiry exists
  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
  });

  if (!inquiry) {
    return errorResponse(res, "Inquiry not found", 404);
  }

  // Create inquiry response
  const inquiryResponse = await prisma.inquiryResponse.create({
    data: {
      inquiryId: id,
      adminId: req.admin.id,
      response,
      status: "RESPONDED",
    },
    select: {
      id: true,
      response: true,
      createdAt: true,
      admin: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Update inquiry status
  await prisma.inquiry.update({
    where: { id },
    data: {
      status: "RESPONDED",
      updatedAt: new Date(),
    },
  });

  return successResponse(
    res,
    inquiryResponse,
    "Response added successfully",
    201
  );
});

// ✅ Get Inquiry Responses
export const getInquiryResponses = asyncHandler(async (req, res) => {
  const { id } = inquiryIdParamSchema.parse(req.params);

  const responses = await prisma.inquiryResponse.findMany({
    where: { inquiryId: id },
    select: {
      id: true,
      response: true,
      createdAt: true,
      admin: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return successResponse(res, responses, "Inquiry responses fetched");
});

// ✅ Delete Inquiry (Admin only)
export const deleteInquiry = asyncHandler(async (req, res) => {
  const { id } = inquiryIdParamSchema.parse(req.params);

  await prisma.$transaction([
    prisma.inquiryResponse.deleteMany({
      where: { inquiryId: id },
    }),
    prisma.inquiry.delete({
      where: { id },
    }),
  ]);

  return successResponse(res, null, "Inquiry deleted successfully", 204);
});
