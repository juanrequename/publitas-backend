import logger from '../utils/logger';

class ExternalService {
  private static readonly ONE_MEGA_BYTE = 1_048_576.0;
  private batchNum: number;

  constructor() {
    this.batchNum = 0;
  }

  public async call(batch: string): Promise<void> {
    this.batchNum += 1;
    this.prettyPrint(batch);
  }

  private prettyPrint(batch: string): void {
    const products = JSON.parse(batch);
    const sizeMB = (Buffer.byteLength(batch) / ExternalService.ONE_MEGA_BYTE).toFixed(2);

    logger.info(`\x1b[1mReceived batch${String(this.batchNum).padStart(4)}\x1b[22m`);
    logger.info(`Size: ${sizeMB.padStart(10)}MB`);
    logger.info(`Products: ${String(products.length).padStart(8)}`);
    logger.info('');
    logger.info('');
  }
}

export default ExternalService;
