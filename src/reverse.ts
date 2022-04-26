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
        `gAFNEgADAAFwEgACAAFwEgADAAp0b2tlbl90eXBlCAAFQkNPSU4AB3Jld2FyZHMRAAUSAAMAC3JlbWFpbl90aW1lBAAAAAAABHR5cGUIAAVCQ09JTgAFdmFsdWUGQWHighIAAwALcmVtYWluX3RpbWUEAAAAAAAEdHlwZQgACUJPTUJFUk1BTgAFdmFsdWUGAAAAABIAAwALcmVtYWluX3RpbWUEAAAAAAAEdHlwZQgAA0tFWQAFdmFsdWUGP4AAABIAAwALcmVtYWluX3RpbWUEAAAAAAAEdHlwZQgAD0JDT0lOX0RFUE9TSVRFRAAFdmFsdWUGAAAAABIAAwALcmVtYWluX3RpbWUEAAAAUAAEdHlwZQgACFNFTlNQQVJLAAV2YWx1ZQY9dmpVAAJlYwQAAAAAAAFjCAAKR0VUX1JFV0FSRAABYQMADQABYwIB`
    )
);
