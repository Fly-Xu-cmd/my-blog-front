import { ApiError } from "./api";
import { shanghaiDayStartUtc } from "./analytics";
const DAY = 86400000;
const label = (date: Date) =>
  new Date(date.getTime() + 8 * 3600000).toISOString().slice(0, 10);
export function reportRange(params: URLSearchParams, fallback = "7d") {
  const today = shanghaiDayStartUtc();
  const startText = params.get("start"),
    endText = params.get("end");
  const range =
    startText !== null || endText !== null
      ? "custom"
      : (params.get("range") ?? fallback);
  let start: Date, last: Date;
  if (range === "custom") {
    const parse = (value: string | null) => {
      if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value))
        throw new ApiError(400, "INVALID_RANGE");
      const date = new Date(value + "T00:00:00+08:00");
      if (
        !Number.isFinite(date.getTime()) ||
        label(date) !== value ||
        value < "1970-01-01"
      )
        throw new ApiError(400, "INVALID_RANGE");
      return date;
    };
    if (params.has("range")) throw new ApiError(400, "INVALID_RANGE");
    start = parse(startText);
    last = parse(endText);
  } else {
    last = today;
    if (range === "7d" || range === "30d")
      start = new Date(today.getTime() - (range === "7d" ? 6 : 29) * DAY);
    else if (range === "week") {
      const weekday = new Date(today.getTime() + 8 * 3600000).getUTCDay();
      start = new Date(today.getTime() - ((weekday + 6) % 7) * DAY);
    } else if (range === "month")
      start = new Date(label(today).slice(0, 8) + "01T00:00:00+08:00");
    else throw new ApiError(400, "INVALID_RANGE");
  }
  const days = (last.getTime() - start.getTime()) / DAY + 1;
  if (days < 1 || days > 366 || last > today)
    throw new ApiError(
      400,
      "INVALID_RANGE",
      "请选择有效日期，单次最多查询 366 天且不晚于今天",
    );
  const end = new Date(last.getTime() + DAY);
  return {
    range,
    start,
    end,
    days,
    startDate: label(start),
    endDate: label(last),
    dates: Array.from({ length: days }, (_, i) =>
      label(new Date(start.getTime() + i * DAY)),
    ),
  };
}
