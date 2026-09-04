import { prisma } from '../config/prisma';

export interface PricingCalculationResult {
  kmSlab: string;
  tripRate: number;
  tripRevenue: number;
  vendorCost: number;
  margin: number;
  pricingRuleId?: string;
  breakdown: string;
}

export class PricingEngine {
  static async calculateTripPricing(params: {
    clientId: string;
    vehicleType: string;
    totalKm: number;
    vendorId?: string;
    waitingTime?: number;
    tollAmount?: number;
    parkingAmount?: number;
  }): Promise<PricingCalculationResult> {
    const { clientId, vehicleType, totalKm, vendorId, waitingTime = 0, tollAmount = 0, parkingAmount = 0 } = params;

    // 1. Fetch active pricing rule for client + vehicleType
    const pricingRule = await prisma.pricingRule.findFirst({
      where: {
        clientId,
        vehicleType,
        active: true,
      },
      include: {
        slabs: true,
      },
    });

    let kmSlab = '0-15 KM';
    let tripRate = 500;
    let vendorCostRate = 400;
    let pricingRuleId: string | undefined;
    let pricingType = 'KM_SLAB';

    if (pricingRule && pricingRule.slabs.length > 0) {
      pricingRuleId = pricingRule.id;
      pricingType = pricingRule.pricingType;

      // Find matching slab
      const matchedSlab = pricingRule.slabs.find(
        (slab) => totalKm >= slab.minKm && totalKm <= slab.maxKm
      );

      if (matchedSlab) {
        kmSlab = `${matchedSlab.minKm}-${matchedSlab.maxKm} KM`;
        tripRate = matchedSlab.rate;
        vendorCostRate = matchedSlab.vendorRate > 0 ? matchedSlab.vendorRate : Math.round(matchedSlab.rate * 0.8);
      } else {
        // Fallback to highest slab or proportional calculation
        const sortedSlabs = [...pricingRule.slabs].sort((a, b) => b.maxKm - a.maxKm);
        const highestSlab = sortedSlabs[0];
        kmSlab = `>${highestSlab.minKm} KM (Extended)`;
        tripRate = highestSlab.rate + (totalKm - highestSlab.minKm) * 15;
        vendorCostRate = Math.round(tripRate * 0.8);
      }
    } else {
      // System Default Fallback Slabs if client has no specific rule configured
      if (totalKm <= 15) {
        kmSlab = '0-15 KM';
        tripRate = vehicleType === 'EV' ? 550 : vehicleType === '6 Seater' ? 700 : 500;
        vendorCostRate = Math.round(tripRate * 0.8);
      } else if (totalKm <= 25) {
        kmSlab = '16-25 KM';
        tripRate = vehicleType === 'EV' ? 750 : vehicleType === '6 Seater' ? 950 : 700;
        vendorCostRate = Math.round(tripRate * 0.8);
      } else if (totalKm <= 40) {
        kmSlab = '26-40 KM';
        tripRate = vehicleType === 'EV' ? 950 : vehicleType === '6 Seater' ? 1200 : 900;
        vendorCostRate = Math.round(tripRate * 0.8);
      } else {
        kmSlab = '40+ KM';
        const extraKm = totalKm - 40;
        const baseRate = vehicleType === '6 Seater' ? 1200 : 900;
        tripRate = baseRate + extraKm * 18;
        vendorCostRate = Math.round(tripRate * 0.8);
      }
    }

    let tripRevenue = tripRate;
    let vendorCost = vendorCostRate;

    if (pricingType === 'PER_KM') {
      tripRevenue = totalKm * tripRate;
      vendorCost = totalKm * vendorCostRate;
    }

    // Add extra charges to revenue and cost
    const waitingCharge = waitingTime * 100; // Rs 100 / hr
    tripRevenue += waitingCharge + tollAmount + parkingAmount;
    vendorCost += waitingCharge + tollAmount + parkingAmount;

    const margin = tripRevenue - vendorCost;

    const breakdown = `Slab: ${kmSlab} | Rate: ₹${tripRate} | Base Rev: ₹${tripRevenue} | Vendor Cost: ₹${vendorCost} | Margin: ₹${margin} (Toll: ₹${tollAmount}, Waiting: ₹${waitingCharge})`;

    return {
      kmSlab,
      tripRate,
      tripRevenue,
      vendorCost,
      margin,
      pricingRuleId,
      breakdown,
    };
  }
}
