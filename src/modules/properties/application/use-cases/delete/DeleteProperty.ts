// Caso de uso: eliminación lógica de propiedades.
// Respetar reglas de dominio (soft delete).
// Además, elimina archivos de S3 (media y documentos).
import { deletePropertySchema } from "../../validators/property.schema";
import type { PropertyRepo } from "../../ports/PropertyRepo";
import type { MediaStorage } from "../../ports/MediaStorage";
import type { DocumentRepo } from "../../ports/DocumentRepo";
import type { Clock } from "../../ports/Clock";
import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";
import { toDomain } from "../../mappers/property.mapper";
import { deleteFromS3 } from "../../../infrastructure/adapters/MediaStorage";

export class DeleteProperty {
  private readonly repo: PropertyRepo;
  private readonly clock: Clock;
  private readonly mediaStorage: MediaStorage;
  private readonly documentRepo: DocumentRepo;

  constructor(deps: {
    repo: PropertyRepo;
    clock: Clock;
    mediaStorage: MediaStorage;
    documentRepo: DocumentRepo;
  }) {
    this.repo = deps.repo;
    this.clock = deps.clock;
    this.mediaStorage = deps.mediaStorage;
    this.documentRepo = deps.documentRepo;
  }

  async execute(rawInput: unknown): Promise<Result<void>> {
    const parsedInput = parseWith(deletePropertySchema, rawInput);
    if (parsedInput.isErr()) {
      return Result.fail(parsedInput.error);
    }

    const propertyId = parsedInput.value.id;

    // 1. Verificar que la propiedad existe
    const propertyResult = await this.repo.getById(propertyId);
    if (propertyResult.isErr()) {
      return Result.fail(propertyResult.error);
    }

    // 2. Obtener todos los s3Keys de media y documentos
    const mediaKeysResult = await this.mediaStorage.getAllS3Keys(propertyId);
    const documentKeysResult = await this.documentRepo.getAllS3Keys(propertyId);

    const mediaKeys = mediaKeysResult.isOk() ? mediaKeysResult.value : [];
    const documentKeys = documentKeysResult.isOk() ? documentKeysResult.value : [];

    const allKeys = [...mediaKeys, ...documentKeys];

    // 3. Eliminar archivos de S3 (no falla el proceso si alguno falla)
    console.log(`🗑️  Deleting ${allKeys.length} files from S3...`);
    const deletePromises = allKeys.map(async (key) => {
      try {
        await deleteFromS3(key);
        console.log(`✅ Deleted from S3: ${key}`);
      } catch (error) {
        console.error(`❌ Failed to delete ${key}:`, error);
        // No lanzar error, continuar con el proceso
      }
    });

    await Promise.allSettled(deletePromises);

    // 4. Eliminar registros de documentos de BD (no tienen CASCADE)
    console.log(`🗑️  Deleting document records from database...`);
    const documentsListResult = await this.documentRepo.listByProperty(propertyId);
    if (documentsListResult.isOk()) {
      const deleteDocPromises = documentsListResult.value.map(async (doc) => {
        try {
          const deleteResult = await this.documentRepo.delete(doc.id);
          if (deleteResult.isOk()) {
            console.log(`✅ Deleted document record: ${doc.id}`);
          } else {
            console.error(`❌ Failed to delete document ${doc.id}:`, deleteResult.error);
          }
        } catch (error) {
          console.error(`❌ Error deleting document ${doc.id}:`, error);
        }
      });
      await Promise.allSettled(deleteDocPromises);
    }

    // 5. Eliminar registros de media_assets de BD (CASCADE no funcionó confiable)
    console.log(`🗑️  Deleting media_assets records from database...`);
    const mediaListResult = await this.mediaStorage.listMedia(propertyId);
    if (mediaListResult.isOk()) {
      const deleteMediaPromises = mediaListResult.value.map(async (media) => {
        try {
          const deleteResult = await this.mediaStorage.remove(propertyId, media.id);
          if (deleteResult.isOk()) {
            console.log(`✅ Deleted media record: ${media.id}`);
          } else {
            console.error(`❌ Failed to delete media ${media.id}:`, deleteResult.error);
          }
        } catch (error) {
          console.error(`❌ Error deleting media ${media.id}:`, error);
        }
      });
      await Promise.allSettled(deleteMediaPromises);
    }

    // 6. Realizar soft delete en la base de datos
    const entity = toDomain(propertyResult.value, { clock: this.clock });
    entity.softDelete(this.clock.now());

    const repoResult = await this.repo.softDelete(entity.id.toString());
    return repoResult.isErr() ? Result.fail(repoResult.error) : Result.ok(undefined);
  }
}
