export class SingleFlight<T> {
  private active: Promise<T> | null = null;

  run(factory: () => Promise<T>) {
    if (!this.active) {
      this.active = factory().finally(() => {
        this.active = null;
      });
    }
    return this.active;
  }
}
