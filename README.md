# TRINN Remote Control

This package allows for simple remote control of applications over WebRTC.

## Installation

The package can be installed using npm:

```
npm i trinn-remote-control
```

## Example Usage

After the package has been installed you now have access to two classes: `TRINNController` and `TRINNRemote`.

```javascript
//remote.js

const remote = new TRINNRemote("SomeSharedId");

remote.onPress((key) => {
  console.log(`${key} was pressed`);
});

remote.onRelease((key) => {
  console.log(`${key} was released`);
});

remote.onData((object) => {
  console.log(object);
});

remote.sendData({ type: "bicycle", amount: 5 });
```

```javascript
//controller.js

const controller = new TRINNController("SomeSharedId");

document.addEventListener("keydown", (e) => {
  controller.sendPress(e.key);
});

document.addEventListener("keyup", (e) => {
  controller.sendRelease(e.key);
});

controller.sendData({ type: "bicycle", amount: 5 });

controller.onData((object) => {
  console.log(object);
});
```

## Known Issues

Because this library depends on PeerJS we are unfortunately not able to support SSR at this time

## Todo

- Add configurable PeerJS server
