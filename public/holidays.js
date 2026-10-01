// Public holidays for the two delivery offices: Estonia (EE) and Poland (PL), 2026 and 2027.
// Static data (DESIGN.md v2.1-B). The board never moves dates because of a holiday: it only shows
// a notice when a holiday touches a sprint's key dates. A shifted Live update goes into OVERRIDES.
//
// Easter-based dates: Easter Sunday is 5 Apr 2026 and 28 Mar 2027.
//   EE: Good Friday (Easter - 2), Easter Sunday, Pentecost (Easter + 49).
//   PL: Easter Sunday, Easter Monday (Easter + 1), Pentecost (Easter + 49), Corpus Christi (Easter + 60).
// PL Christmas Eve (24 Dec) is a public holiday from 2025.
// To extend: add the next year's rows in date order, one row per (date, country). Tests check the format.

export const HOLIDAYS = [
  // ---------------------------------------------------------------- 2026
  { date: '2026-01-01', country: 'EE', name: 'New Year\'s Day' },
  { date: '2026-01-01', country: 'PL', name: 'New Year\'s Day' },
  { date: '2026-01-06', country: 'PL', name: 'Epiphany' },
  { date: '2026-02-24', country: 'EE', name: 'Independence Day' },
  { date: '2026-04-03', country: 'EE', name: 'Good Friday' },
  { date: '2026-04-05', country: 'EE', name: 'Easter Sunday' },
  { date: '2026-04-05', country: 'PL', name: 'Easter Sunday' },
  { date: '2026-04-06', country: 'PL', name: 'Easter Monday' },
  { date: '2026-05-01', country: 'EE', name: 'Spring Day' },
  { date: '2026-05-01', country: 'PL', name: 'Labour Day' },
  { date: '2026-05-03', country: 'PL', name: 'Constitution Day' },
  { date: '2026-05-24', country: 'EE', name: 'Pentecost' },
  { date: '2026-05-24', country: 'PL', name: 'Pentecost' },
  { date: '2026-06-04', country: 'PL', name: 'Corpus Christi' },
  { date: '2026-06-23', country: 'EE', name: 'Victory Day' },
  { date: '2026-06-24', country: 'EE', name: 'Midsummer Day' },
  { date: '2026-08-15', country: 'PL', name: 'Assumption Day' },
  { date: '2026-08-20', country: 'EE', name: 'Day of Restoration of Independence' },
  { date: '2026-11-01', country: 'PL', name: 'All Saints\' Day' },
  { date: '2026-11-11', country: 'PL', name: 'Independence Day' },
  { date: '2026-12-24', country: 'EE', name: 'Christmas Eve' },
  { date: '2026-12-24', country: 'PL', name: 'Christmas Eve' },
  { date: '2026-12-25', country: 'EE', name: 'Christmas Day' },
  { date: '2026-12-25', country: 'PL', name: 'Christmas Day' },
  { date: '2026-12-26', country: 'EE', name: 'Boxing Day' },
  { date: '2026-12-26', country: 'PL', name: 'Second Day of Christmas' },

  // ---------------------------------------------------------------- 2027
  { date: '2027-01-01', country: 'EE', name: 'New Year\'s Day' },
  { date: '2027-01-01', country: 'PL', name: 'New Year\'s Day' },
  { date: '2027-01-06', country: 'PL', name: 'Epiphany' },
  { date: '2027-02-24', country: 'EE', name: 'Independence Day' },
  { date: '2027-03-26', country: 'EE', name: 'Good Friday' },
  { date: '2027-03-28', country: 'EE', name: 'Easter Sunday' },
  { date: '2027-03-28', country: 'PL', name: 'Easter Sunday' },
  { date: '2027-03-29', country: 'PL', name: 'Easter Monday' },
  { date: '2027-05-01', country: 'EE', name: 'Spring Day' },
  { date: '2027-05-01', country: 'PL', name: 'Labour Day' },
  { date: '2027-05-03', country: 'PL', name: 'Constitution Day' },
  { date: '2027-05-16', country: 'EE', name: 'Pentecost' },
  { date: '2027-05-16', country: 'PL', name: 'Pentecost' },
  { date: '2027-05-27', country: 'PL', name: 'Corpus Christi' },
  { date: '2027-06-23', country: 'EE', name: 'Victory Day' },
  { date: '2027-06-24', country: 'EE', name: 'Midsummer Day' },
  { date: '2027-08-15', country: 'PL', name: 'Assumption Day' },
  { date: '2027-08-20', country: 'EE', name: 'Day of Restoration of Independence' },
  { date: '2027-11-01', country: 'PL', name: 'All Saints\' Day' },
  { date: '2027-11-11', country: 'PL', name: 'Independence Day' },
  { date: '2027-12-24', country: 'EE', name: 'Christmas Eve' },
  { date: '2027-12-24', country: 'PL', name: 'Christmas Eve' },
  { date: '2027-12-25', country: 'EE', name: 'Christmas Day' },
  { date: '2027-12-25', country: 'PL', name: 'Christmas Day' },
  { date: '2027-12-26', country: 'EE', name: 'Boxing Day' },
  { date: '2027-12-26', country: 'PL', name: 'Second Day of Christmas' },
];

/** Day of week of a 'YYYY-MM-DD' key (0 = Sunday), computed in UTC so the device zone never matters. */
function weekday(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Holidays with from <= date <= to (inclusive, 'YYYY-MM-DD' keys), in date order then country.
 * weekdaysOnly (default true) drops holidays on a Saturday or Sunday: they never touch a working day.
 */
export function holidaysBetween(from, to, { weekdaysOnly = true, list = HOLIDAYS } = {}) {
  return list
    .filter((h) => h.date >= from && h.date <= to)
    .filter((h) => !weekdaysOnly || (weekday(h.date) !== 0 && weekday(h.date) !== 6))
    .sort((a, b) => (a.date === b.date ? a.country.localeCompare(b.country) : a.date < b.date ? -1 : 1));
}
