import { Request, Response } from "express";
import { db } from "../lib/db";

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const [
      totalClients,
      activeClients,
      activePlans,
      totalPackages,
      openTickets,
    ] = await Promise.all([
      db.client.count(),
      db.client.count({ where: { status: "ACTIVE" } }),
      db.plan.count(),
      db.package.count(),
      db.ticket.count({ where: { status: "OPEN" } }),
    ]);

    // Agrupa clientes por mês usando MySQL
    const startOfYear = new Date();
    startOfYear.setMonth(0, 1);
    startOfYear.setHours(0, 0, 0, 0);

    const rawMonthlyGrowth = await db.$queryRaw`
      SELECT 
        DATE_FORMAT(createdAt, '%Y-%m-01') as month,
        COUNT(*) as total
      FROM client
      WHERE createdAt >= ${startOfYear}
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
      ORDER BY month ASC
    `;

    // Converter BigInt para Number
    const monthlyGrowth = (rawMonthlyGrowth as any[]).map((item) => ({
      month: item.month,
      total: Number(item.total),
    }));

    res.json({
      success: true,
      data: {
        totalClients: Number(totalClients),
        activeClients: Number(activeClients),
        activePlans: Number(activePlans),
        totalPackages: Number(totalPackages),
        openTickets: Number(openTickets),
        monthlyGrowth,
        percentageActive:
          totalClients > 0
            ? ((Number(activeClients) / Number(totalClients)) * 100).toFixed(1)
            : "0",
        percentagePlansActive:
          totalClients > 0
            ? ((Number(activePlans) / Number(totalClients)) * 100).toFixed(1)
            : "0",
        user: {
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar estatísticas do dashboard",
    });
  }
};

export const getActivities = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      db.activity.findMany({
        take: limit,
        skip,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      }),
      db.activity.count(),
    ]);

    res.json({
      success: true,
      data: activities,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar atividades",
    });
  }
};
