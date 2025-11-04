import type { Result } from "../_shared/result";
import type { PublicPropertyListFiltersDTO, PublicPropertyPage } from "../dto/PublicPropertyDTO";
import type { PropertyDTO } from "../dto/PropertyDTO";

export interface PublicPropertyRepo {
  listPublished(filters: PublicPropertyListFiltersDTO): Promise<Result<PublicPropertyPage>>;
  getPublishedById(id: string): Promise<Result<PropertyDTO>>;
}
