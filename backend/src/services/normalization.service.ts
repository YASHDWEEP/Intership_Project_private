import { PricingEngine } from './pricing.engine';

export interface StandardizedTripInput {
  tripDate: Date;
  clientId: string;
  vendorId: string;
  vehicleId?: string;
  vehicleNumber: string;
  vehicleType: string;
  employeeCount: number;
  totalKm: number;
  tripCategory: string;
  billCategory: string;
  waitingTime: number;
  tollAmount: number;
  parkingAmount: number;
  source: string;
  importJobId?: string;
}

export class NormalizationService {
  static suggestMappings(headers: string[]): Record<string, string> {
    const suggestions: Record<string, string> = {};

    const fieldSynonyms: Record<string, string[]> = {
      trip_date: ['date', 'trip_date', 'tripdate', 'date_of_trip', 'duty_date'],
      vehicle_number: ['vehicleregno', 'vehicle_reg_no', 'vehicle_number', 'vehicleno', 'cab_no', 'car_number', 'cab_reg'],
      vehicle_type: ['vehicletype', 'vehicle_type', 'cab_type', 'car_type', 'model'],
      employee_count: ['employeecount', 'emp_count', 'employee_count', 'passengers', 'pax', 'emp_qty'],
      total_km: ['finalkms', 'total_km', 'totalkm', 'distance', 'km', 'trips_km', 'run_km'],
      vendor_name: ['vendor', 'vendor_name', 'transporter', 'agency', 'supplier'],
      trip_category: ['tripcategory', 'trip_category', 'type', 'service_type', 'route_type'],
      bill_category: ['billcategory', 'bill_category', 'shift', 'billing_type'],
      waiting_time: ['waitingtime', 'waiting_time', 'wait_hrs', 'delay_hrs'],
      toll_amount: ['toll', 'tollamount', 'toll_amount', 'toll_charges'],
      parking_amount: ['parking', 'parkingamount', 'parking_amount', 'parking_charges'],
    };

    headers.forEach((header) => {
      const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const [internalField, synonyms] of Object.entries(fieldSynonyms)) {
        if (!suggestions[internalField]) {
          const match = synonyms.some((syn) => cleanHeader.includes(syn));
          if (match) {
            suggestions[internalField] = header;
          }
        }
      }
    });

    return suggestions;
  }

  static async validateAndNormalizeRow(
    rawRow: Record<string, any>,
    mappings: Record<string, string>,
    clientId: string,
    vendors: Array<{ id: string; name: string }>,
    vehicles: Array<{ id: string; vehicleNumber: string; vendorId: string; vehicleType: string }>
  ) {
    const errors: string[] = [];

    // Helper to get mapped value
    const getValue = (internalField: string) => {
      const colName = mappings[internalField];
      return colName && rawRow[colName] !== undefined ? rawRow[colName] : null;
    };

    // 1. Date Validation
    const rawDate = getValue('trip_date');
    let tripDate = new Date();
    if (!rawDate) {
      errors.push('Missing mandatory field: trip_date');
    } else {
      const parsedDate = new Date(rawDate);
      if (isNaN(parsedDate.getTime())) {
        errors.push(`Invalid date format: '${rawDate}'`);
      } else {
        tripDate = parsedDate;
      }
    }

    // 2. Vehicle Number & Type Validation
    const rawVehicleNo = getValue('vehicle_number');
    let vehicleNumber = '';
    if (!rawVehicleNo) {
      errors.push('Missing mandatory field: vehicle_number');
    } else {
      vehicleNumber = String(rawVehicleNo).trim().toUpperCase();
    }

    const matchedVehicle = vehicles.find(
      (v) => v.vehicleNumber.replace(/\s+/g, '') === vehicleNumber.replace(/\s+/g, '')
    );

    const vehicleType = getValue('vehicle_type') || (matchedVehicle ? matchedVehicle.vehicleType : '4 Seater');

    // 3. Vendor Resolution
    const rawVendorName = getValue('vendor_name');
    let vendorId = matchedVehicle ? matchedVehicle.vendorId : '';

    if (!vendorId && rawVendorName) {
      const vendorClean = String(rawVendorName).trim().toLowerCase();
      const matchedVendor = vendors.find((v) => v.name.toLowerCase().includes(vendorClean));
      if (matchedVendor) {
        vendorId = matchedVendor.id;
      }
    }

    if (!vendorId && vendors.length > 0) {
      vendorId = vendors[0].id; // Fallback to first vendor if unspecified
    }

    if (!vendorId) {
      errors.push(`Vendor could not be resolved for vehicle '${vehicleNumber}'`);
    }

    // 4. Total KM Validation
    const rawKm = getValue('total_km');
    let totalKm = 0;
    if (rawKm === null || rawKm === undefined || rawKm === '') {
      errors.push('Missing mandatory field: total_km');
    } else {
      totalKm = parseFloat(String(rawKm));
      if (isNaN(totalKm) || totalKm <= 0) {
        errors.push(`Invalid numeric value for total_km: '${rawKm}'`);
      }
    }

    // 5. Secondary numeric fields
    const employeeCount = Math.max(1, parseInt(String(getValue('employee_count') || 1)));
    const waitingTime = Math.max(0, parseFloat(String(getValue('waiting_time') || 0)));
    const tollAmount = Math.max(0, parseFloat(String(getValue('toll_amount') || 0)));
    const parkingAmount = Math.max(0, parseFloat(String(getValue('parking_amount') || 0)));

    const tripCategory = String(getValue('trip_category') || 'PICKUP').toUpperCase();
    const billCategory = String(getValue('bill_category') || 'REGULAR').toUpperCase();

    // 6. Calculate Pricing via PricingEngine if valid
    let pricingResult = {
      kmSlab: '0-15 KM',
      tripRate: 0,
      tripRevenue: 0,
      vendorCost: 0,
      margin: 0,
      breakdown: '',
    };

    if (errors.length === 0) {
      pricingResult = await PricingEngine.calculateTripPricing({
        clientId,
        vehicleType,
        totalKm,
        vendorId,
        waitingTime,
        tollAmount,
        parkingAmount,
      });
    }

    const normalizedTrip: StandardizedTripInput & {
      kmSlab: string;
      tripRate: number;
      tripRevenue: number;
      vendorCost: number;
    } = {
      tripDate,
      clientId,
      vendorId,
      vehicleId: matchedVehicle ? matchedVehicle.id : undefined,
      vehicleNumber,
      vehicleType,
      employeeCount,
      totalKm,
      tripCategory,
      billCategory,
      waitingTime,
      tollAmount,
      parkingAmount,
      source: 'EXCEL_IMPORT',
      kmSlab: pricingResult.kmSlab,
      tripRate: pricingResult.tripRate,
      tripRevenue: pricingResult.tripRevenue,
      vendorCost: pricingResult.vendorCost,
    };

    return {
      valid: errors.length === 0,
      errors,
      normalizedTrip,
    };
  }
}
