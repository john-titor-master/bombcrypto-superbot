import { SmartFox } from "sfs2x-api";

type SmartFoxExtended = SmartFox & {
    _socketEngine: {
        _protocolCodec: {
            onPacketRead: (message: Buffer) => { dump: () => string };
        };
    };
};

// A dummy server
const SFS = new SmartFox({
    host: "server.bombcrypto.io",
    port: 443,
    zone: "BomberGameZone",
    debug: true,
    useSSL: true,
}) as SmartFoxExtended;

// Decode any base64 encoded message from WS tab in Chrome
function decodeMessage(base64: string): string {
    const binMessage = Buffer.from(base64, "base64");
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const parsed = SFS!._socketEngine._protocolCodec.onPacketRead(binMessage);
    return parsed.dump();
}

// Get messages in base64 from WS tab and decode them:

// CONNECT Request
console.log(
    decodeMessage(
        `oAK9eJytlctqVFkUhndFcwGR1nqAnjgIztZe902POk0QwRsi4izkUqQLYpSkbGhw4tiJk4ZWfAVH+gQ+g76CoGMfwP9EwSosqRywBsXZex9qffX//1p7WM6UwcNhWfr2vbrz4P7O6Oj4Yjk/LMtl9fjv8ehgD8vBEG+u7j46OhodTs6WMnhVlicPJtsH3fPbsrq9Mz4YT/7FqgzK8vFke3/09XlpvLdcuqdbly+Ulf3R4dZ4b62kkYVUd25ZU0gz0kPYJVU5PCIbCTevGdUsqniYNqeyMjocHe2fFDq3APHpFOKzUyGuv5uHmEERHCdUrpLmXHEQjYCl7OmC3aqpVaT5NOLar0d8fypEyxrEwW7ZulNWqvioWpDaNOJwAeKjvog3/r/6IyLD29rgcNVwVRFNokzypEiWzAzW1ghx4Opwvo+K//RGfLExD1HCDQxqlAq2TOSxwdEwSAmRHX43csRQA/JOI67MIpb5dS9/+ON7XYE7QWaGBDVF0LtWcFNqtUIWSVFUFhRTDayi1hnjLi1Q5Un/bMncbFVG1FMaOyvyLkpwsBlTVq8hrRqkQROn1Wx1GvHCrzbu2ouPPyBaOihVnJEeaU1NmrIi55XZGJFPNIODFrzGTL0QJ/0RP50KkbudiHaiL7iUEbvmGd1L1KdDH/eO//P1ufFn5L2yItroUIwSSzbBXAvEHisxj65dxTBsbEbF334e//K97vrG7zPxZ9Qmd/QAsaHpMxB+EQiD32e4CNWiNUdzUAtvOl2yLFDlvylVPp9ubr2ZO7eaUnYTFltSYRccsrBmBN+gFBGuL/RAwz9Ap04j3luA+LLvHXrj+eu5xhlbReQxpQgzI53Cq7auMzE2WEyYvGtOwm1VZ4y7VJZGu19tGuyulYtXNu9s/fnXnat3N7c2bl7f2LxdBttnynkcLg2+ALXlqqU=`
    )
);
