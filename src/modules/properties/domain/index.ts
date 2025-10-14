// src/modules/properties/domain/index.ts
// Re-exports centrales del dominio de Propiedades (limpia y explícita).

// Entidades y enums/VOs
export * from "./entities/Property";
export * from "./entities/Document";
export * from "./entities/MediaAsset";
export * from "./enums";
export * from "./value-objects/Address";
export * from "./value-objects/Money";
export * from "./value-objects/GeoPoint";
export * from "./value-objects/UniqueEntityID";

// Policies y errores (para consumo desde application)
export * as policies from "./policies";
export * from "./errors";

// Services de dominio (puros)
export * from "./services/PropertyFactory";
export * from "./services/ReadinessService";
