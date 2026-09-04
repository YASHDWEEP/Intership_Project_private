import { prisma } from '../../config/prisma';

export const logAudit = async (params: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
        newValue: params.newValue ? JSON.stringify(params.newValue) : null,
      },
    });
  } catch (err) {
    console.error('Audit Log creation error:', err);
  }
};

export const createNotification = async (params: {
  userId: string;
  title: string;
  message: string;
}) => {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
      },
    });
  } catch (err) {
    console.error('Notification creation error:', err);
  }
};
