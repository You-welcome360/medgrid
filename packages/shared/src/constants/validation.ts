export const VALIDATION = {
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 100,

    REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
  },

  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },

  EMAIL: {
    MAX_LENGTH: 255,
  },

  PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 20,
  },

  FACILITY_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 255,
  },

  INVENTORY_ITEM_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 255,
  },

  DESCRIPTION: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 1000,
  },
} as const;
