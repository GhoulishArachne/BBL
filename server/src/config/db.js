const { Sequelize } = require('sequelize');

const {
  DB_HOST = 'localhost',
  DB_PORT = '5432',
  DB_NAME = 'bbl',
  DB_USER = 'postgres',
  DB_PASSWORD = process.env.DB_PASSWORD ?? process.env.PASSWORD ?? '',
  DB_URL,
  NODE_ENV = 'development',
} = process.env;

const logging = NODE_ENV === 'development' ? console.log : false;

const shouldUseSslFromUrl = (url) => {
  const u = String(url);
  return (
    u.toLowerCase().includes('sslmode=require') ||
    u.toLowerCase().includes('sslmode=required') ||
    u.toLowerCase().includes('ssl=true') ||
    u.toLowerCase().includes('sslmode=disable')
  );
};

let sequelize;
if (DB_URL) {
  const url = String(DB_URL);
  sequelize = new Sequelize(url, {
    dialect: 'postgres',
    logging,
    ...(shouldUseSslFromUrl(url)
      ? {
          dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          },
        }
      : {}),
  });
} else {
  sequelize = new Sequelize(DB_NAME, DB_USER, String(DB_PASSWORD ?? ''), {
    host: DB_HOST,
    port: Number(DB_PORT),
    dialect: 'postgres',
    logging,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });
}

module.exports = { sequelize };


