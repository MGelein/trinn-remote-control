"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  TRINNController: () => TRINNController,
  TRINNRemote: () => TRINNRemote
});
module.exports = __toCommonJS(src_exports);
var import_peerjs = require("peerjs");
var TRINNPeer = class {
  constructor(requiredId) {
    this.peer = new import_peerjs.Peer(requiredId);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TRINNController,
  TRINNRemote
});
//# sourceMappingURL=index.js.map