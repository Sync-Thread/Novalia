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

  get value(): T {
    if (!this.success) {
      throw new Error("Cannot obtain value from a failed result");
    }
    return this.storedValue as T;
  }

  get error(): E {
    if (this.success) {
      throw new Error("Cannot obtain error from a successful result");
    }
    return this.storedError as E;
  }

  isOk(): this is Result<T, never> {
    return this.success;
  }

  isErr(): this is Result<never, E> {
    return !this.success;
  }
}

export type AsyncResult<T, E = ResultError> = Promise<Result<T, E>>;
