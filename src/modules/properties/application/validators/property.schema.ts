import { z } from "zod";

import type {
  Condition,
  Currency,
  NormalizedStatus,
  OperationType,
  Orientation,
  PropertyType,
  VerificationStatus,
} from "../../domain/enums";
import {
  CONDITION_VALUES,
  CURRENCY_VALUES,
  NORMALIZED_STATUS_VALUES,
  OPERATION_TYPE_VALUES,
  ORIENTATION_VALUES,
  PROPERTY_TYPE_VALUES,
  VERIFICATION_STATUS_VALUES,
} from "../../domain/enums";
import { listFiltersSchema } from "./filters.schema";

export const propertyIdSchema = z.string().uuid();

const currencyEnum = z.enum(CURRENCY_VALUES as [Currency, ...Currency[]]);
const propertyTypeEnum = z.enum(PROPERTY_TYPE_VALUES as [PropertyType, ...PropertyType[]]);
const operationTypeEnum = z.enum(OPERATION_TYPE_VALUES as [OperationType, ...OperationType[]]);
const conditionEnum = z.enum(CONDITION_VALUES as [Condition, ...Condition[]]);
const orientationEnum = z.enum(ORIENTATION_VALUES as [Orientation, ...Orientation[]]);
const verificationEnum = z.enum(
  VERIFICATION_STATUS_VALUES as [VerificationStatus, ...VerificationStatus[]],
);
const normalizedStatusEnum = z.enum(
  NORMALIZED_STATUS_VALUES as [NormalizedStatus, ...NormalizedStatus[]],
);

const priceSchema = z.object({
  amount: z.number().positive(),
  currency: currencyEnum.default("MXN"),
});

const addressSchema = z.object({
  addressLine: z.string().trim().optional().nullable(),
  neighborhood: z.string().trim().optional().nullable(),
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  postalCode: z.string().trim().optional().nullable(),
  country: z.string().trim().min(1),
  displayAddress: z.boolean().default(false),
});

const locationSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .nullable()
  .optional();

const basePropertySchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  propertyType: propertyTypeEnum,
  price: priceSchema,
  operationType: operationTypeEnum.default("sale"),
  bedrooms: z.number().int().min(0).optional().nullable(),
  bathrooms: z.number().min(0).optional().nullable(),
  parkingSpots: z.number().int().min(0).optional().nullable(),
  constructionM2: z.number().min(0).optional().nullable(),
  landM2: z.number().min(0).optional().nullable(),
  levels: z.number().int().min(0).optional().nullable(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear()).optional().nullable(),
  floor: z.number().int().min(0).optional().nullable(),
  hoaFee: priceSchema.optional().nullable(),
  condition: conditionEnum.optional().nullable(),
  furnished: z.boolean().optional().nullable(),
  petFriendly: z.boolean().optional().nullable(),
  orientation: orientationEnum.optional().nullable(),
  amenities: z.array(z.string().trim()).default([]),
  amenitiesExtra: z.string().trim().optional().nullable(),
  address: addressSchema,
  location: locationSchema,
  tags: z.array(z.string().trim()).default([]),
  internalId: z.string().trim().optional().nullable(),
  rppVerification: verificationEnum.optional().nullable(),
  normalizedStatus: normalizedStatusEnum.optional().nullable(),
});

export const createPropertySchema = basePropertySchema;

export const updatePropertySchema = basePropertySchema.partial();

export const publishPropertySchema = z.object({
  id: propertyIdSchema,
});

export const pausePropertySchema = z.object({
  id: propertyIdSchema,
});

export const schedulePublishSchema = z.object({
  id: propertyIdSchema,
  publishAt: z.coerce.date(),
});

export const markSoldSchema = z.object({
  id: propertyIdSchema,
  soldAt: z.coerce.date(),
});

export const deletePropertySchema = z.object({
  id: propertyIdSchema,
});

export const duplicatePropertySchema = z.object({
  id: propertyIdSchema,
  copyMedia: z.boolean().optional(),
  copyDocs: z.boolean().optional(),
});

export const uploadMediaSchema = z.object({
  propertyId: propertyIdSchema,
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  data: z.any(),
  type: z.enum(["image", "video", "floorplan"] as const),
});

export const removeMediaSchema = z.object({
  propertyId: propertyIdSchema,
  mediaId: z.string().uuid(),
});

export const setCoverMediaSchema = z.object({
  propertyId: propertyIdSchema,
  mediaId: z.string().uuid(),
});

export const reorderMediaSchema = z.object({
  propertyId: propertyIdSchema,
  orderedIds: z.array(z.string().uuid()).nonempty(),
});

export const attachDocumentSchema = z.object({
  propertyId: propertyIdSchema,
  docType: z.enum(["rpp_certificate", "deed", "id_doc", "floorplan", "other"] as const),
  url: z.string().url().optional().nullable(),
  s3Key: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const verifyRppSchema = z.object({
  propertyId: propertyIdSchema,
  docId: z.string().uuid(),
  status: z.enum(["pending", "verified", "rejected"] as const),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type PublishPropertyInput = z.infer<typeof publishPropertySchema>;
export type PausePropertyInput = z.infer<typeof pausePropertySchema>;
export type SchedulePublishInput = z.infer<typeof schedulePublishSchema>;
export type MarkSoldInput = z.infer<typeof markSoldSchema>;
export type DeletePropertyInput = z.infer<typeof deletePropertySchema>;
export type DuplicatePropertyInput = z.infer<typeof duplicatePropertySchema>;
export type UploadMediaInput = z.infer<typeof uploadMediaSchema>;
export type RemoveMediaInput = z.infer<typeof removeMediaSchema>;
export type SetCoverMediaInput = z.infer<typeof setCoverMediaSchema>;
export type ReorderMediaInput = z.infer<typeof reorderMediaSchema>;
export type AttachDocumentInput = z.infer<typeof attachDocumentSchema>;
export type VerifyRppInput = z.infer<typeof verifyRppSchema>;

export { listFiltersSchema };
