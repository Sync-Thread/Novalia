// Caso de uso: eliminar un contrato
// 1. Elimina archivo de S3
// 2. Elimina registro de BD

import { Result } from "../../../properties/application/_shared/result";
import { deleteFromS3 } from "../../../properties/infrastructure/adapters/MediaStorage";
import type { ContractRepo } from "../ports/ContractRepo";

export class DeleteContract {
  private readonly repo: ContractRepo;

  constructor(repo: ContractRepo) {
    this.repo = repo;
  }

  async execute(contractId: string): Promise<Result<void>> {
    if (!contractId) {
      return Result.fail({
        code: "VALIDATION_ERROR",
        message: "Contract ID is required",
      });
    }

    try {
      // 1. Obtener el contrato para saber su s3_key
      const contractResult = await this.repo.getById(contractId);
      if (contractResult.isErr()) {
        return Result.fail(contractResult.error);
      }

      const contract = contractResult.value;

      // 2. Eliminar archivo de S3 si existe (no falla el proceso si falla S3)
      if (contract.s3Key) {
        console.log(`🗑️ Eliminando archivo de S3: ${contract.s3Key}`);
        try {
          await deleteFromS3(contract.s3Key);
          console.log(`✅ Archivo eliminado de S3`);
        } catch (error) {
          console.error(`❌ Error eliminando de S3 (continuando):`, error);
          // No fallar el proceso completo si S3 falla
        }
      }

      // 3. Eliminar registro de BD
      console.log(`🗑️ Eliminando contrato de BD: ${contractId}`);
      const deleteResult = await this.repo.delete(contractId);
      
      if (deleteResult.isErr()) {
        return Result.fail(deleteResult.error);
      }

      console.log(`✅ Contrato eliminado exitosamente`);
      return Result.ok(undefined);
    } catch (error) {
      console.error("Error eliminando contrato:", error);
      return Result.fail({
        code: "UNKNOWN",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
