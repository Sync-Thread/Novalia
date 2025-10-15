import type { ListFiltersDTO } from "../dto/FiltersDTO";
import type {
  CreatePropertyDTO,
  Page,
  PropertyDTO,
  UpdatePropertyDTO,
} from "../dto/PropertyDTO";
import type { Result } from "../_shared/result";

export interface PropertyRepo {
  list(filters: ListFiltersDTO): Promise<Result<Page<PropertyDTO>>>;
  getById(id: string): Promise<Result<PropertyDTO>>;
  create(input: CreatePropertyDTO): Promise<Result<{ id: string }>>;
  update(id: string, patch: UpdatePropertyDTO): Promise<Result<void>>;
  publish(id: string, at: Date): Promise<Result<void>>;
  pause(id: string): Promise<Result<void>>;
  markSold(id: string, at: Date): Promise<Result<void>>;
  softDelete(id: string): Promise<Result<void>>;
  duplicate(
    id: string,
    opts: { copyMedia?: boolean; copyDocs?: boolean },
  ): Promise<Result<{ id: string }>>;
}
