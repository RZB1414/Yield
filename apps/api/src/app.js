import express from 'express';
import routes from './routes/index.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { corsOptions } from './config/cors.js';

const app = express();
const MAX_REQUEST_BODY_BYTES = 10 * 1024 * 1024; // 10MB

function parseUrlEncodedBody(value) {
  const params = new URLSearchParams(value);
  const parsed = {};

  for (const [key, paramValue] of params.entries()) {
    if (Object.prototype.hasOwnProperty.call(parsed, key)) {
      const currentValue = parsed[key];
      parsed[key] = Array.isArray(currentValue)
        ? [...currentValue, paramValue]
        : [currentValue, paramValue];
      continue;
    }

    parsed[key] = paramValue;
  }

  return parsed;
}

function requestBodyParser(req, res, next) {
  if (req.body !== undefined) {
    next();
    return;
  }

  const method = req.method?.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    req.body = {};
    next();
    return;
  }

  const contentTypeHeader = req.headers['content-type'] ?? '';
  const contentType = contentTypeHeader.split(';')[0].trim().toLowerCase();
  const shouldParseJson = contentType === 'application/json';
  const shouldParseForm = contentType === 'application/x-www-form-urlencoded';

  if (!shouldParseJson && !shouldParseForm) {
    req.body = {};
    next();
    return;
  }

  let completed = false;
  let totalBytes = 0;
  const chunks = [];

  const abort = (statusCode, payload) => {
    if (completed) {
      return;
    }

    completed = true;
    req.removeListener('data', onData);
    req.removeListener('end', onEnd);
    req.removeListener('error', onError);

    if (!res.headersSent) {
      res.status(statusCode).json(payload);
    }
  };

  const onError = (error) => {
    if (completed) {
      return;
    }

    completed = true;
    req.removeListener('data', onData);
    req.removeListener('end', onEnd);
    req.removeListener('error', onError);
    next(error);
  };

  const onData = (chunk) => {
    if (completed) {
      return;
    }

    const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += bufferChunk.length;

    if (totalBytes > MAX_REQUEST_BODY_BYTES) {
      abort(413, { error: 'Request body is too large.' });
      if (typeof req.destroy === 'function') {
        req.destroy();
      }
      return;
    }

    chunks.push(bufferChunk);
  };

  const onEnd = () => {
    if (completed) {
      return;
    }

    completed = true;
    req.removeListener('data', onData);
    req.removeListener('end', onEnd);
    req.removeListener('error', onError);

    const rawBody = Buffer.concat(chunks).toString('utf8');

    if (!rawBody) {
      req.body = {};
      next();
      return;
    }

    try {
      req.body = shouldParseJson ? JSON.parse(rawBody) : parseUrlEncodedBody(rawBody);
      next();
    } catch {
      if (!res.headersSent) {
        res.status(400).json({ error: 'Invalid request body.' });
      }
    }
  };

  req.on('data', onData);
  req.on('end', onEnd);
  req.on('error', onError);
}

// Middleware para garantir conexão com o banco em cada request (serverless friendly)
app.use(cors(corsOptions));

// Opcional: responder manualmente a OPTIONS para garantir CORS em serverless
app.options('/{*any}', cors(corsOptions));

// Middleware para parsing de JSON e URL-encoded
app.use(requestBodyParser);
// Middleware para parsing de cookies
app.use(cookieParser());

// Middleware para timeout de requisição
app.use((req, res, next) => {
  req.setTimeout(20000, () => {
    if (!res.headersSent) {
      res.status(504).send('app.js error: Request has timed out.');
    }
  });
  next();
});

// Rotas
routes(app);

// Middleware para capturar erros de CORS
app.use((err, req, res, next) => {
  if (err instanceof Error && err.message === 'Not allowed by CORS') {
    if (!res.headersSent) {
      res.status(403).json({ error: 'CORS error: Origin not allowed' });
    }
  } else {
    next(err);
  }
});

// Middleware de fallback para erros não tratados
app.use((err, req, res, next) => {
  console.error("Erro não tratado:", err);
  if (!res.headersSent) {
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

export default app;