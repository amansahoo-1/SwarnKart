// backend/utils/init_admin.js
import prisma from "../client/prismaClient.js";
import { Role } from "../generated/prisma/index.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { adminCreateSchema } from "../validations/admin.validation.js";
import { hashPassword } from "../utils/hash.js";

export const bootstrapSuperAdmin = asyncHandler(async (req, res) => {
  const { secret } = req.query;

  if (secret !== process.env.SUPERADMIN_SECRET) {
    return res.status(401).json({ message: "Unauthorized access" });
  }

  const exists = await prisma.admin.findFirst({
    where: { role: Role.SUPERADMIN },
  });

  if (exists) {
    return res.status(403).json({ message: "SuperAdmin already exists" });
  }

  const data = adminCreateSchema.parse(req.body);
  const hashedPassword = await hashPassword(data.password);

  const superAdmin = await prisma.admin.create({
    data: {
      ...data,
      password: hashedPassword,
      role: Role.SUPERADMIN,
    },
  });

  return res.status(201).json({
    message: "SuperAdmin created successfully",
    data: {
      id: superAdmin.id,
      name: superAdmin.name,
      email: superAdmin.email,
    },
  });
});
