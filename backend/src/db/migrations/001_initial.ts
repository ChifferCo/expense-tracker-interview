import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('email').notNullable().unique();
    table.string('passwordHash').notNullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('categories', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('icon').notNullable();
  });

  await knex.schema.createTable('expenses', (table) => {
    table.increments('id').primary();
    table.integer('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('categoryId').notNullable().references('id').inTable('categories');
    table.decimal('amount', 10, 2).notNullable();
    table.string('description').notNullable();
    table.date('date').notNullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('expenses');
  await knex.schema.dropTableIfExists('categories');
  await knex.schema.dropTableIfExists('users');
}
