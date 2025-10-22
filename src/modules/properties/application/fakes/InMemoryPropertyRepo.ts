import type { PropertyRepo } from "../ports/PropertyRepo";
import type { ListFiltersDTO } from "../dto/FiltersDTO";
import type {
  CreatePropertyDTO,
  Page,
  PropertyDTO,
  UpdatePropertyDTO,
} from "../dto/PropertyDTO";
import { Result } from "../_shared/result";
import { generateId } from "../_shared/id";

function cloneProperty(property: PropertyDTO): PropertyDTO {
  return JSON.parse(JSON.stringify(property)) as PropertyDTO;
}

export class InMemoryPropertyRepo implements PropertyRepo {
  private items: PropertyDTO[] = [];

  constructor(seed: PropertyDTO[] = []) {
    this.items = seed.map(cloneProperty);
  }

  async list(filters: ListFiltersDTO): Promise<Result<Page<PropertyDTO>>> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;

    let data = this.items.filter(item => !item.deletedAt);

    if (filters.q) {
      const term = filters.q.toLowerCase();
      data = data.filter(item =>
        item.title.toLowerCase().includes(term) || item.id.toLowerCase().includes(term),
      );
    }
    if (filters.status && filters.status !== "all") {
      data = data.filter(item => item.status === filters.status);
    }
    if (filters.propertyType) {
      data = data.filter(item => item.propertyType === filters.propertyType);
    }
    if (filters.city) {
      data = data.filter(item => item.address.city?.toLowerCase() === filters.city?.toLowerCase());
    }
    if (filters.state) {
      data = data.filter(item => item.address.state?.toLowerCase() === filters.state?.toLowerCase());
    }
    if (typeof filters.priceMin === "number") {
      data = data.filter(item => item.price.amount >= filters.priceMin!);
    }
    if (typeof filters.priceMax === "number") {
      data = data.filter(item => item.price.amount <= filters.priceMax!);
    }

    switch (filters.sortBy) {
      case "price_asc":
        data = [...data].sort((a, b) => a.price.amount - b.price.amount);
        break;
      case "price_desc":
        data = [...data].sort((a, b) => b.price.amount - a.price.amount);
        break;
      case "completeness_desc":
        data = [...data].sort((a, b) => (b.completenessScore ?? 0) - (a.completenessScore ?? 0));
        break;
      case "recent":
      default:
        data = [...data].sort((a, b) => {
          const left = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
          const right = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
          return left - right;
        });
        break;
    }

    const total = data.length;
    const offset = (page - 1) * pageSize;
    const items = data.slice(offset, offset + pageSize).map(cloneProperty);

    return Result.ok({ items, total, page, pageSize });
  }

  async getById(id: string): Promise<Result<PropertyDTO>> {
    const found = this.items.find(item => item.id === id && !item.deletedAt);
    if (!found) {
      return Result.fail(new Error("Property not found"));
    }
    return Result.ok(cloneProperty(found));
  }

  async create(input: CreatePropertyDTO): Promise<Result<{ id: string }>> {
    const record: PropertyDTO = {
      ...cloneProperty(input as PropertyDTO),
      createdAt: input.createdAt ?? new Date().toISOString(),
      updatedAt: input.updatedAt ?? new Date().toISOString(),
    };
    this.items.push(record);
    return Result.ok({ id: record.id });
  }

  async update(id: string, patch: UpdatePropertyDTO): Promise<Result<void>> {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) {
      return Result.fail(new Error("Property not found"));
    }
    const current = this.items[index];
    const next: PropertyDTO = {
      ...current,
      ...patch,
      address: patch.address ? { ...current.address, ...patch.address } : current.address,
      price: patch.price ?? current.price,
      hoaFee: patch.hoaFee ?? current.hoaFee,
      amenities: patch.amenities ?? current.amenities,
      tags: patch.tags ?? current.tags,
      updatedAt: new Date().toISOString(),
    };
    this.items[index] = next;
    return Result.ok(undefined);
  }

  async publish(id: string, at: Date): Promise<Result<void>> {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return Result.fail(new Error("Property not found"));
    this.items[index] = {
      ...this.items[index],
      status: "published",
      publishedAt: at.toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return Result.ok(undefined);
  }

  async pause(id: string): Promise<Result<void>> {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return Result.fail(new Error("Property not found"));
    this.items[index] = {
      ...this.items[index],
      status: "draft",
      updatedAt: new Date().toISOString(),
    };
    return Result.ok(undefined);
  }

  async markSold(id: string, at: Date): Promise<Result<void>> {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return Result.fail(new Error("Property not found"));
    this.items[index] = {
      ...this.items[index],
      status: "sold",
      soldAt: at.toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return Result.ok(undefined);
  }

  async softDelete(id: string): Promise<Result<void>> {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return Result.fail(new Error("Property not found"));
    this.items[index] = {
      ...this.items[index],
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return Result.ok(undefined);
  }

  async duplicate(
    id: string,
    opts: { copyMedia?: boolean | undefined; copyDocs?: boolean | undefined },
  ): Promise<Result<{ id: string }>> {
    const source = this.items.find(item => item.id === id);
    if (!source) {
      return Result.fail(new Error("Property not found"));
    }
    const { copyMedia = false, copyDocs = false } = opts;
    void copyMedia;
    void copyDocs;
    const newId = generateId();
    const clone: PropertyDTO = {
      ...cloneProperty(source),
      id: newId,
      title: `${source.title} (copy)`,
      status: "draft",
      publishedAt: null,
      soldAt: null,
      deletedAt: null,
      internalId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.items.push(clone);
    return Result.ok({ id: newId });
  }
}
