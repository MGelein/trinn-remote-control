// src/index.ts
import { Peer } from "peerjs";
var TRINNPeer = class {
  constructor(requiredId) {
    this.peer = new Peer(requiredId);
    this.peer.on("open", (id) => {
      this.id = id;
    });
    this.peer.on("error", ({ message, type, name }) => {
      this.error = { message, type, name };
    });
  }
};
var TRINNController = class extends TRINNPeer {
  constructor(sharedId) {
    super(`${sharedId}-controller`);
    this.peer.on("open", (id) => {
      this.id = id;
      this.connection = this.peer.connect(`${sharedId}-remote`);
    });
  }
  sendPress(keyName) {
    var _a;
    (_a = this.connection) == null ? void 0 : _a.send({ key: keyName, type: "press" });
  }
  sendRelease(keyName) {
    var _a;
    (_a = this.connection) == null ? void 0 : _a.send({ key: keyName, type: "release" });
  }
};
var TRINNRemote = class extends TRINNPeer {
  constructor(sharedId) {
    super(`${sharedId}-remote`);
    this.peer.on("connection", (connection) => {
      connection.on("data", (data) => {
        var _a, _b;
        const { key, type } = data;
        if (type === "press")
          (_a = this.pressCallback) == null ? void 0 : _a.call(this, key);
        if (type === "release")
          (_b = this.releaseCallback) == null ? void 0 : _b.call(this, key);
      });
    });
  }
  onPress(onPressCallback) {
    this.pressCallback = onPressCallback;
  }
  onRelease(onReleaseCallback) {
    this.releaseCallback = onReleaseCallback;
  }
};
export {
  TRINNController,
  TRINNRemote
};
//# sourceMappingURL=index.mjs.map