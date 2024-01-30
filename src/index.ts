import { Peer, DataConnection } from "peerjs";

export type TRINNError = {
  name: string;
  message: string;
  type: string;
};

class TRINNPeer {
  protected pressCallback: ((key: string) => void) | undefined;
  protected releaseCallback: ((key: string) => void) | undefined;
  protected dataCallback: ((object: Object) => void) | undefined;
  protected connection: DataConnection | undefined;

  peer: Peer;
  id: string | undefined;
  error: TRINNError | undefined;

  constructor(requiredId: string) {
    this.peer = new Peer(requiredId);
    this.peer.on("open", (id) => {
      this.id = id;
    });
    this.peer.on("error", ({ message, type, name }) => {
      this.error = { message, type, name };
    });
  }

  sendData(data: any) {
    this.connection?.send({ key: "data", type: "data", object: data });
  }

  onData(onDataCallback: (object: any) => void) {
    this.dataCallback = onDataCallback;
  }
}

export class TRINNController extends TRINNPeer {
  constructor(sharedId: string) {
    super(`${sharedId}-controller`);
    this.peer.on("open", (id) => {
      this.id = id;
      this.connection = this.peer.connect(`${sharedId}-remote`);
    });
  }

  sendPress(keyName: string) {
    this.connection?.send({ key: keyName, type: "press" });
  }

  sendRelease(keyName: string) {
    this.connection?.send({ key: keyName, type: "release" });
  }
}

export class TRINNRemote extends TRINNPeer {
  constructor(sharedId: string) {
    super(`${sharedId}-remote`);
    this.peer.on("connection", (connection) => {
      connection.on("data", (data) => {
        const { key, type, object } = data as {
          key: string;
          type: string;
          object: any;
        };
        if (type === "press") this.pressCallback?.(key);
        if (type === "release") this.releaseCallback?.(key);
        if (type === "data") this.dataCallback?.(object);
      });
    });
  }

  onPress(onPressCallback: (key: string) => void) {
    this.pressCallback = onPressCallback;
  }

  onRelease(onReleaseCallback: (key: string) => void) {
    this.releaseCallback = onReleaseCallback;
  }
}
