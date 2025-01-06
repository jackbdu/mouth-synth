/* Main Sketch
 * Jack B. Du (github@jackbdu.com)
 * https://instagram.com/jackbdu/
 */

const sketch = (p) => {
  p.specs = {
    fps: 60,
    colorBackground: 0,
    outputWidth: "auto",
    outputHeight: "auto",
  };

  p.options = {
    sound: {
      midiScale: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84],
      noteIndices: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24], // major 2 octaves
      detuneAmount: 512,
      effectFrequencyAmount: 16,
      harmonicityAmount: 16,
      modulationAmount: 64,
      volumeAmount: 16,
      effect: {
        frequency: 5,
        depth: 1,
      },
      synth: {
        harmonicity: 3,
        modulationIndex: 10,
        envelope: {
          attack: 0.1,
          decay: 0.1,
          sustain: 1,
          release: 1,
        },
        modulationEnvelope: {
          attack: 0.1,
          decay: 0.1,
          sustain: 1,
          release: 1,
        },
        volume: -16,
      },
    },
    ml5: {
      lipsCloseThreshold: 4,
      lipsOpenThreshold: 8,
      smoothness: 0.75,
      // isDebugging: true,
      facemesh: {
        maxFaces: 1,
        refineLandmarks: false,
        flipHorizontal: false,
      },
      strokeWeight: 0.01,
      strokeColor: "#fff",
      glowingStrokeWeight: 0.02,
      glowingStrokeColor: "#fff",
      lipsSize: 0.75,
      placeholderFacePath: "assets/neutural-face.json",
      blurriness: 0.005,
    },
    video: {
      width: 640,
      height: 480,
      pixelationShortSideNum: 24,
      pixelationStyle: 2,
      flipped: true,
      fit: p.COVER,
      backgroundColor: [0],
      overlayColor: [0, 100],
    },
    ui: {
      fontUrl: "assets/Ubuntu-Bold.ttf",
      messages: {
        loading: "Loading...".toUpperCase(),
        welcome: "Click here to activate audio".toUpperCase(),
        running: "",
      },
      textColor: 255,
      // showFrameRate: true,
    },
  };

  p.uiManager = uiManager;
  p.ml5Manager = ml5Manager;
  p.videoManager = videoManager;
  p.soundManager = soundManager;

  p.preload = () => {
    p.uiManager.preload(p.options.ui);
    p.ml5Manager.preload(p.options.ml5);
    p.soundManager.preload(p.options.sound);
  };

  p.setup = () => {
    p.updateCanvas(p.specs.outputWidth, p.specs.outputHeight);
    p.frameRate(p.specs.fps);
    p.smooth();

    p.videoManager.setup(p.width, p.height, { ...p.options.video, video: p.VIDEO });
    p.ml5Manager.setup(p.width, p.height, { ...p.options.ml5, graphics: p.videoManager.captureGraphics });
    p.uiManager.setup(p.width, p.height, p.options.ui);
    p.soundManager.setup(p.options.sound);

    p.ml5Manager.lipsOpened = () => {
      p.soundManager.triggerStart(p.ml5Manager.getLipsRotationPercentage());
    };
    p.ml5Manager.lipsClosed = () => {
      p.soundManager.triggerEnd();
    };
    p.ml5Manager.lipsMovedWhileOpen = () => {
      p.soundManager.changeVolume(p.ml5Manager.getLipsOpeningPercentage());
      p.soundManager.detune(p.ml5Manager.getLipsRotationPercentage());
      p.soundManager.changeEffectFrequency(p.ml5Manager.getLipsRotationPercentage());
      p.soundManager.moveHarmonicity(p.ml5Manager.getLipsTipHeadingXPercentage());
      p.soundManager.changeModulationIndex(p.ml5Manager.getLipsTipHeadingYPercentage());
    };

    if (p.specs.exhibit) {
      p.soundManager.mousePressed();
      p.noCursor();
    }
  };

  p.mousePressed = () => {
    p.soundManager.mousePressed();
  };

  p.touchStarted = () => {
    p.soundManager.mousePressed();
  };

  p.beforeDraw = () => {
    if (p.beginCapture) p.beginCapture();
    p.videoManager.update(p.options.video);
    p.uiManager.update(p.videoManager.loaded && p.ml5Manager.loaded && p.soundManager.loaded, p.soundManager.started, p.ml5Manager.faces.length > 0);
    p.background(p.specs.colorBackground);
  };

  p.draw = () => {
    if (p.beforeDraw) p.beforeDraw();

    p.videoManager.display(p.options.video);
    p.ml5Manager.display(p.options.ml5);
    p.uiManager.display();

    if (p.afterDraw) p.afterDraw();
  };

  p.afterDraw = () => {
    if (p.endCapture) p.endCapture();
  };

  p.windowResized = () => {
    p.updateCanvas(p.specs.outputWidth, p.specs.outputHeight);
    p.uiManager.updateRefSize(p.width, p.height);
    p.ml5Manager.updateRefSize(p.width, p.height);
    p.videoManager.updateDimensions(p.width, p.height);
  };

  p.updateCanvas = (outputWidth = "auto", outputHeight = "auto") => {
    const pd = p.pixelDensity();
    const canvasWidth = outputWidth && outputWidth !== "auto" ? outputWidth / pd : p.windowWidth;
    const canvasHeight = outputHeight && outputHeight !== "auto" ? outputHeight / pd : p.windowHeight;
    if (canvasWidth !== p.width || canvasHeight !== p.height) {
      if (!p.hasCanvas) {
        p.createCanvas(canvasWidth, canvasHeight, p.WEBGL);
        p.hasCanvas = true;
      } else {
        p.resizeCanvas(canvasWidth, canvasHeight);
      }
    }
  };
};

let p = new p5(sketch);

// https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
const params = new Proxy(new URLSearchParams(window.location.search), {
  get: (searchParams, prop) => searchParams.get(prop),
});
if (params.width && parseInt(params.width) > 0) p.specs.outputWidth = params.width;
if (params.height && parseInt(params.height) > 0) p.specs.outputHeight = params.height;
if (params.exhibit) p.specs.exhibit = params.exhibit === "true";

if (p.specs.exhibit) {
  p.options.ui.messages = {
    loading: "",
    welcome: "",
    running: "",
  };
}
