// UI constants for properties module
// Contains labels, options, and other UI-specific data

import type { PropertyType } from "../domain/enums";
import { PROPERTY_TYPE_VALUES } from "../domain/enums";

/**
 * Labels en español para tipos de propiedad
 */
export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  house: "Casa",
  apartment: "Departamento",
  land: "Terreno",
  office: "Oficina",
  commercial: "Comercial",
  industrial: "Industrial",
  other: "Otro",
} as const;

/**
 * Opciones para select de tipo de propiedad
 */
export const PROPERTY_TYPE_OPTIONS = PROPERTY_TYPE_VALUES.map((value) => ({
  value,
  label: PROPERTY_TYPE_LABELS[value],
}));

/**
 * Estados de México con sus IDs del INEGI
 * Ordenados alfabéticamente
 */
export const MEXICO_STATES_OPTIONS = [
  { value: "Aguascalientes", label: "Aguascalientes", inegiId: 1 },
  { value: "Baja California", label: "Baja California", inegiId: 2 },
  { value: "Baja California Sur", label: "Baja California Sur", inegiId: 3 },
  { value: "Campeche", label: "Campeche", inegiId: 4 },
  { value: "Chiapas", label: "Chiapas", inegiId: 7 },
  { value: "Chihuahua", label: "Chihuahua", inegiId: 8 },
  { value: "Ciudad de México", label: "Ciudad de México", inegiId: 9 },
  { value: "Coahuila", label: "Coahuila", inegiId: 5 },
  { value: "Colima", label: "Colima", inegiId: 6 },
  { value: "Durango", label: "Durango", inegiId: 10 },
  { value: "Guanajuato", label: "Guanajuato", inegiId: 11 },
  { value: "Guerrero", label: "Guerrero", inegiId: 12 },
  { value: "Hidalgo", label: "Hidalgo", inegiId: 13 },
  { value: "Jalisco", label: "Jalisco", inegiId: 14 },
  { value: "México", label: "México", inegiId: 15 },
  { value: "Michoacán", label: "Michoacán", inegiId: 16 },
  { value: "Morelos", label: "Morelos", inegiId: 17 },
  { value: "Nayarit", label: "Nayarit", inegiId: 18 },
  { value: "Nuevo León", label: "Nuevo León", inegiId: 19 },
  { value: "Oaxaca", label: "Oaxaca", inegiId: 20 },
  { value: "Puebla", label: "Puebla", inegiId: 21 },
  { value: "Querétaro", label: "Querétaro", inegiId: 22 },
  { value: "Quintana Roo", label: "Quintana Roo", inegiId: 23 },
  { value: "San Luis Potosí", label: "San Luis Potosí", inegiId: 24 },
  { value: "Sinaloa", label: "Sinaloa", inegiId: 25 },
  { value: "Sonora", label: "Sonora", inegiId: 26 },
  { value: "Tabasco", label: "Tabasco", inegiId: 27 },
  { value: "Tamaulipas", label: "Tamaulipas", inegiId: 28 },
  { value: "Tlaxcala", label: "Tlaxcala", inegiId: 29 },
  { value: "Veracruz", label: "Veracruz", inegiId: 30 },
  { value: "Yucatán", label: "Yucatán", inegiId: 31 },
  { value: "Zacatecas", label: "Zacatecas", inegiId: 32 },
];
