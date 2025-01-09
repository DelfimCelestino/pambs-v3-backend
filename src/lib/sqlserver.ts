import * as sql from "mssql";

const sqlConfig = {
  user: "sa",
  password: "Delfim878405131",
  database: "BOA SAUDE",
  server: "FT_L_0014\\SQLEXPRESS",
  options: {
    encrypt: false,
    enableArithAbort: true,
    connectTimeout: 30000, // Aumentar o tempo limite de conexão para 30 segundos
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000,
  },
  requestTimeout: 0,
};

const connectWithRetry = (): Promise<sql.ConnectionPool> => {
  return new sql.ConnectionPool(sqlConfig)
    .connect()
    .then((pool) => {
      console.log("Connected to SQL Server");
      return pool;
    })
    .catch((err: Error) => {
      console.error("Database Connection Failed! Bad Config: ", err);
      console.log("Retrying connection in 1 second...");
      setTimeout(connectWithRetry, 1000);
      throw err;
    });
};

const poolPromise = connectWithRetry();

export default poolPromise;
