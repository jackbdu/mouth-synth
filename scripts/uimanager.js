const uiManager = {
  font: undefined,
  messages: undefined,
  message: undefined,
  textColor: undefined,
  showFrameRate: undefined,
  refSize: undefined,

  preload: function (options) {
    this.font = p.loadFont(options.fontUrl);
    this.messages = {};
    this.messages.loading = options?.messages?.loading ?? "loading...";
    this.messages.welcome = options?.messages?.welcome ?? "welcome!";
    this.messages.running = options?.messages?.running ?? "";
    this.textColor = options?.textColor ?? "#fff";
    this.showFrameRate = options?.showFrameRate ?? false;
    // message won't be displayed because
    // 1. font is not loaded yet
    // 2. message is displayed in draw()
    this.message = this.messages.loading;
  },

  // todo: video takes even longer to load
  setup: function (canvasWidth, canvasHeight, options) {
    this.updateRefSize(canvasWidth, canvasHeight);
  },

  updateRefSize: function (canvasWidth, canvasHeight) {
    const canvasShort = p.min(canvasWidth, canvasHeight);
    this.refSize = canvasShort;
  },

  update: function (doneLoading, soundActivated, faceDetected) {
    if (doneLoading) this.message = this.messages.welcome;
    if (faceDetected && soundActivated) this.message = this.messages.running;
  },

  display: function () {
    this.displayMessage();
  },

  displayMessage: function () {
    const textSize = this.refSize / (this.message.length + 1);
    p.textFont(this.font);
    p.push();
    p.textSize(textSize);
    p.textAlign(p.CENTER, p.CENTER);
    p.fill(this.textColor);
    p.text(this.message, 0, 0);
    if (this.showFrameRate) {
      const frameRateTextSize = this.refSize / 16;
      p.textSize(frameRateTextSize);
      p.fill(255, 200);
      p.text(p.floor(p.frameRate()), 0, 100);
    }
    p.pop();
  },

  clearMessage() {
    this.message = "";
  },

  mousePressed() {
    this.clearMessage();
  },
};
