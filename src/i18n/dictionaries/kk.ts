import { core } from "../messages/core";
import { teacherMessages } from "../messages/teacher";
import { staffMessages } from "../messages/staff";
import { serverMessages } from "../messages/server";
import type { Dictionary } from "./ru";

/** Kazakh UI dictionary — complete: every key of the Russian dictionary is required. */
export const kk: Dictionary = { ...core.kk, ...teacherMessages.kk, ...staffMessages.kk, ...serverMessages.kk };
