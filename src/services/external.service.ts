class ExternalService {
  private static readonly ONE_MEGA_BYTE = 1_048_576.0;
  private batchNum: number;

  constructor() {
    this.batchNum = 0;
  }

  public call(batch: string): void {
    this.batchNum += 1;
    this.prettyPrint(batch);
  }

  private prettyPrint(batch: string): void {
    const products = JSON.parse(batch);
    console.log(`\x1b[1mReceived batch ${this.batchNum.toString().padStart(4, ' ')}\x1b[22m`);
    console.log(
      `Size: ${(Buffer.byteLength(batch) / ExternalService.ONE_MEGA_BYTE).toFixed(2).padStart(10, ' ')}MB`
    );
    console.log(`Products: ${products.length.toString().padStart(8, ' ')}`);
    console.log();
  }
}

export default ExternalService;
