import * as jwtModule from "jsonwebtoken";
import { env } from "./env";

const jwt: any = (jwtModule as any).default ?? jwtModule;

export interface JwtPayload {
  user_id: string;
  email: string;
  role: string;
  facility_id: string | null;
  is_first_login: boolean;
}

export const generateToken = (payload: JwtPayload) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};