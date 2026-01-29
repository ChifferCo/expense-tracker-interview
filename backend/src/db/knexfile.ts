import type { Knex } from 'knex';
import path from 'path';

const config: Knex.Config = {
  client: 'better-sqlite3',
  connection: {
    filename: path.join(__dirname, '../../data.db'),
  },
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

export default config;
