import { env } from './config/env';

import { createApp } from './app';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`Coordination Service running on port ${env.PORT}`);
});
