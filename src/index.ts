import { Peer, DataConnection } from "peerjs";

export type TRINNError = {
  name: string;
  message: string;
  type: string;
};

const illegalIdChars = new RegExp("[^a-zA-Z0-9-_]");

export const TRINNConfig = {
  host: "0.peerjs.com",
  secure: false,
  debug: false,
};

class TRINNPeer {
  protected dataCallback: ((object: Object) => void) | undefined;
  protected connection: DataConnection | undefined;

  peer: Peer;
  id: string | undefined;
  error: TRINNError | undefined;

  constructor(requiredId: string) {
    const illegalChars = illegalIdChars.exec(requiredId);
    if (illegalChars !== null) {
      throw new Error(
        "You're id contains some illegal characters: " + illegalChars.join(",")
      );
    }

    if (TRINNConfig.debug) {
      console.log(
        `Creating peer: ID: ${requiredId}, HOST: ${TRINNConfig.host}, SECURE: ${TRINNConfig.secure}`
      );
    }
    this.peer = new Peer(requiredId, {
      host: TRINNConfig.host,
      secure: TRINNConfig.secure,
    });
    this.peer.on("open", (id) => {
      if (TRINNConfig.debug) {
        console.log("Created peer with ID: ", id);
      }
      this.id = id;
    });
    this.peer.on("error", ({ message, type, name }) => {
      this.error = { message, type, name };
      if (TRINNConfig.debug) {
        console.log("Error: ", this.error);
      }
    });
  }

  sendData(data: any) {
    const payload = { key: "data", type: "data", object: data };
    if (TRINNConfig.debug) {
      console.log("Sending data:");
      console.log({ connection: this.connection, payload });
    }
    this.connection?.send(payload);
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
      this.connection.on("data", (data) => {
        const { type, object } = data as {
          type: string;
          object: any;
        };
        if (type === "data") this.dataCallback?.(object);
      });
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
      this.connection = connection;
      connection.on("data", (data) => {
        const { key, type, object } = data as {
          key: string;
          type: string;
          object: any;
        };
        if (type === "data") this.dataCallback?.(object);
        else if (type === "press") this.pressCallback?.(key);
        else if (type === "release") this.releaseCallback?.(key);
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
