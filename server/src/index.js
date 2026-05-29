import './global/config/load-env.js';
import { createApp } from './app.js';

const port = Number(process.env.API_PORT || 3000);
const app = await createApp();

app.listen(port, '0.0.0.0', () => {
  console.log(`API server listening on http://0.0.0.0:${port}`);
});
