const MONTHS_SHORT: Record<string, string> = {
  January: "Jan",
  February: "Feb",
  March: "Mar",
  April: "Apr",
  May: "May",
  June: "Jun",
  July: "Jul",
  August: "Aug",
  September: "Sep",
  October: "Oct",
  November: "Nov",
  December: "Dec",
};

/** "April–May, September–October" → "Apr–May, Sep–Oct". Other wording is left as written. */
export function abbreviateMonths(value: string): string {
  return value.replace(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g,
    (month) => MONTHS_SHORT[month] ?? month,
  );
}
