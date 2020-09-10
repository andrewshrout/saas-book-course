import * as express from 'express';
import './env';

const server = express();

server.use(express.json());

server.get('*', (_, res) => {
  res.sendStatus(403);
});

server.get('/api/v1/public/get-user', (_, res) => {
  console.log('API server got request from APP server');
  res.json({ user: { email: 'team@builderbook.org' } });
});

server.listen(process.env.PORT_API, (err) => {
  if (err) {
    throw err;
  }
  console.log(`> Ready on ${process.env.URL_API}`);
});