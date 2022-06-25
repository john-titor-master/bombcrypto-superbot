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
        "gACMEgADAAFjAgEAAWEDAA0AAXASAAMAAWMIAAhHT19TTEVFUAABcgT/////AAFwEgAEAARkYXRhEgABAAJpZAUAAAAAATRkrQACaWQEAAAAGAAEaGFzaAgAIDllNmNlMjM2M2Y1YjdiNTNiNmQ4NWI0M2E2ZGJkODEwAAl0aW1lc3RhbXAFAAA6BK7HEpg="
    )
);
