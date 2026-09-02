// config.ts reads the environment at import time and throws when a required
// variable is missing, so the defaults have to exist before any test module is
// evaluated. Values are fake: no test ever opens a socket to this database.
process.env.NODE_ENV ??= 'test'
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/boasvindas_test'
process.env.AUTH_SECRET ??= 'test-secret-not-used-in-any-real-environment'
