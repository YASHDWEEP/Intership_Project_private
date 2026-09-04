import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const outputDir = path.resolve(__dirname, '../../../dummy_excel_sheets');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Vehicle pool from seed data
const vehicleRegs = [
  'KA-01-MJ-1000',
  'KA-02-MJ-1042',
  'KA-03-MJ-1084',
  'KA-04-MJ-1126',
  'KA-05-MJ-1168',
  'KA-01-MJ-1210',
  'KA-02-MJ-1252',
  'KA-03-MJ-1294',
  'KA-04-MJ-1336',
  'KA-05-MJ-1378',
];

const vehicleTypes = ['4 Seater', '6 Seater', 'EV', 'Sedan', 'SUV'];
const vendorNames = [
  'Ramesh Transport Solutions',
  'Sri Ganesh Fleet Services',
  'Venkateshwara Cabs',
  'Blue Sky Cabs',
  'Om Sai Logistics',
];

const companies = [
  {
    fileName: '01_TCS_Cab_Duty_Log',
    company: 'Tata Consultancy Services',
    headers: {
      date: 'Date of Trip',
      vehicleNo: 'Cab Reg No',
      vehicleType: 'Vehicle Type',
      passengers: 'Passengers',
      km: 'Distance (KM)',
      vendor: 'Transporter',
      tripCat: 'Trip Type',
      billCat: 'Shift',
      toll: 'Toll Charges',
      parking: 'Parking Charges',
    },
  },
  {
    fileName: '02_Infosys_Transport_Data',
    company: 'Infosys Limited',
    headers: {
      date: 'Duty Date',
      vehicleNo: 'Vehicle Number',
      vehicleType: 'Cab Type',
      passengers: 'Pax Count',
      km: 'Total KM',
      vendor: 'Vendor Name',
      tripCat: 'Service Type',
      billCat: 'Billing Type',
      toll: 'Toll Amount',
      parking: 'Parking Charges',
    },
  },
  {
    fileName: '03_Wipro_Cab_Operations',
    company: 'Wipro Enterprise',
    headers: {
      date: 'Trip Date',
      vehicleNo: 'Car Number',
      vehicleType: 'Model',
      passengers: 'Emp Qty',
      km: 'KM Run',
      vendor: 'Agency',
      tripCat: 'Route Type',
      billCat: 'Shift Type',
      toll: 'Toll',
      parking: 'Parking',
    },
  },
  {
    fileName: '04_TechMahindra_Fleet_Log',
    company: 'Tech Mahindra',
    headers: {
      date: 'Date',
      vehicleNo: 'Vehicle No',
      vehicleType: 'Vehicle Type',
      passengers: 'Emp Count',
      km: 'Total KM',
      vendor: 'Vendor Name',
      tripCat: 'Service Type',
      billCat: 'Shift',
      toll: 'Toll Amount',
      parking: 'Parking Amount',
    },
  },
  {
    fileName: '05_Accenture_Commute_Sheet',
    company: 'Accenture India',
    headers: {
      date: 'Date of Trip',
      vehicleNo: 'Vehicle Reg No',
      vehicleType: 'Vehicle Type',
      passengers: 'Passenger Count',
      km: 'Final KMs',
      vendor: 'Supplier Name',
      tripCat: 'Category',
      billCat: 'Billing Category',
      toll: 'Toll Charges',
      parking: 'Parking',
    },
  },
  {
    fileName: '06_Cognizant_Trip_Tracker',
    company: 'Cognizant Technology Solutions',
    headers: {
      date: 'Duty Date',
      vehicleNo: 'Cab Reg',
      vehicleType: 'Cab Type',
      passengers: 'Passengers',
      km: 'KM',
      vendor: 'Transporter Name',
      tripCat: 'Trip Type',
      billCat: 'Billing Type',
      toll: 'Toll',
      parking: 'Parking',
    },
  },
  {
    fileName: '07_Deloitte_Travel_Log',
    company: 'Deloitte India',
    headers: {
      date: 'Trip Date',
      vehicleNo: 'Cab No',
      vehicleType: 'Car Type',
      passengers: 'Emp Count',
      km: 'Distance Run',
      vendor: 'Vendor',
      tripCat: 'Trip Category',
      billCat: 'Bill Category',
      toll: 'Toll',
      parking: 'Parking',
    },
  },
  {
    fileName: '08_HCLTech_Cab_Movement',
    company: 'HCL Technologies',
    headers: {
      date: 'Date_of_Trip',
      vehicleNo: 'Vehicle_Number',
      vehicleType: 'Vehicle_Type',
      passengers: 'Passengers',
      km: 'Total_KM',
      vendor: 'Vendor_Name',
      tripCat: 'Trip_Category',
      billCat: 'Bill_Category',
      toll: 'Toll_Amount',
      parking: 'Parking_Amount',
    },
  },
  {
    fileName: '09_Amazon_Logistics_Transport',
    company: 'Amazon India',
    headers: {
      date: 'Trip Date',
      vehicleNo: 'Vehicle Reg No',
      vehicleType: 'Vehicle Type',
      passengers: 'Emp Count',
      km: 'Distance (KM)',
      vendor: 'Agency',
      tripCat: 'Category',
      billCat: 'Shift',
      toll: 'Toll Charges',
      parking: 'Parking Charges',
    },
  },
  {
    fileName: '10_Capgemini_Employee_Trips',
    company: 'Capgemini India',
    headers: {
      date: 'Date',
      vehicleNo: 'Car Number',
      vehicleType: 'Cab Type',
      passengers: 'Pax',
      km: 'Run KM',
      vendor: 'Supplier',
      tripCat: 'Route Type',
      billCat: 'Billing Type',
      toll: 'Toll',
      parking: 'Parking',
    },
  },
];

