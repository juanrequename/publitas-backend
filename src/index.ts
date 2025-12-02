import './config';
import path from 'path';
import ExternalService from './services/external.service';
import { BatchService } from './services/batch.service';
import { parseProductFeed } from './feed-parser';
import logger from './utils/logger';

async function main(): Promise<void> {
  const feedPath = path.join(process.cwd(), 'data', 'feed.xml');
  const externalService = new ExternalService();
  const batchService = new BatchService(externalService);

  logger.info({ feedPath }, 'Processing feed');
  await parseProductFeed(feedPath, batchService);
  logger.info('Processing complete');
}

main().catch((error) => {
  logger.error({ err: error }, 'Error processing feed');
  process.exit(1);
});
