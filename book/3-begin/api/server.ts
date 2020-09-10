import * as express from 'express';
import './env';

const server = express();

server.use(express.json());

server.listen(process.env.PORT_API, (err) => {
  if (err) {
    throw err;
  }
  console.log(`> Ready on ${process.env.URL_API}`);
});