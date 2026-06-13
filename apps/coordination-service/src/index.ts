import { createApp } from './app';

const PORT = process.env.PORT ?? 4002;

const app = createApp();

app.listen(PORT, () => {
  console.log(`Coordination Service running on port ${PORT}`);
});
