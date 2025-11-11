export interface DomainClock {
  now(): Date;
}

export const systemClock: DomainClock = {
  now: () => new Date(),
};
