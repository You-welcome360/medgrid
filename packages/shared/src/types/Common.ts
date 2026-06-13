export type UUID = string;

export type ISODateString = string;

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export interface GeoLocation {
  latitude: number;

  longitude: number;
}

export interface Address {
  region: string;

  district: string;

  addressLine?: string;
}
