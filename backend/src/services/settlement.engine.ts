import { prisma } from '../config/prisma';

export interface SettlementCalculationParams {
  vendorId: string;
  startDate: Date;
  endDate: Date;
  deductionsList?: Array<{ type: string; amount: number; reason: string }>;
}

export class SettlementEngine {
  static async calculateSettlement(params: SettlementCalculationParams) {
    const { vendorId, startDate, endDate, deductionsList = [] } = params;

    // Fetch vendor and all processed/validated trips for the vendor in period that are NOT yet settled
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new Error(`Vendor with ID ${vendorId} not found`);
    }

    const trips = await prisma.trip.findMany({
      where: {
        vendorId,
        tripDate: {
          gte: startDate,
          lte: endDate,
        },
        settlementId: null, // Unsettled trips
      },
    });

    let grossAmount = 0;
    const items: Array<{
      tripId: string;
      slab: string;
      tripAmount: number;
      deduction: number;
      payableAmount: number;
    }> = [];

    // Calculate gross trip earnings for vendor
    trips.forEach((trip) => {
      const tripAmount = trip.vendorCost;
      grossAmount += tripAmount;

      items.push({
        tripId: trip.id,
        slab: `${trip.vehicleType} (${trip.kmSlab})`,
        tripAmount,
        deduction: 0,
        payableAmount: tripAmount,
      });
    });

    // Calculate deductions
    let totalDeductions = 0;
    deductionsList.forEach((d) => {
      totalDeductions += d.amount;
    });

    // Optional platform commission check
    if (vendor.commissionType === 'PERCENTAGE' && vendor.commissionValue > 0) {
      const commissionFee = (grossAmount * vendor.commissionValue) / 100;
      totalDeductions += commissionFee;
      deductionsList.push({
        type: 'SERVICE_CHARGE',
        amount: commissionFee,
        reason: `Platform Commission (${vendor.commissionValue}%)`,
      });
    }

    const netPayable = Math.max(0, grossAmount - totalDeductions);

    return {
      vendor,
      totalTrips: trips.length,
      grossAmount,
      totalDeductions,
      netPayable,
      trips,
      items,
      deductionsList,
    };
  }

  static async generateAndSaveSettlement(params: SettlementCalculationParams, userId?: string) {
    const calc = await this.calculateSettlement(params);

    if (calc.trips.length === 0) {
      throw new Error('No unsettled trips found for this vendor in the specified date range.');
    }

    // Execute in Database Transaction for financial integrity
    return await prisma.$transaction(async (tx) => {
      // 1. Create Settlement Header
      const settlement = await tx.settlement.create({
        data: {
          vendorId: params.vendorId,
          settlementPeriodStart: params.startDate,
          settlementPeriodEnd: params.endDate,
          totalTrips: calc.totalTrips,
          grossAmount: calc.grossAmount,
          deductions: calc.totalDeductions,
          netPayable: calc.netPayable,
          status: 'CALCULATED',
        },
      });

      // 2. Create Settlement Items
      for (const item of calc.items) {
        await tx.settlementItem.create({
          data: {
            settlementId: settlement.id,
            tripId: item.tripId,
            slab: item.slab,
            tripAmount: item.tripAmount,
            deduction: item.deduction,
            payableAmount: item.payableAmount,
          },
        });

        // 3. Mark trip status as PROCESSED / SETTLED link
        await tx.trip.update({
          where: { id: item.tripId },
          data: {
            settlementId: settlement.id,
            status: 'PROCESSED',
          },
        });
      }

      // 4. Create Deductions records
      for (const d of calc.deductionsList) {
        await tx.deduction.create({
          data: {
            settlementId: settlement.id,
            type: d.type,
            amount: d.amount,
            reason: d.reason,
          },
        });
      }

      // 5. Audit Log
      await tx.auditLog.create({
        data: {
          userId: userId || null,
          action: 'GENERATE_SETTLEMENT',
          entity: 'Settlement',
          entityId: settlement.id,
          newValue: JSON.stringify({
            vendorId: params.vendorId,
            netPayable: calc.netPayable,
            tripsCount: calc.totalTrips,
          }),
        },
      });

      return settlement;
    });
  }
}
