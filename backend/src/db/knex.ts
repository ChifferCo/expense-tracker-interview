import Knex from 'knex';
import config from './knexfile.js';

const db = Knex(config);

export default db;
