import type { Result } from "../_shared/result";
import type { PublicPropertyListFiltersDTO, PublicPropertyPage } from "../dto/PublicPropertyDTO";

export interface PublicPropertyRepo {
  listPublished(filters: PublicPropertyListFiltersDTO): Promise<Result<PublicPropertyPage>>;
}
