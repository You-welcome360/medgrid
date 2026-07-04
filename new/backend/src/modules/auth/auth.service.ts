import bcrypt from "bcrypt";

import { prisma } from "../../config/prisma";
import { generateToken } from "../../config/jwt";

import { LoginInput } from "./auth.validation";

export class AuthService {
  static async login(data: LoginInput) {

    const user = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
      include: {
        facility: true,
      },
    });

    if (!user) {
      throw new Error("INVALID_CREDENTIALS");
    }

    if (!user.isActive) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const passwordMatch = await bcrypt.compare(
      data.password,
      user.passwordHash
    );

    if (!passwordMatch) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const token = generateToken({
      user_id: user.id,
      email: user.email,
      role: user.role,
      facility_id: user.facilityId,
      is_first_login: user.isFirstLogin,
    });

    return {
      token,

      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        facility_id: user.facilityId,
        is_first_login: user.isFirstLogin,
        facility_type: user.facility?.type || null,
      },
    };
  }

  // ---------------- RESET PASSWORD ----------------
  static async resetPassword(userId: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error("USER_NOT_FOUND");

    if (!user.isFirstLogin) {
      throw new Error("NOT_FIRST_LOGIN");
    }

    if (newPassword.length < 8) {
      throw new Error("WEAK_PASSWORD");
    }

    const isSame = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSame) throw new Error("SAME_PASSWORD");

    const hashed = await bcrypt.hash(newPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashed,
        isFirstLogin: false,
      },
    });

    const token = generateToken({
      user_id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      facility_id: updatedUser.facilityId,
      is_first_login: updatedUser.isFirstLogin,
    });

    return { token };
  }

  // ---------------- CHANGE PASSWORD ----------------
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error("USER_NOT_FOUND");

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) throw new Error("INVALID_PASSWORD");

    if (newPassword.length < 8) {
      throw new Error("WEAK_PASSWORD");
    }

    const same = await bcrypt.compare(newPassword, user.passwordHash);
    if (same) throw new Error("SAME_PASSWORD");

    const hashed = await bcrypt.hash(newPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashed,
        isFirstLogin: false,
      },
    });

    const token = generateToken({
      user_id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      facility_id: updatedUser.facilityId,
      is_first_login: updatedUser.isFirstLogin,
    });

    return { token };
  }
}