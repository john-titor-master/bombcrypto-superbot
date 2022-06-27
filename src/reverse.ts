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

// //  claim SEN // //
//
// (utf_string) c: APPROVE_CLAIM
// (int) r: -1
// (sfs_object) p:
//         (sfs_object) data:
//                 (int) block_reward_type: 7
//
//         (int) id: 9
//         (utf_string) hash: e003abed027045b95724985a05121b03
//         (long) timestamp: 63787958174925

// // BCOIN
// (utf_string) c: APPROVE_CLAIM
// (int) r: -1
// (sfs_object) p:
//         (sfs_object) data:
//                 (int) block_reward_type: 1
//
//         (int) id: 9
//         (utf_string) hash: f07db869ea50fd67ff5c355a1183dfa2
//         (long) timestamp: 63787958630927

// //
// (utf_string) c: START_PVE
// (int) r: -1
// (sfs_object) p:
//         (sfs_object) data:
//                 (utf_string) slogan: gold_miner

//         (int) id: 13
//         (utf_string) hash: 87309b0769dddfa441eaee4f7d80c89b
//         (long) timestamp: 63787958478405
