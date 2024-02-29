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
  retryTimeout: 10,
};

class TRINNPeer {
  protected openCallback: ((id: string) => void) | undefined;
  protected errorCallback: ((error: { type: string }) => void) | undefined;
  protected createCallback: ((id: string) => void) | undefined;
  protected dataCallback: ((object: Object) => void) | undefined;
  protected connectionCallback: (() => void) | undefined;
  protected connections: DataConnection[] = [];

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
      this.createCallback?.(id);
      this.openCallback?.(id);
    });
    this.peer.on("error", ({ message, type, name }) => {
      this.error = { message, type, name };
      if (TRINNConfig.debug) {
        console.log("Error: ", this.error);
      }
      this.errorCallback?.({ type });
    });
  }

  sendData(data: any) {
    const payload = { key: "data", type: "data", object: data };
    if (TRINNConfig.debug) {
      console.log("Sending data:");
      console.log({ connections: this.connections, payload });
    }
    this.connections.forEach((conn) => conn.send(payload));
  }

  onCreate(onCreateCallback: (id: string) => void) {
    this.createCallback = onCreateCallback;
  }

  onData(onDataCallback: (object: any) => void) {
    this.dataCallback = onDataCallback;
  }

  onConnection(onConnectionCallback: () => void) {
    this.connectionCallback = onConnectionCallback;
  }

  protected onError(onErrorCallback: (error: { type: string }) => void) {
    this.errorCallback = onErrorCallback;
  }

  protected onOpen(onOpenCallback: (id: string) => void) {
    this.openCallback = onOpenCallback;
  }
}

export class TRINNController extends TRINNPeer {
  status: "waiting" | "connecting" | "connected" = "waiting";

  constructor(sharedId: string) {
    super(`${sharedId}-${crypto.randomUUID()}`);
    this.peer.on("open", (id) => {
      this.id = id;
      this.onError(({ type }) => {
        if (type === "peer-unavailable") {
          setTimeout(() => {
            this.connectToRemote(sharedId);
          }, 1000 * TRINNConfig.retryTimeout);
        }
      });

      this.connectToRemote(sharedId);
    });
  }

  private connectToRemote(sharedId: string) {
    this.status = "connecting";
    const connection = this.peer.connect(`${sharedId}-remote`);
    this.connections.push(connection);
    connection.on("open", () => {
      this.connectionCallback?.();
      this.status = "connected";
    });
    connection.on("data", (data) => {
      const { type, object } = data as {
        type: string;
        object: any;
      };
      if (type === "data") this.dataCallback?.(object);
    });
    connection.on("close", () => {
      this.connections = this.connections.filter((conn) => conn !== connection);
    });
  }

  sendPress(keyName: string) {
    this.connections.map((conn) => conn.send({ key: keyName, type: "press" }));
  }

  sendRelease(keyName: string) {
    this.connections.map((conn) =>
      conn.send({ key: keyName, type: "release" })
    );
  }
}

export class TRINNRemote extends TRINNPeer {
  private pressCallback: ((key: string) => void) | undefined;
  private releaseCallback: ((key: string) => void) | undefined;

  status: "waiting" | "ready" = "waiting";

  constructor(sharedId: string) {
    super(`${sharedId}-remote`);
    this.onOpen(() => (this.status = "ready"));

    this.peer.on("connection", (connection) => {
      this.connections.push(connection);
      this.connectionCallback?.();
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
      connection.on("close", () => {
        this.connections = this.connections.filter(
          (conn) => conn !== connection
        );
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
