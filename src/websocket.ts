import WS from "ws";

declare global {
    // eslint-disable-next-line no-var
    var WebSocket: WS;
}

global.WebSocket = require("ws");
