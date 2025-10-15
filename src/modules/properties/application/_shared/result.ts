export type ResultError = unknown;

export class Result<T, E = ResultError> {
  private readonly success: boolean;
  private readonly storedValue?: T;
  private readonly storedError?: E;

  private constructor(success: boolean, value?: T, error?: E) {
    this.success = success;
    this.storedValue = value;
    this.storedError = error;
  }

  static ok<T>(value: T): Result<T, never> {
    return new Result<T, never>(true, value);
  }

  static fail<E>(error: E): Result<never, E> {
    return new Result<never, E>(false, undefined, error);
  }

  static combine(results: Result<unknown, unknown>[]): Result<void, unknown> {
    for (const result of results) {
      if (result.isErr()) {
        return Result.fail(result.error);
      }
    }
    return Result.ok(undefined);
  }

  get value(): T {
    if (!this.success) {
      throw new Error("Cannot get the value of an error result");
    }
    return this.storedValue as T;
  }

  get error(): E {
    if (this.success) {
      throw new Error("Cannot get the error of an ok result");
    }
    return this.storedError as E;
  }

  isOk(): this is Result<T, never> {
    return this.success;
  }

  isErr(): this is Result<never, E> {
    return !this.success;
  }

  map<U>(mapper: (value: T) => U): Result<U, E> {
    if (this.isErr()) {
      return Result.fail(this.error);
    }
    try {
      return Result.ok(mapper(this.value));
    } catch (error) {
      return Result.fail(error as E);
    }
  }

  async mapAsync<U>(mapper: (value: T) => Promise<U>): Promise<Result<U, E>> {
    if (this.isErr()) {
      return Result.fail(this.error);
    }
    try {
      const mapped = await mapper(this.value);
      return Result.ok(mapped);
    } catch (error) {
      return Result.fail(error as E);
    }
  }
}

export type AsyncResult<T, E = ResultError> = Promise<Result<T, E>>;
