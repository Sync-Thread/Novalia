import type {
  Condition,
  Currency,
  NormalizedStatus,
  OperationType,
  Orientation,
  PropertyStatus,
  PropertyType,
  VerificationStatus,
} from "../../domain/enums";

export type PriceDTO = { amount: number; currency: Currency };

export type AddressDTO = {
  addressLine?: string | null;
  neighborhood?: string | null;
  city: string;
  state: string;
  postalCode?: string | null;
  country: string;
  displayAddress: boolean;
};

export type LocationDTO = { lat: number; lng: number } | null;

export interface PropertyDTO {
  media: any;
  documents: any;
  id: string;
  orgId: string;
  listerUserId: string | null;
  status: PropertyStatus;
  publishedAt?: string | null;
  soldAt?: string | null;
  title: string;
  description?: string | null;
  price: PriceDTO;
  propertyType: PropertyType;
  operationType: OperationType;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parkingSpots?: number | null;
  constructionM2?: number | null;
  landM2?: number | null;
  levels?: number | null;
  yearBuilt?: number | null;
  floor?: number | null;
  hoaFee?: PriceDTO | null;
  condition?: Condition | null;
  furnished?: boolean | null;
  petFriendly?: boolean | null;
  orientation?: Orientation | null;
  amenities: string[];
  amenitiesExtra?: string | null;
  address: AddressDTO;
  location?: LocationDTO;
  tags: string[];
  internalId?: string | null;
  rppVerification?: VerificationStatus | null;
  completenessScore: number;
  normalizedStatus?: NormalizedStatus | null;
  trustScore?: number | null;
  deletedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type CreatePropertyDTO = PropertyDTO;

export type UpdatePropertyDTO = Partial<Omit<PropertyDTO, "id" | "orgId" | "listerUserId" | "createdAt" | "updatedAt" | "deletedAt">> & {
  title?: string;
  description?: string | null;
  price?: PriceDTO;
};

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
