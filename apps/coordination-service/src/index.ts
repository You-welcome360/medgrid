import { env } from './config/env';
import { createApp } from './app';
import { startExpiryWorker } from './workers/expiry.worker';

const app = createApp();

startExpiryWorker();

app.listen(env.PORT, () => {
  console.log(`Coordination Service running on port ${env.PORT}`);
});
