import { Response } from 'express';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { prisma } from '../config/prisma';
import { NormalizationService } from '../services/normalization.service';
import { logAudit } from '../common/utils/audit.logger';

export class ImportController {
  static async uploadAndReadHeaders(req: any, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileBuffer = req.file.buffer;
      const fileName = req.file.originalname;
      const isCsv = fileName.endsWith('.csv');

      let headers: string[] = [];
      let rawRows: any[] = [];

      if (isCsv) {
        const csvText = fileBuffer.toString('utf8');
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        headers = parsed.meta.fields || [];
        rawRows = parsed.data;
      } else {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonData.length > 0) {
          headers = Object.keys(jsonData[0]);
          rawRows = jsonData;
        }
      }

      const suggestedMappings = NormalizationService.suggestMappings(headers);

      return res.json({
        fileName,
        totalRows: rawRows.length,
        headers,
        suggestedMappings,
        previewRows: rawRows.slice(0, 5),
      });
    } catch (err: any) {
      return res.status(500).json({ error: `File processing error: ${err.message}` });
    }
  }

  static async saveMappingTemplate(req: any, res: Response) {
    try {
      const { clientId, templateName, mappings } = req.body;
      if (!clientId || !mappings) {
        return res.status(400).json({ error: 'clientId and mappings are required' });
      }

      // Upsert mappings for this client
      for (const [internalField, sourceColumn] of Object.entries(mappings)) {
        if (sourceColumn) {
          await prisma.importMapping.upsert({
            where: {
              clientId_sourceColumn: {
                clientId,
                sourceColumn: String(sourceColumn),
              },
            },
            update: {
              internalField,
              templateName: templateName || 'Default Client Template',
            },
            create: {
              clientId,
              templateName: templateName || 'Default Client Template',
              sourceColumn: String(sourceColumn),
              internalField,
            },
          });
        }
      }

      return res.json({ message: 'Mapping template saved successfully' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async processImport(req: any, res: Response) {
    try {
      const { clientId, fileName, rawRows, mappings } = req.body;
      if (!clientId || !rawRows || !Array.isArray(rawRows) || !mappings) {
        return res.status(400).json({ error: 'Invalid import parameters' });
      }

      const client = await prisma.client.findUnique({ where: { id: clientId } });
      if (!client) return res.status(404).json({ error: 'Client not found' });

      const vendors = await prisma.vendor.findMany();
      const vehicles = await prisma.vehicle.findMany();

      // Create ImportJob record
      const importJob = await prisma.importJob.create({
        data: {
          clientId,
          fileName: fileName || 'Uploaded_Trips.xlsx',
          fileType: fileName?.endsWith('.csv') ? 'CSV' : 'XLSX',
          status: 'PROCESSING',
          totalRows: rawRows.length,
          createdBy: req.user?.id || (await prisma.user.findFirst())?.id || '',
        },
      });

      let validRowsCount = 0;
      let invalidRowsCount = 0;
      let duplicateRowsCount = 0;

      const tripsToInsert: any[] = [];
      const errorsToInsert: any[] = [];

      // Loop through all raw rows and normalize
      for (let i = 0; i < rawRows.length; i++) {
        const rawRow = rawRows[i];
        const rowNum = i + 1;

        const result = await NormalizationService.validateAndNormalizeRow(
          rawRow,
          mappings,
          clientId,
          vendors,
          vehicles
        );

        if (!result.valid) {
          invalidRowsCount++;
          result.errors.forEach((errMsg) => {
            errorsToInsert.push({
              importJobId: importJob.id,
              rowNumber: rowNum,
              field: errMsg.split(':')[0] || 'GENERAL',
              errorMessage: errMsg,
              rawValue: JSON.stringify(rawRow).slice(0, 200),
            });
          });
        } else {
          // Check duplicate trip (same date, client, vehicleNumber, and totalKm)
          const isDuplicate = await prisma.trip.findFirst({
            where: {
              clientId,
              vehicleNumber: result.normalizedTrip.vehicleNumber,
              tripDate: result.normalizedTrip.tripDate,
              totalKm: result.normalizedTrip.totalKm,
            },
          });

          if (isDuplicate) {
            duplicateRowsCount++;
            errorsToInsert.push({
              importJobId: importJob.id,
              rowNumber: rowNum,
              field: 'DUPLICATE',
              errorMessage: `Duplicate trip detected on date ${result.normalizedTrip.tripDate.toLocaleDateString()} for vehicle ${result.normalizedTrip.vehicleNumber}`,
              rawValue: JSON.stringify(rawRow).slice(0, 200),
            });
          } else {
            validRowsCount++;
            tripsToInsert.push({
              ...result.normalizedTrip,
              importJobId: importJob.id,
              status: 'VALIDATED',
            });
          }
        }
      }

      // Batch Insert Valid Trips and Errors
      if (tripsToInsert.length > 0) {
        await prisma.trip.createMany({
          data: tripsToInsert,
        });
      }

      if (errorsToInsert.length > 0) {
        await prisma.importError.createMany({
          data: errorsToInsert,
        });
      }

      // Update ImportJob status
      const updatedJob = await prisma.importJob.update({
        where: { id: importJob.id },
        data: {
          status: 'COMPLETED',
          validRows: validRowsCount,
          invalidRows: invalidRowsCount,
          duplicateRows: duplicateRowsCount,
          completedAt: new Date(),
        },
        include: { errors: true },
      });

      await logAudit({
        userId: req.user?.id,
        action: 'IMPORT',
        entity: 'ImportJob',
        entityId: importJob.id,
        newValue: {
          totalRows: rawRows.length,
          validRows: validRowsCount,
          invalidRows: invalidRowsCount,
        },
      });

      return res.json({
        message: 'Import processed successfully',
        job: updatedJob,
        summary: {
          totalRows: rawRows.length,
          validRows: validRowsCount,
          invalidRows: invalidRowsCount,
          duplicateRows: duplicateRowsCount,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getHistory(req: any, res: Response) {
    try {
      const jobs = await prisma.importJob.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { name: true } },
          user: { select: { name: true, email: true } },
          _count: { select: { errors: true, trips: true } },
        },
      });
      return res.json(jobs);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
