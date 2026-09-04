import { Response } from 'express';
import { prisma } from '../config/prisma';

export class AnalyticsController {
  static async getDashboard(req: any, res: Response) {
    try {
      const { range = 'THIS_MONTH', startDate, endDate } = req.query;

      // Determine date range filter
      let dateFilter: any = {};
      const now = new Date();

      if (startDate && endDate) {
        dateFilter = { gte: new Date(startDate), lte: new Date(endDate) };
      } else if (range === 'TODAY') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateFilter = { gte: startOfDay };
      } else if (range === 'THIS_WEEK') {
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        dateFilter = { gte: startOfWeek };
      } else if (range === 'LAST_MONTH') {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        dateFilter = { gte: startOfLastMonth, lte: endOfLastMonth };
      } else if (range === 'ALL') {
        dateFilter = {};
      } else {
        // THIS_MONTH default
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { gte: startOfMonth };
      }

      // Role restriction
      let tripWhere: any = {};
      if (dateFilter.gte || dateFilter.lte) tripWhere.tripDate = dateFilter;

      if (req.user?.role === 'CLIENT' && req.user.clientId) {
        tripWhere.clientId = req.user.clientId;
      } else if (req.user?.role === 'VENDOR' && req.user.vendorId) {
        tripWhere.vendorId = req.user.vendorId;
      }

      // 1. KPI Aggregations
      const tripAggregates = await prisma.trip.aggregate({
        where: tripWhere,
        _count: { id: true },
        _sum: {
          totalKm: true,
          tripRevenue: true,
          vendorCost: true,
        },
      });

      const totalTrips = tripAggregates._count.id || 0;
      const totalKm = Math.round((tripAggregates._sum.totalKm || 0) * 10) / 10;
      const totalRevenue = Math.round(tripAggregates._sum.tripRevenue || 0);
      const vendorCost = Math.round(tripAggregates._sum.vendorCost || 0);
      const grossMargin = totalRevenue - vendorCost;
      const marginPercentage = totalRevenue > 0 ? Math.round((grossMargin / totalRevenue) * 1000) / 10 : 0;

      // Pending Settlements & Invoices & Import Errors count & Real-time Payment Metrics
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        pendingSettlements,
        pendingInvoicesCount,
        paidInvoicesCount,
        failedPaymentsCount,
        importErrorsCount,
        todayPaymentsAgg,
        monthPaymentsAgg,
        successfulPayments,
      ] = await Promise.all([
        prisma.settlement.count({ where: { status: { in: ['DRAFT', 'CALCULATED'] } } }),
        prisma.invoice.count({ where: { status: { in: ['DRAFT', 'GENERATED', 'SENT', 'PENDING'] } } }),
        prisma.invoice.count({ where: { status: 'PAID' } }),
        prisma.payment.count({ where: { status: 'FAILED' } }),
        prisma.importError.count(),
        prisma.payment.aggregate({
          where: {
            status: { in: ['CAPTURED', 'SUCCESS'] },
            createdAt: { gte: startOfToday },
          },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: {
            status: { in: ['CAPTURED', 'SUCCESS'] },
            createdAt: { gte: startOfCurrentMonth },
          },
          _sum: { amount: true },
        }),
        prisma.payment.findMany({
          where: {
            status: { in: ['CAPTURED', 'SUCCESS'] },
          },
          orderBy: { createdAt: 'asc' },
          select: { amount: true, createdAt: true, method: true },
        }),
      ]);

      const todayPayments = Math.round(todayPaymentsAgg._sum.amount || 0);
      const monthPayments = Math.round(monthPaymentsAgg._sum.amount || 0);

      // Payment Collection Trend (Grouped by Month/Day)
      const collectionMap: Record<string, { date: string; amount: number; count: number }> = {};
      successfulPayments.forEach((p) => {
        const key = new Date(p.createdAt).toLocaleString('en-US', { month: 'short', year: '2-digit' });
        if (!collectionMap[key]) {
          collectionMap[key] = { date: key, amount: 0, count: 0 };
        }
        collectionMap[key].amount += p.amount;
        collectionMap[key].count += 1;
      });

