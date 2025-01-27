import { db } from "../lib/db";
import poolPromise from "../lib/sqlserver";
import bcrypt from "bcrypt";

interface Movement {
  numdoc: string;
  tipodoc: string;
  clientId: string;
  cliente: string;
  entidate: string;
  desconto: string;
  datadoc: string;
  balance: number;
}

interface SqlRow {
  numdoc: any;
  tipodoc: string;
  cliente: string;
  entidade: string;
  desconto: string | null;
  datadoc: Date;
  base1: any;
  iva1: any;
}

export const syncClients = async () => {
  const pool = await poolPromise;

  try {
    const batchSize = 1000;
    let offset = 0;
    const query = `
    SELECT 
      RTRIM(t.codigo) AS codigo,
      RTRIM(t.nome) AS nome,
      RTRIM(t.telemovel) AS telemovel,
      RTRIM(t.morada1) AS morada1,
      RTRIM(t.morada2) AS morada2,
      CAST(COALESCE(SUM(p.valorpendente), 0) AS DECIMAL(18,2)) as saldo
    FROM [dbo].[wgcterceiros] t
    LEFT JOIN [dbo].[wgcpendentes] p ON p.entidade = t.codigo
    WHERE t.PAMBS = 1
    GROUP BY t.codigo, t.nome, t.telemovel, t.morada1, t.morada2
    ORDER BY t.nome
    OFFSET ${offset} ROWS 
    FETCH NEXT ${batchSize} ROWS ONLY
  `;
    const result = await pool.request().query(query);

    const data = result.recordset.map((row) => ({
      code: row.codigo.trim(),
      name: row.nome.trim(),
      phone: row.telemovel?.trim() || null,
      address1: row.morada1?.trim() || null,
      address2: row.morada2?.trim() || null,
      status: "ACTIVE" as const,
      balance: -(row.saldo || 0), // Adding negative sign to invert the value
      familyHeadId: null,
    }));

    const existingClients = await db.client.findMany({
      where: {
        code: { in: data.map((client) => client.code) },
      },
    });

    const clientsToCreate = data.filter(
      (client) =>
        !existingClients.some((existing) => existing.code === client.code)
    );

    const clientsToUpdate = data.filter((client) =>
      existingClients.some((existing) => existing.code === client.code)
    );

    if (clientsToCreate.length === 0 && clientsToUpdate.length === 0) {
      console.log("No clients to sync.");
      return;
    }

    const clientPassword = await bcrypt.hash("12345678", 10);

    // Create clients one by one to handle errors better
    for (const client of clientsToCreate) {
      try {
        const newClient = await db.client.create({
          data: {
            ...client,
            password: clientPassword,
          },
        });

        // Buscar e criar movimentos para o novo cliente
        await syncClientMovements(newClient, pool);
      } catch (error) {
        console.error(`Failed to create client ${client.code}:`, error);
      }
    }

    // Update existing clients
    for (const client of data) {
      try {
        const existingClient = existingClients.find(
          (existing) => existing.code === client.code
        );

        await db.client.update({
          where: { code: client.code },
          data: {
            name: client.name,
            phone: client.phone,
            address1: client.address1,
            address2: client.address2,
            balance: client.balance,
          },
        });

        // Sincronizar movimentos para cliente existente
        await syncClientMovements(existingClient, pool);
      } catch (error) {
        console.error(`Failed to update client ${client.code}:`, error);
      }
    }
  } catch (error) {
    console.error("Error syncing clients:", error);
  }
};
async function syncClientMovements(client: any, pool: any) {
  try {
    // First get canceled movements
    const canceledQuery = `SELECT numdoc, tipodoc, entidade FROM [dbo].[wgcdoccab] WHERE cliente='${client.code}' AND anulado=1`;
    const canceledResult = await pool.request().query(canceledQuery);

    // If there are canceled movements, remove them from Prisma
    if (canceledResult.recordset.length > 0) {
      const canceledConditions = canceledResult.recordset.map((row: any) => ({
        AND: [
          { numdoc: String(row.numdoc).trim() },
          { tipodoc: row.tipodoc.trim() },
          { entidate: row.entidade.trim() },
          { clientId: client.id },
        ],
      }));

      // Delete canceled movements from Prisma
      await db.movement.deleteMany({
        where: {
          OR: canceledConditions,
        },
      });
    }

    // Get active movements
    const query = `SELECT * FROM [dbo].[wgcdoccab] WHERE cliente='${client.code}' AND anulado=0`;
    const result = await pool.request().query(query);

    const movementsData = result.recordset
      .map(
        (row: SqlRow): Movement => ({
          numdoc: String(row.numdoc).trim(),
          tipodoc: row.tipodoc.trim(),
          clientId: client.id,
          cliente: row.cliente.trim(),
          entidate: row.entidade.trim(),
          desconto: row.desconto?.trim() || "0",
          datadoc: new Date(row.datadoc).toISOString(),
          balance: parseFloat(row.base1 || 0) + parseFloat(row.iva1 || 0),
        })
      )
      .filter((movement: Movement) => movement.clientId !== "");

    if (movementsData.length > 0) {
      // Check for existing non-canceled movements
      const existingMovements = await db.movement.findMany({
        where: {
          AND: [
            { clientId: client.id },
            {
              OR: movementsData.map((m: Movement) => ({
                AND: [
                  { numdoc: m.numdoc },
                  { tipodoc: m.tipodoc },
                  { entidate: m.entidate },
                ],
              })),
            },
          ],
        },
      });

      // Filter out existing movements
      const newMovements = movementsData.filter(
        (movement: Movement) =>
          !existingMovements.some(
            (existing) =>
              existing.numdoc === movement.numdoc &&
              existing.tipodoc === movement.tipodoc &&
              existing.entidate === movement.entidate
          )
      );

      // Create new movements
      if (newMovements.length > 0) {
        await db.movement.createMany({
          data: newMovements,
        });
      }
    }
  } catch (error) {
    console.error(`Error syncing movements for client ${client.code}:`, error);
    throw error;
  }
}
