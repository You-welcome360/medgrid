import { env } from './config/env';
import { createApp } from './app';
import { initExpiryCron } from './modules/inventory/expiry.cron';

const app = createApp();

initExpiryCron();

app.listen(env.PORT, () => {
  console.log(`Facility Service running on port ${env.PORT}`);
});
