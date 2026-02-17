import type { Knex } from 'knex';
import path from 'path';

const baseConfig: Knex.Config = {
  client: 'better-sqlite3',
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    extension: 'ts',
  },
  seeds: {
    directory: path.join(__dirname, 'seeds'),
    extension: 'ts',
  },
};

const config: Knex.Config = {
  ...baseConfig,
  connection: {
    filename:
      process.env.NODE_ENV === 'test'
        ? path.join(__dirname, '../../test.db')
        : path.join(__dirname, '../../data.db'),
  },
};

export default config;
