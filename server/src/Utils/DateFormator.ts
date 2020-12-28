export default class DateFormator {
    public static formatDate(date: Date, format?: string): string {
        if (format === undefined)
            format = "MM/dd/yyyy";

        var month = date.getMonth() + 1;
        var year = date.getFullYear();

        format = format.replace("MM", this.padLeft(month.toString(), 2, "0"));

        if (format.indexOf("yyyy") > -1)
            format = format.replace("yyyy", year.toString());
        else if (format.indexOf("yy") > -1)
            format = format.replace("yy", year.toString().substr(2, 2));

        format = format.replace("dd", this.padLeft(date.getDate().toString(), 2, "0"));

        var hours = date.getHours();
        if (format.indexOf("t") > -1) {
            if (hours > 11)
                format = format.replace("t", "pm")
            else
                format = format.replace("t", "am")
        }
        if (format.indexOf("HH") > -1)
            format = format.replace("HH", this.padLeft(hours.toString(), 2, "0"));
        if (format.indexOf("hh") > -1) {
            if (hours > 12) hours - 12;
            if (hours == 0) hours = 12;
            format = format.replace("hh", this.padLeft(hours.toString(), 2, "0"));
        }
        if (format.indexOf("mm") > -1)
            format = format.replace("mm", this.padLeft(date.getMinutes().toString(), 2, "0"));
        if (format.indexOf("ss") > -1)
            format = format.replace("ss", this.padLeft(date.getSeconds().toString(), 2, "0"));
        return format;
    }

    private static padLeft(str: string, width: number, pad: string): string {
        if (!width || width < 1)
            return str;

        if (!pad) pad = " ";
        let length = width - str.length
        if (length < 1) return str.substr(0, width);

        return (this.repeat(pad, length) + this).substr(0, width);
    }

    private static repeat(chr: string, count: number): string {
        let str = "";
        for (var x = 0; x < count; x++) { str += chr };
        return str;
    }
}