enum TimeUnit {
  JustNow = 'justNow',
  Minutes = 'minutes',
  Hours = 'hours',
  Days = 'days',
  Weeks = 'weeks',
  Months = 'months',
  Years = 'years'
}

const getTimeUnit = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();

  const seconds = Math.floor(diffInMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return { unit: TimeUnit.JustNow, value: 0 };
  if (minutes < 60) return { unit: TimeUnit.Minutes, value: minutes };
  if (hours < 24) return { unit: TimeUnit.Hours, value: hours };
  if (days < 7) return { unit: TimeUnit.Days, value: days };
  if (weeks < 4) return { unit: TimeUnit.Weeks, value: weeks };
  if (months < 12) return { unit: TimeUnit.Months, value: months };
  return { unit: TimeUnit.Years, value: years };
};

const formatWithTranslation = (unit: TimeUnit, value: number, t: (key: string, options?: any) => string): string => {
  if (unit === TimeUnit.JustNow) return t("common.justNow");

  const isSingular = value === 1;
  const key = `common.${unit}Ago${isSingular ? '' : '_plural'}`;
  return t(key, { count: value });
};

const formatEnglishFallback = (unit: TimeUnit, value: number): string => {
  if (unit === TimeUnit.JustNow) return "Just now";

  const unitNames = {
    [TimeUnit.Minutes]: 'minute',
    [TimeUnit.Hours]: 'hour',
    [TimeUnit.Days]: 'day',
    [TimeUnit.Weeks]: 'week',
    [TimeUnit.Months]: 'month',
    [TimeUnit.Years]: 'year'
  };

  const unitName = unitNames[unit];
  const isSingular = value === 1;
  return `${value} ${unitName}${isSingular ? '' : 's'} ago`;
};

export const formatRelativeTime = (dateString: string, t?: (key: string, options?: any) => string): string => {
  const { unit, value } = getTimeUnit(dateString);
  return t ? formatWithTranslation(unit, value, t) : formatEnglishFallback(unit, value);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

const getTimeUnitSimple = (dateString: string) => {
  const diffMs = new Date().getTime() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return { unit: TimeUnit.JustNow, value: 0 };
  if (diffMins < 60) return { unit: TimeUnit.Minutes, value: diffMins };
  if (diffHours < 24) return { unit: TimeUnit.Hours, value: diffHours };
  return { unit: TimeUnit.Days, value: diffDays };
};

const formatTimeAgoEnglish = (unit: TimeUnit, value: number): string => {
  if (unit === TimeUnit.JustNow) return "Just now";
  if (unit === TimeUnit.Minutes) return `${value} min ago`;
  if (unit === TimeUnit.Hours) return `${value} hr ago`;
  return `${value} day${value > 1 ? "s" : ""} ago`;
};

export const formatTimeAgo = (dateString: string, t?: (key: string, options?: any) => string): string => {
  const { unit, value } = getTimeUnitSimple(dateString);
  return t ? formatWithTranslation(unit, value, t) : formatTimeAgoEnglish(unit, value);
};

export const generateDateTimeTitle = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
};