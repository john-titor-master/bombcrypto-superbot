export function toRevBin(decStr: string) {
    return BigInt(decStr).toString(2).split("").reverse().join("");
}

export function parseRevBin(binStr: string, from: number, to: number) {
    return parseInt(binStr.slice(from, to).split("").reverse().join(""), 2);
}