console.log('📊 Generating 10 Dummy Excel & CSV Files for CabMitra...');

companies.forEach((comp, idx) => {
  const h = comp.headers;
  const rows: any[] = [];

  const baseDate = new Date(2026, 7, 1); // August 1, 2026

  for (let i = 0; i < 15; i++) {
    const tripDate = new Date(baseDate);
    tripDate.setDate(tripDate.getDate() + (i % 25));
    const formattedDate = tripDate.toISOString().split('T')[0];

    const vReg = vehicleRegs[i % vehicleRegs.length];
    const vType = vehicleTypes[i % vehicleTypes.length];
    const vendor = vendorNames[i % vendorNames.length];
    const km = Math.round((12 + (i * 4.3) % 50) * 10) / 10;
    const pax = (i % 4) + 1;
    const toll = i % 3 === 0 ? 110 : 0;
    const parking = i % 5 === 0 ? 50 : 0;

    const row: any = {};
    row[h.date] = formattedDate;
    row[h.vehicleNo] = vReg;
    row[h.vehicleType] = vType;
    row[h.passengers] = pax;
    row[h.km] = km;
    row[h.vendor] = vendor;
    row[h.tripCat] = i % 2 === 0 ? 'PICKUP' : 'DROP';
    row[h.billCat] = i % 4 === 0 ? 'ADHOC' : 'REGULAR';
    row[h.toll] = toll;
    row[h.parking] = parking;

    rows.push(row);
  }

  // Write Excel file (.xlsx)
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Trip Log');

  const xlsxFilePath = path.join(outputDir, `${comp.fileName}.xlsx`);
  XLSX.writeFile(workbook, xlsxFilePath);

  // Write CSV file (.csv)
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);
  const csvFilePath = path.join(outputDir, `${comp.fileName}.csv`);
  fs.writeFileSync(csvFilePath, csvContent, 'utf8');

  console.log(`✅ Created Excel & CSV for ${comp.company}: ${comp.fileName}.xlsx`);
});

console.log(`\n🎉 Successfully generated 10 Excel sheets in: ${outputDir}`);
