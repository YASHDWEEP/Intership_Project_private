import { Response } from 'express';
import Papa from 'papaparse';
import { prisma } from '../config/prisma';

export class ReportsController {
  static async getTripReport(req: any, res: Response) {
    try {
      const { format, clientId, vendorId, startDate, endDate } = req.query;

      const where: any = {};
      if (clientId) where.clientId = clientId;
      if (vendorId) where.vendorId = vendorId;
      if (startDate || endDate) {
        where.tripDate = {};
        if (startDate) where.tripDate.gte = new Date(startDate);
        if (endDate) where.tripDate.lte = new Date(endDate);
      }

      const trips = await prisma.trip.findMany({
        where,
        include: {
          client: { select: { name: true } },
          vendor: { select: { name: true } },
        },
        orderBy: { tripDate: 'desc' },
      });

      if (format === 'csv') {
        const csvData = trips.map((t) => ({
          'Trip Date': new Date(t.tripDate).toLocaleDateString('en-IN'),
          'Client': t.client.name,
          'Vendor': t.vendor.name,
          'Vehicle Number': t.vehicleNumber,
          'Vehicle Type': t.vehicleType,
          'Total KM': t.totalKm,
          'KM Slab': t.kmSlab,
          'Trip Rate (INR)': t.tripRate,
          'Trip Revenue (INR)': t.tripRevenue,
          'Vendor Cost (INR)': t.vendorCost,
          'Margin (INR)': t.tripRevenue - t.vendorCost,
          'Status': t.status,
        }));

        const csvString = Papa.unparse(csvData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="Trips_Report.csv"');
        return res.send(csvString);
      }

      return res.json(trips);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getProfitLossReport(req: any, res: Response) {
    try {
      const { format, startDate, endDate } = req.query;

      const where: any = {};
      if (startDate || endDate) {
        where.tripDate = {};
        if (startDate) where.tripDate.gte = new Date(startDate);
        if (endDate) where.tripDate.lte = new Date(endDate);
      }

      const trips = await prisma.trip.findMany({
        where,
        include: {
          client: { select: { name: true } },
          vendor: { select: { name: true } },
        },
      });

      // Group P&L by Client
      const pnlByClient: Record<string, { clientName: string; totalTrips: number; grossRevenue: number; totalVendorCost: number; netProfit: number; marginPct: number }> = {};

      trips.forEach((t) => {
        const clientName = t.client.name;
        if (!pnlByClient[clientName]) {
          pnlByClient[clientName] = { clientName, totalTrips: 0, grossRevenue: 0, totalVendorCost: 0, netProfit: 0, marginPct: 0 };
        }
        pnlByClient[clientName].totalTrips += 1;
        pnlByClient[clientName].grossRevenue += t.tripRevenue;
        pnlByClient[clientName].totalVendorCost += t.vendorCost;
      });

      const reportRows = Object.values(pnlByClient).map((row) => {
        const netProfit = row.grossRevenue - row.totalVendorCost;
        const marginPct = row.grossRevenue > 0 ? Math.round((netProfit / row.grossRevenue) * 1000) / 10 : 0;
        return {
          ...row,
          netProfit,
          marginPct,
        };
      });

      if (format === 'csv') {
        const csvString = Papa.unparse(reportRows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="Profit_Loss_Report.csv"');
        return res.send(csvString);
      }

      return res.json(reportRows);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