      const paymentCollectionTrend = Object.values(collectionMap);

      // 2. Revenue vs Vendor Cost Trend (Grouped by Month/Day)
      const recentTrips = await prisma.trip.findMany({
        where: tripWhere,
        orderBy: { tripDate: 'asc' },
        select: { tripDate: true, tripRevenue: true, vendorCost: true, vehicleType: true },
      });

      const trendMap: Record<string, { month: string; revenue: number; cost: number; margin: number; trips: number }> = {};

      recentTrips.forEach((t) => {
        const monthKey = new Date(t.tripDate).toLocaleString('en-US', { month: 'short', year: '2-digit' });
        if (!trendMap[monthKey]) {
          trendMap[monthKey] = { month: monthKey, revenue: 0, cost: 0, margin: 0, trips: 0 };
        }
        trendMap[monthKey].revenue += t.tripRevenue;
        trendMap[monthKey].cost += t.vendorCost;
        trendMap[monthKey].margin += t.tripRevenue - t.vendorCost;
        trendMap[monthKey].trips += 1;
      });

      const revenueTrend = Object.values(trendMap);

      // 3. Client-wise Revenue Breakdown
      const clientTrips = await prisma.trip.groupBy({
        by: ['clientId'],
        where: tripWhere,
        _sum: { tripRevenue: true, totalKm: true },
        _count: { id: true },
      });

      const clients = await prisma.client.findMany();
      const clientRevenue = clientTrips.map((ct) => {
        const clientObj = clients.find((c) => c.id === ct.clientId);
        return {
          name: clientObj ? clientObj.name : 'Unknown Client',
          revenue: ct._sum.tripRevenue || 0,
          trips: ct._count.id,
          totalKm: ct._sum.totalKm || 0,
        };
      });

      // 4. Vendor Performance Breakdown
      const vendorTrips = await prisma.trip.groupBy({
        by: ['vendorId'],
        where: tripWhere,
        _sum: { vendorCost: true },
        _count: { id: true },
      });

      const vendors = await prisma.vendor.findMany();
      const vendorPerformance = vendorTrips.map((vt) => {
        const vendorObj = vendors.find((v) => v.id === vt.vendorId);
        return {
          name: vendorObj ? vendorObj.name : 'Unknown Vendor',
          earnings: vt._sum.vendorCost || 0,
          trips: vt._count.id,
        };
      });

      // 5. Trip Status Distribution
      const statusCounts = await prisma.trip.groupBy({
        by: ['status'],
        where: tripWhere,
        _count: { id: true },
      });

      const tripStatusDistribution = statusCounts.map((s) => ({
        status: s.status,
        count: s._count.id,
      }));

      // 6. Vehicle Type Distribution
      const vehicleTypeCounts = await prisma.trip.groupBy({
        by: ['vehicleType'],
        where: tripWhere,
        _count: { id: true },
        _sum: { tripRevenue: true },
      });

      const vehicleTypeDistribution = vehicleTypeCounts.map((v) => ({
        vehicleType: v.vehicleType,
        trips: v._count.id,
        revenue: v._sum.tripRevenue || 0,
      }));

      return res.json({
        kpis: {
          totalTrips,
          totalKm,
          totalRevenue,
          vendorCost,
          grossMargin,
          marginPercentage,
          pendingSettlements,
          pendingInvoices: pendingInvoicesCount,
          paidInvoices: paidInvoicesCount,
          failedPayments: failedPaymentsCount,
          todayPayments,
          monthPayments,
          importErrorsCount,
        },
        charts: {
          revenueTrend,
          clientRevenue,
          vendorPerformance,
          tripStatusDistribution,
          vehicleTypeDistribution,
          paymentCollectionTrend,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
