export type EstadoFirma = 'PendienteDeFirma' | 'Firmado' | 'Vigente' | 'Rechazado' | 'Archivado';
export type TipoContrato = 'Intermediacion' | 'Oferta' | 'Promesa';

export interface IContract {
  // Propiedades existentes
  id: string;
  propiedadId: string;
  propiedadNombre: string;
  propiedadImagenUrl: string;
  tipoContrato: TipoContrato;
  contraparte: string;
  monto: number;
  estadoFirma: EstadoFirma;
  vigencia: string; // 'DD/MM/YYYY'
  porcentajeCompletado: number;

  // Nuevos campos
  moneda?: string;
  fechaCreacion?: string;
  s3Key?: string; // s3Key del documento del contrato para descarga
  metadata?: {
    fileName?: string;
    size?: number;
    contentType?: string;
    uploadedAt?: string;
  };
  checklist?: Array<{
    id: number;
    tarea: string;
    completada: boolean;
  }>;
  documentos?: Array<{
    id: string;
    nombre: string;
    version: string;
    fecha: string;
    origen: string;
  }>;

  // Mantener índice de string para compatibilidad
  [key: string]: unknown;
}

// Simulación de datos para el desarrollo
export const mockContracts: IContract[] = [
  {
    id: 'CONT-001',
    propiedadId: 'P001',
    propiedadNombre: 'Casa moderna en Polanco',
    propiedadImagenUrl: 'uploads/1234-polanco.jpg', // s3Key para preview
    tipoContrato: 'Intermediacion',
    contraparte: 'María González',
    monto: 2850000,
    moneda: 'MXN',
    estadoFirma: 'PendienteDeFirma',
    vigencia: '14/4/2024',
    fechaCreacion: '2024-03-14T10:00:00Z',
    porcentajeCompletado: 75,
    checklist: [
      { id: 1, tarea: 'KYC del cliente asociado verificado', completada: true },
      { id: 2, tarea: 'Certificado de no adeudo predial', completada: true },
      { id: 3, tarea: 'Firma del publicador de la propiedad', completada: true },
      { id: 4, tarea: 'Firma del cliente asociado', completada: false },
    ],
    documentos: [
      {
        id: 'doc1',
        nombre: 'Escrituras Originales',
        version: '1.0',
        fecha: '2024-03-14',
        origen: 'Novalia',
      },
      {
        id: 'doc2',
        nombre: 'Avalúo Certificado',
        version: '1.0',
        fecha: '2024-03-14',
        origen: 'Notaría',
      },
    ],
  },
  {
    id: 'CONT-002',
    propiedadId: 'P002',
    propiedadNombre: 'Departamento en Roma Norte',
    propiedadImagenUrl: 'uploads/5678-roma.jpg', // s3Key para preview
    tipoContrato: 'Oferta',
    contraparte: 'Carlos Ruiz',
    monto: 1850000,
    moneda: 'MXN',
    estadoFirma: 'Firmado',
    vigencia: '29/6/2024',
    fechaCreacion: '2024-02-15T14:30:00Z',
    porcentajeCompletado: 100,
    checklist: [
      { id: 1, tarea: 'KYC del cliente asociado verificado', completada: true },
      { id: 2, tarea: 'Certificado de no adeudo predial', completada: true },
      { id: 3, tarea: 'Firma del publicador de la propiedad', completada: true },
      { id: 4, tarea: 'Firma del cliente asociado', completada: true },
    ],
    documentos: [
      {
        id: 'doc1',
        nombre: 'Escrituras Originales',
        version: '1.0',
        fecha: '2024-02-15',
        origen: 'Novalia',
      },
      {
        id: 'doc2',
        nombre: 'Avalúo Certificado',
        version: '1.0',
        fecha: '2024-02-15',
        origen: 'Notaría',
      },
      {
        id: 'doc3',
        nombre: 'Cédula Catastral',
        version: '1.0',
        fecha: '2024-02-15',
        origen: 'Novalia',
      },
    ],
  },
  {
    id: 'CONT-003',
    propiedadId: 'P003',
    propiedadNombre: 'Oficina en Santa Fe',
    propiedadImagenUrl: 'uploads/9012-santafe.jpg', // s3Key para preview
    tipoContrato: 'Promesa',
    contraparte: 'Inmobiliaria Del Valle',
    monto: 3500000,
    moneda: 'MXN',
    estadoFirma: 'Vigente',
    vigencia: '30/12/2024',
    fechaCreacion: '2024-01-20T09:15:00Z',
    porcentajeCompletado: 75,
    checklist: [
      { id: 1, tarea: 'KYC del cliente asociado verificado', completada: true },
      { id: 2, tarea: 'Certificado de no adeudo predial', completada: true },
      { id: 3, tarea: 'Firma del publicador de la propiedad', completada: true },
      { id: 4, tarea: 'Firma del cliente asociado', completada: false },
    ],
    documentos: [
      {
        id: 'doc1',
        nombre: 'Escrituras Originales',
        version: '1.0',
        fecha: '2024-01-20',
        origen: 'Novalia',
      },
      {
        id: 'doc2',
        nombre: 'Avalúo Certificado',
        version: '1.0',
        fecha: '2024-01-20',
        origen: 'Notaría',
      },
    ],
  },
  {
    id: 'CONT-004',
    propiedadId: 'P004',
    propiedadNombre: 'Casa en Guadalajara Centro',
    propiedadImagenUrl: 'uploads/3456-guadalajara.jpg', // s3Key para preview
    tipoContrato: 'Intermediacion',
    contraparte: 'Ana Martínez',
    monto: 3100000,
    moneda: 'MXN',
    estadoFirma: 'Rechazado',
    vigencia: '29/2/2024',
    fechaCreacion: '2024-01-05T16:45:00Z',
    porcentajeCompletado: 75,
    checklist: [
      { id: 1, tarea: 'KYC del cliente asociado verificado', completada: true },
      { id: 2, tarea: 'Certificado de no adeudo predial', completada: true },
      { id: 3, tarea: 'Firma del publicador de la propiedad', completada: true },
      { id: 4, tarea: 'Firma del cliente asociado', completada: false },
    ],
    documentos: [
      {
        id: 'doc1',
        nombre: 'Escrituras Originales',
        version: '1.0',
        fecha: '2024-01-05',
        origen: 'Novalia',
      },
    ],
  },
  {
    id: 'CONT-005',
    propiedadId: 'P005',
    propiedadNombre: 'Terreno comercial en Monterrey',
    propiedadImagenUrl: 'uploads/7890-monterrey.jpg', // s3Key para preview
    tipoContrato: 'Intermediacion',
    contraparte: 'Grupo Inmobiliario Norte',
    monto: 1800000,
    moneda: 'MXN',
    estadoFirma: 'Archivado',
    vigencia: '14/2/2024',
    fechaCreacion: '2023-12-01T11:20:00Z',
    porcentajeCompletado: 50,
    checklist: [
      { id: 1, tarea: 'KYC del cliente asociado verificado', completada: true },
      { id: 2, tarea: 'Certificado de no adeudo predial', completada: true },
      { id: 3, tarea: 'Firma del publicador de la propiedad', completada: false },
      { id: 4, tarea: 'Firma del cliente asociado', completada: false },
    ],
    documentos: [
      {
        id: 'doc1',
        nombre: 'Escrituras Originales',
        version: '1.0',
        fecha: '2023-12-01',
        origen: 'Novalia',
      },
      {
        id: 'doc2',
        nombre: 'Cédula Catastral',
        version: '1.0',
        fecha: '2023-12-01',
        origen: 'Novalia',
      },
    ],
  },
];