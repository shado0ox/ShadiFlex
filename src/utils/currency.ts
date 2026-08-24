/**
 * Currency and Arabic Number Formatting Utilities
 */

export function formatSAR(amount: number | undefined | null, showSymbol = true): string {
  const num = typeof amount === 'number' && !isNaN(amount) && isFinite(amount) 
    ? amount 
    : (typeof amount === 'string' && !isNaN(parseFloat(amount)) ? parseFloat(amount) : 0);
  
  const formatted = new Intl.NumberFormat('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

  return showSymbol ? `${formatted} ر.س` : formatted;
}

export function formatSAR_EN(amount: number | undefined | null, showSymbol = true): string {
  const num = typeof amount === 'number' && !isNaN(amount) && isFinite(amount) 
    ? amount 
    : (typeof amount === 'string' && !isNaN(parseFloat(amount)) ? parseFloat(amount) : 0);

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

  return showSymbol ? `${formatted} SAR` : formatted;
}

export function formatDateAr(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Convert number to Arabic words (Tafqeet) for Official Saudi Invoices
 */
export function tafqeetArabic(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'صفر ريال سعودي لا غير';

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const riyals = Math.floor(absAmount);
  const halalas = Math.round((absAmount - riyals) * 100);

  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertChunk(n: number): string {
    if (n === 0) return '';
    let result = '';
    const h = Math.floor(n / 100);
    const remainder = n % 100;

    if (h > 0) {
      result += hundreds[h];
    }

    if (remainder > 0) {
      if (result !== '') result += ' و ';
      if (remainder <= 10) {
        result += units[remainder];
      } else if (remainder < 20) {
        result += teens[remainder - 10];
      } else {
        const u = remainder % 10;
        const t = Math.floor(remainder / 10);
        if (u > 0) {
          result += `${units[u]} و ${tens[t]}`;
        } else {
          result += tens[t];
        }
      }
    }
    return result;
  }

  function convertNumber(n: number): string {
    if (n === 0) return '';
    if (n < 1000) return convertChunk(n);

    const thousands = Math.floor(n / 1000) % 1000;
    const millions = Math.floor(n / 1000000) % 1000;
    const remainder = n % 1000;

    let parts: string[] = [];

    if (millions > 0) {
      if (millions === 1) parts.push('مليون');
      else if (millions === 2) parts.push('مليونان');
      else if (millions >= 3 && millions <= 10) parts.push(`${convertChunk(millions)} ملايين`);
      else parts.push(`${convertChunk(millions)} مليون`);
    }

    if (thousands > 0) {
      if (thousands === 1) parts.push('ألف');
      else if (thousands === 2) parts.push('ألفان');
      else if (thousands >= 3 && thousands <= 10) parts.push(`${convertChunk(thousands)} آلاف`);
      else parts.push(`${convertChunk(thousands)} ألف`);
    }

    if (remainder > 0) {
      parts.push(convertChunk(remainder));
    }

    return parts.join(' و ');
  }

  let finalString = convertNumber(riyals);
  if (riyals === 1) finalString = 'ريال سعودي واحد';
  else if (riyals === 2) finalString = 'ريالان سعوديان';
  else if (riyals >= 3 && riyals <= 10) finalString += ' ريالات سعودية';
  else finalString += ' ريالاً سعودياً';

  if (halalas > 0) {
    let halalaText = convertNumber(halalas);
    if (halalas === 1) halalaText = 'هللة واحدة';
    else if (halalas === 2) halalaText = 'هللتان';
    else if (halalas >= 3 && halalas <= 10) halalaText += ' هللات';
    else halalaText += ' هللة';

    finalString += ` و ${halalaText}`;
  }

  return `فقط ${isNegative ? 'سالب ' : ''}${finalString} لا غير`;
}
