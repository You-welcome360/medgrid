import { createApp } from './app';

const PORT = process.env.PORT ?? 4001;

const app = createApp();

app.listen(PORT, () => {
  console.log(`Facility Service running on port ${PORT}`);
});
