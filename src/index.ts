import { Peer, DataConnection } from "peerjs";

export type TRINNError = {
  name: string;
  message: string;
  type: string;
};

class TRINNPeer {
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
}

export class TRINNController extends TRINNPeer {
  connection: DataConnection | undefined;

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
  private pressCallback: ((key: string) => void) | undefined;
  private releaseCallback: ((key: string) => void) | undefined;

  constructor(sharedId: string) {
    super(`${sharedId}-remote`);
    this.peer.on("connection", (connection) => {
      connection.on("data", (data) => {
        const { key, type } = data as { key: string; type: string };
        if (type === "press") this.pressCallback?.(key);
        if (type === "release") this.releaseCallback?.(key);
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
