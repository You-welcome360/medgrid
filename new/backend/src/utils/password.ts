import { randomInt } from "crypto";

export const generatePassword = (length = 12): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*";

  let pass = "";
  for (let i = 0; i < length; i++) {
    pass += chars[randomInt(0, chars.length)];
  }

  return pass;
};
