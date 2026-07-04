import { createServer } from 'node:http';
import { createApp } from './app';

import { env } from './config/env';
import { initSocket } from './socket';

const app = createApp();
const server = createServer(app);

initSocket(server);

server.listen(env.PORT, () => {
  console.log(`Gateway running on port ${env.PORT}`);
});
