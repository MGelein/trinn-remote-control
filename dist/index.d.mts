import { DataConnection, Peer } from 'peerjs';

type TRINNError = {
    name: string;
    message: string;
    type: string;
};
declare class TRINNPeer {
    peer: Peer;
    id: string | undefined;
    error: TRINNError | undefined;
    constructor(requiredId: string);
}
declare class TRINNController extends TRINNPeer {
    connection: DataConnection | undefined;
    constructor(sharedId: string);
    sendPress(keyName: string): void;
    sendRelease(keyName: string): void;
}
declare class TRINNRemote extends TRINNPeer {
    private pressCallback;
    private releaseCallback;
    constructor(sharedId: string);
    onPress(onPressCallback: (key: string) => void): void;
    onRelease(onReleaseCallback: (key: string) => void): void;
}

export { TRINNController, TRINNError, TRINNRemote };
