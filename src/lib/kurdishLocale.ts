import { Locale } from 'date-fns';

export const kurdishLocale: Locale = {
  code: 'ckb',
  formatDistance: (token: string, count: number, options?: any) => {
    const formatDistanceLocale: Record<string, string> = {
      lessThanXSeconds: 'کەمتر لە {{count}} چرکە',
      xSeconds: '{{count}} چرکە',
      halfAMinute: 'نیو خولەک',
      lessThanXMinutes: 'کەمتر لە {{count}} خولەک',
      xMinutes: '{{count}} خولەک',
      aboutXHours: 'نزیکەی {{count}} کاتژمێر',
      xHours: '{{count}} کاتژمێر',
      xDays: '{{count}} ڕۆژ',
      aboutXMonths: 'نزیکەی {{count}} مانگ',
      xMonths: '{{count}} مانگ',
      aboutXYears: 'نزیکەی {{count}} ساڵ',
      xYears: '{{count}} ساڵ',
      overXYears: 'زیاتر لە {{count}} ساڵ',
      almostXYears: 'نزیکەی {{count}} ساڵ',
    };

    let result = formatDistanceLocale[token].replace('{{count}}', count.toString());

    if (options?.addSuffix) {
      if (options.comparison > 0) {
        return 'لە ' + result;
      } else {
        return result + ' پێش ئێستا';
      }
    }

    return result;
  },
} as any;
