import { BaseModel } from "../types/base.model";

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export abstract class BaseMapper {
  static toResponse(model: BaseModel): any {
    return {
      id: model._id.toString(),
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }

  static toResponseList(models: BaseModel[]): any[] {
    return models.map((model) => this.toResponse(model));
  }

  static toPaginatedResponse(
    models: BaseModel[],
    total: number,
    page: number,
    limit: number
  ): PaginatedResponse<any> {
    return {
      data: this.toResponseList(models),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
