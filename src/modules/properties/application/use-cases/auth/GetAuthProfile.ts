import type { AuthProfile, AuthService } from "../../ports/AuthService";
import { Result } from "../../_shared/result";

export class GetAuthProfile {
  private readonly auth: AuthService;

  constructor(deps: { auth: AuthService }) {
    this.auth = deps.auth;
  }

  async execute(): Promise<Result<AuthProfile>> {
    const profileResult = await this.auth.getCurrent();
    if (profileResult.isErr()) {
      return Result.fail(profileResult.error);
    }
    return Result.ok(profileResult.value);
  }
}

