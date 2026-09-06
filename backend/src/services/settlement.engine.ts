import { prisma } from '../config/prisma';
import { EmailService } from './email.service';

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
    // Check if an unapproved/pending CALCULATED settlement already exists for this vendor
    const existingPending = await prisma.settlement.findFirst({
      where: {
        vendorId: params.vendorId,
        status: { in: ['DRAFT', 'CALCULATED'] },
      },
      include: { vendor: true },
      orderBy: { createdAt: 'desc' },
    });

    if (existingPending) {
      throw new Error(
        `An active pending settlement (${existingPending.status}) already exists for vendor '${existingPending.vendor?.name || 'this vendor'}'. Please approve, pay, or delete the existing pending settlement first before calculating a new one.`
      );
    }

    const calc = await this.calculateSettlement(params);

    if (calc.trips.length === 0) {
      throw new Error('No unsettled trips found for this vendor in the specified date range.');
    }

    // Execute in Database Transaction for financial integrity with extended 30s timeout
    return await prisma.$transaction(
      async (tx) => {
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

        // 2. Bulk Create Settlement Items
        if (calc.items.length > 0) {
          await tx.settlementItem.createMany({
            data: calc.items.map((item) => ({
              settlementId: settlement.id,
              tripId: item.tripId,
              slab: item.slab,
              tripAmount: item.tripAmount,
              deduction: item.deduction,
              payableAmount: item.payableAmount,
            })),
          });

          // 3. Bulk Mark trips status as PROCESSED & link settlement
          const tripIds = calc.items.map((item) => item.tripId);
          await tx.trip.updateMany({
            where: { id: { in: tripIds } },
            data: {
              settlementId: settlement.id,
              status: 'PROCESSED',
            },
          });
        }

        // 4. Bulk Create Deductions records
        if (calc.deductionsList.length > 0) {
          await tx.deduction.createMany({
            data: calc.deductionsList.map((d) => ({
              settlementId: settlement.id,
              type: d.type,
              amount: d.amount,
              reason: d.reason,
            })),
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

        // Asynchronously trigger automated settlement PDF email to vendor
        EmailService.sendSettlementEmail(settlement.id, 'CALCULATED').catch((err) => {
          console.error('Failed to send automated settlement calculation email:', err);
        });

        return settlement;
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );
  }

  static async deleteSettlement(id: string, userId?: string) {
    const settlement = await prisma.settlement.findUnique({ where: { id } });
    if (!settlement) {
      throw new Error('Settlement record not found');
    }

    if (settlement.status === 'PAID') {
      throw new Error('Cannot delete a settlement that has already been PAID.');
    }

    return await prisma.$transaction(
      async (tx) => {
        // 1. Reset connected trips back to UNSETTLED (settlementId: null, status: 'VALIDATED')
        await tx.trip.updateMany({
          where: { settlementId: id },
          data: {
            settlementId: null,
            status: 'VALIDATED',
          },
        });

        // 2. Delete settlement items & deductions
        await tx.settlementItem.deleteMany({ where: { settlementId: id } });
        await tx.deduction.deleteMany({ where: { settlementId: id } });

        // 3. Delete settlement header
        await tx.settlement.delete({ where: { id } });

        // 4. Audit Log
        await tx.auditLog.create({
          data: {
            userId: userId || null,
            action: 'DELETE',
            entity: 'Settlement',
            entityId: id,
            oldValue: JSON.stringify(settlement),
          },
        });

        return true;
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );
  }
}
