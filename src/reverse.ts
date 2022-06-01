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
        `oAKPeJyVl81qGzEQx2WnAYc2PeQR9uyDRh8rybcmlAba0hxyK8Es6UJTWjDEhJbQN+vDJd6VYu3srDX1wTb2j5Fm5j8feyaOxGxzJubd+7F4863ZNvfrzUO7flCLk39fH6u7aiWX1Y9qFZbV9s+mrVawrL5vuo9fze/L3be/y4wDKILQgXWRUx0nmVz53MjZIqiZB/ccqCJomCE06IamB+uMDIm1HWsSqiNqX9AgB6Qvnl73p2OTuh6bdPThMEWCxKgZo4EbTpDD42OYtCLCFFm+VdBlIWnk1LRNGEopem8J7yOKncoSmjmFSigFVU6a5fiv2F6xhZ9I7JUJlFeGfYFeqgr5D4RSI4qlaqfRcflJ6rKoBKbv6uhcKeICflipqQCptAa6rqwbs6oXNkPXkpuARJZ7qQK2zV5/jgvuTdqe9GEfUx/8sFgVgnWW1Qy23JljUQkkYVPlqnphWUYXiChgaVMaUI7Z2GPAyvNHBaaoFZZfjKoxNRFVLblmFdohDjQ2zV0jNO6AB1qA5u4SEWTsEtzYa8MdP4k8FM8b8XZ797O9b7dxnXsldq+Tlw1vcdzk6x3Wps/2CDvY2xhdHxVyLA3Qe1JJtEPhPmZgfD57PLAjiWZDFLHLNx5jByzgQDk3vqhn1qVnSiPQi5nVRI7ozcBPo/t4pjzVVJ7ScMYND7SlaNweS6O8HKwIlqMVp2i5MQCOa3HcMZ5ZgE2iVmPTAJ8WH2Pa4gYarQZwhNU4bGqUUk0kVLn/RQGXVQBL3cGhgCVdebJboG6VNjRPsXhLTZZDfYDGmyr4QNGGfgAyeZndiHl72/fd11kz3v3y/MR9uxCnH95fr88/fbn4uP787krMmiNx+vzHfPYEwb8X1g==`
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
