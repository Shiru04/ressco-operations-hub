import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export const LA_TZ = "America/Los_Angeles";

export function toLADateISO(dateLike) {
  // store as "LA midnight" to avoid DST display shifts
  // Example: user selects 12/24/2025 -> 2025-12-24T08:00:00.000Z (or 07:00Z in DST)
  const d = dayjs(dateLike).tz(LA_TZ).startOf("day");
  return d.toISOString();
}

export function fromISOToLADayjs(iso) {
  if (!iso) return null;
  return dayjs(iso).tz(LA_TZ);
}

export default dayjs;
