import { db } from "../lib/db";

export type ActivityType =
  | "PLAN_CREATED"
  | "PLAN_DELETED"
  | "PLAN_UPDATED"
  | "PACKAGE_CREATED"
  | "PACKAGE_DELETED"
  | "PACKAGE_UPDATED"
  | "CLIENT_CREATED"
  | "CLIENT_UPDATED"
  | "CLIENT_DELETED"
  | "PLAN_ASSIGNED"
  | "PLAN_REMOVED"
  | "MEMBER_ADDED"
  | "MEMBER_REMOVED"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET"
  | "MESSAGE_ANSWERED"
  | "MESSAGE_CREATED"
  | "MESSAGE_RESOLVED"
  | "MESSAGE_DELETED";

export async function createActivity(data: {
  type: ActivityType;
  message: string;
  userId: string;
  entityId?: string;
}) {
  return db.activity.create({
    data: {
      type: data.type,
      message: data.message,
      userId: data.userId,
      entityId: data.entityId,
    },
  });
}
