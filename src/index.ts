import path from 'path';
import ExternalService from './services/external.service';
import { BatchService } from './services/batch.service';
import { parseProductFeed } from './feed-parser';

async function main(): Promise<void> {
  const feedPath = path.join(process.cwd(), 'data', 'feed.xml');
  const externalService = new ExternalService();
  const batchService = new BatchService(externalService);

  console.log(`Processing feed: ${feedPath}`);
  await parseProductFeed(feedPath, batchService);
  console.log('Processing complete!');
}

main().catch((error) => {
  console.error('Error processing feed:', error);
  process.exit(1);
});
