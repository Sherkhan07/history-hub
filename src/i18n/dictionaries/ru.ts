import { core } from "../messages/core";
import { teacherMessages } from "../messages/teacher";
import { staffMessages } from "../messages/staff";
import { serverMessages } from "../messages/server";

/** Russian UI dictionary, assembled from the message namespaces in src/i18n/messages. */
export const ru = { ...core.ru, ...teacherMessages.ru, ...staffMessages.ru, ...serverMessages.ru };

export type Dictionary = typeof ru;
