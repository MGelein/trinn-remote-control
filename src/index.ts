import { Peer, DataConnection } from "peerjs";

export type TRINNError = {
  name: string;
  message: string;
  type: string;
};

const illegalIdChars = new RegExp("[^a-zA-Z0-9-_]");

export type TRINNStatus = "ready" | "waiting" | "connected" | "connecting";

export const TRINNConfig = {
  host: "0.peerjs.com",
  secure: false,
  debug: false,
  retryTimeout: 10,
  iceServers: [],
};

export const setupTRINN = async (openRelayAPIKey: string) => {
  const response = await fetch(
    `https://trinn.metered.live/api/v1/turn/credentials?apiKey=${openRelayAPIKey}`
  );
  const json = await response.json();
  TRINNConfig.iceServers = json;
  if (TRINNConfig.debug) console.log({ iceServers: json });
};

const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVW0123456789";
const LENGTH = 32;

const randomString = () => {
  const chars = [];
  for (let i = 0; i < LENGTH; i++) {
    chars[i] = randomChar();
  }
  return chars.join("");
};

const randomChar = () => {
  return chars[Math.floor(Math.random() * chars.length)];
};

class TRINNPeer {
  protected connectionCloseCallback: ((id: string) => void) | undefined;
  protected statusChangeCallback: ((status: TRINNStatus) => void) | undefined;
  protected openCallback: ((id: string) => void) | undefined;
  protected errorCallback: ((error: { type: string }) => void) | undefined;
  protected createCallback: ((id: string) => void) | undefined;
  protected dataCallback: ((object: Object) => void) | undefined;
  protected connectionCallback: ((id: string) => void) | undefined;
  protected connections: DataConnection[] = [];

  private status: TRINNStatus = "waiting";
  peer: Peer;
  id: string | undefined;
  error: TRINNError | undefined;

  constructor(requiredId: string) {
    if (TRINNConfig.iceServers.length <= 0) {
      throw new Error(
        "No ICE Servers have been specified. Call setupTRINN(), before any other code, and wait for it to finish"
      );
    }
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
      config: {
        iceServers: TRINNConfig.iceServers,
      },
    });
    this.peer.on("open", (id) => {
      if (TRINNConfig.debug) {
        console.log("Created peer with ID: ", id);
      }
      this.id = id;
      this.createCallback?.(id);
      this.openCallback?.(id);
      this.setStatus("ready");
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
    if (this.id) onCreateCallback(this.id);
    this.createCallback = onCreateCallback;
  }

  onData(onDataCallback: (object: any) => void) {
    this.dataCallback = onDataCallback;
  }

  onConnection(onConnectionCallback: (id: string) => void) {
    if (this.status === "connected") onConnectionCallback(this.id ?? "unknown");
    this.connectionCallback = onConnectionCallback;
  }

  onConnectionClose(onConnectionCloseCallback: (id: string) => void) {
    this.connectionCloseCallback = onConnectionCloseCallback;
  }

  onStatusChange(onStatusChangeCallback: (status: TRINNStatus) => void) {
    this.statusChangeCallback = onStatusChangeCallback;
  }

  protected onError(onErrorCallback: (error: { type: string }) => void) {
    this.errorCallback = onErrorCallback;
  }

  protected onOpen(onOpenCallback: (id: string) => void) {
    this.openCallback = onOpenCallback;
  }

  protected setStatus(status: TRINNStatus) {
    if (this.status !== status) {
      this.status = status;
      this.statusChangeCallback?.(this.status);
    }
  }
}

export class TRINNController extends TRINNPeer {
  constructor(sharedId: string, unavaibleHandler?: () => void) {
    super(`${sharedId}-${randomString()}`);
    this.peer.on("open", (id) => {
      this.id = id;
      this.onError(({ type }) => {
        if (type === "peer-unavailable") {
          unavaibleHandler?.();
          setTimeout(() => {
            this.connectToRemote(sharedId);
          }, 1000 * TRINNConfig.retryTimeout);
        }
      });

      this.connectToRemote(sharedId);
    });
  }

  private connectToRemote(sharedId: string) {
    this.setStatus("connecting");

    const connection = this.peer.connect(`${sharedId}-remote`);
    this.connections.push(connection);

    connection.on("open", () => {
      this.connectionCallback?.(this.id ?? "unknown");
      this.setStatus("connected");
    });

    connection.on("data", (data) => {
      const { type, object } = data as {
        type: string;
        object: any;
      };
      if (type === "data") this.dataCallback?.(object);
    });

    connection.on("close", () => {
      this.connectionCloseCallback?.(connection.connectionId);
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
  private maxConnections = -1;

  constructor(sharedId: string) {
    super(`${sharedId}-remote`);

    this.peer.on("connection", (connection) => {
      if (
        this.maxConnections !== -1 &&
        this.connections.length >= this.maxConnections
      ) {
        connection.close();
        return;
      }

      this.connections.push(connection);
      this.connectionCallback?.(connection.peer);
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
        this.connectionCloseCallback?.(connection.peer);
        this.connections = this.connections.filter(
          (conn) => conn !== connection
        );
      });
    });
  }

  setMaxConnections(amount: number) {
    this.maxConnections = amount;
  }

  onPress(onPressCallback: (key: string) => void) {
    this.pressCallback = onPressCallback;
  }

  onRelease(onReleaseCallback: (key: string) => void) {
    this.releaseCallback = onReleaseCallback;
  }
}
