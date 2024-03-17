/**
 * Convert a given timestamp to a formatted UTC date string.
 *
 * @param timestamp - The timestamp to be converted, it can be a number or a string representing a number.
 * @param hours - A boolean flag indicating whether to include the time in the formatted string. Defaults to true.
 * @returns A formatted date string representing the given timestamp in UTC.
 */
export function utcdate(timestamp: unknown, hours: boolean = true): string {
    let num = timestamp as number;
    if (typeof timestamp === 'string') num = parseInt(timestamp);

    var dateObj = new Date(num);
    var year = dateObj.getUTCFullYear();
    var month = dateObj.getUTCMonth() + 1;
    var date = dateObj.getUTCDate();
    var hour = dateObj.getUTCHours();
    var mins = dateObj.getUTCMinutes();
    var secs = dateObj.getUTCSeconds();

    let monthStr = month < 10 ? '0' + month : month;
    let dateStr = date < 10 ? '0' + date : date;
    let hourStr = hour < 10 ? '0' + hour : hour;
    let minsStr = mins < 10 ? '0' + mins : mins;
    let secsStr = secs < 10 ? '0' + secs : secs;
    if (hours) {
        return year + '-' + monthStr + '-' + dateStr + ' ' + hourStr + ':' + minsStr + ':' + secsStr;
    } else {
        return year + '-' + monthStr + '-' + dateStr;
    }
}

/**
 * Convert a date string to a timestamp.
 *
 * @param dateStr - The date string to be converted to a timestamp. It can include the time part optionally.
 * @param withTime - A boolean flag indicating whether the dateStr includes the time part. If true, the function expects the time part in the dateStr and includes it in the resulting timestamp. Defaults to false.
 * @returns A number representing the timestamp derived from the given date string.
 */
export function dateToTimestamp(dateStr: string, withTime?: boolean): number {
    if (!withTime) {
        var dateObj = new Date(dateStr + 'T00:00:00Z');
        return dateObj.getTime();
    } else {
        dateStr = dateStr.replace(' ', 'T');
        var dateObj = new Date(dateStr + '.00Z');
        return dateObj.getTime();
    }
}

export function msToMinutesSeconds(milliseconds: number) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const ms = milliseconds % 1000;
    const seconds = totalSeconds % 60 + ms / 1000;
    return { minutes, seconds };

}