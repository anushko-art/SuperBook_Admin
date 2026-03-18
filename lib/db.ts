import { Pool, type PoolClient } from 'pg';

let pool: Pool;

function getPool(): Pool {
  if (!pool) {
    const isLocal =
      !process.env.DATABASE_URL ||
      process.env.DATABASE_URL.includes('localhost') ||
      process.env.DATABASE_URL.includes('127.0.0.1');

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // 10 s — Supabase cold starts need more time
      // Supabase (and most hosted Postgres) requires SSL; local dev does not
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });

    pool.on('error', (err) => {
      console.error('pg pool error:', err);
    });
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const client = getPool();
  const result = await client.query(text, params);
  return result.rows as T[];
}

export async function withClient<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
