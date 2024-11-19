const videoManager = {
  capture: undefined,
  captureGraphics: undefined,
  pixelationSourceGraphics: undefined,
  pixelationShortSideNum: undefined,
  loaded: undefined,

  setup: function (canvasWidth, canvasHeight, options) {
    this.pixelationShortSideNum = options?.pixelationShortSideNum ?? 16;
    this.width = options?.width ?? 640;
    this.height = options?.height ?? 480;
    this.updateDimensions(canvasWidth, canvasHeight, options);
    this.loaded = false;
    this.capture = p.createCapture(options.video, { flipped: options.flipped }, () => {
      this.loaded = true;
    });
    this.capture.hide();
  },

  update: function (options) {
    this.captureGraphics.push();
    this.captureGraphics.image(this.capture, 0, 0, this.captureGraphics.width, this.captureGraphics.height, 0, 0, this.capture.width, this.capture.height, options.fit);
    this.captureGraphics.pop();
  },

  display: function (options) {
    p.push();
    p.translate(-p.width / 2, -p.height / 2);
    this.imagePixelated(this.captureGraphics, this.pixelationSourceGraphics, options);
    p.pop();
  },

  updateDimensions: function (canvasWidth, canvasHeight, options) {
    if (this.captureGraphics === undefined) this.captureGraphics = p.createGraphics(this.width, this.height);
    this.captureGraphics.pixelDensity(1);

    let pixelationRowsNum;
    let pixelationColsNum;
    if (canvasWidth > canvasHeight) {
      pixelationRowsNum = Math.floor(this.pixelationShortSideNum);
      pixelationColsNum = Math.floor((this.pixelationShortSideNum * canvasWidth) / canvasHeight);
    } else {
      pixelationColsNum = Math.floor(this.pixelationShortSideNum);
      pixelationRowsNum = Math.floor((this.pixelationShortSideNum * canvasHeight) / canvasWidth);
    }
    this.pixelationSourceGraphics ? this.pixelationSourceGraphics.resizeCanvas(pixelationColsNum, pixelationRowsNum) : (this.pixelationSourceGraphics = p.createGraphics(pixelationColsNum, pixelationRowsNum));
    this.pixelationSourceGraphics.pixelDensity(1);
  },

  // draw image as pixelated image (use smaller graphics, this cause blurry edges)
  imagePixelated: function (sourceImg, tempPixelatedGraphics, options = {}) {
    // todo: this might be intialized in setup so it does not recreate new graphics every frame
    const rows = tempPixelatedGraphics.height;
    const cols = tempPixelatedGraphics.width;
    tempPixelatedGraphics.push();

    tempPixelatedGraphics.image(sourceImg, 0, 0, tempPixelatedGraphics.width, tempPixelatedGraphics.height, 0, 0, sourceImg.width, sourceImg.height, p.COVER);
    tempPixelatedGraphics.loadPixels();
    tempPixelatedGraphics.pop();

    const colWidth = p.width / cols;
    const rowHeight = p.height / rows;
    p.background(options.backgroundColor);
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const x = c * colWidth + colWidth / 2;
        const y = r * rowHeight + rowHeight / 2;
        const index = 4 * (p.floor(tempPixelatedGraphics.width) * r + c);
        const valueRed = tempPixelatedGraphics.pixels[index];
        const valueGreen = tempPixelatedGraphics.pixels[index + 1];
        const valueBlue = tempPixelatedGraphics.pixels[index + 2];
        const valueAlpha = tempPixelatedGraphics.pixels[index + 3];
        const colorPixel = p.color(valueRed, valueGreen, valueBlue, valueAlpha);
        p.noStroke();
        p.fill(colorPixel);
        // ellipses
        if (options.pixelationStyle === 1) {
          p.ellipseMode(p.CENTER);
          p.ellipse(x, y, p.ceil(colWidth), p.ceil(rowHeight));
          // ellipses in varied sizes
        } else if (options.pixelationStyle === 2) {
          const factorSize = p.lightness(colorPixel) / colorPixel.maxes.hsl[2];
          p.ellipseMode(p.CENTER);
          p.ellipse(x, y, p.ceil(colWidth * factorSize), p.ceil(rowHeight) * factorSize);
          // rectangles with varied corners
        } else if (options.pixelationStyle === 3) {
          const factorCorner = p.lightness(colorPixel) / colorPixel.maxes.hsl[2];
          p.rectMode(p.CENTER);
          p.rect(x, y, p.ceil(colWidth), p.ceil(rowHeight), (factorCorner * p.min(colWidth, rowHeight)) / 2);
          // rectangles
        } else if (options.pixelationStyle === 4) {
          // customization
          const numFeaturesMax = options.numFeaturesMax ?? 16;
          // console.log(options);
          const numVertices = 256;
          const amp = 0.3;

          const factorFeatures = p.lightness(colorPixel) / colorPixel.maxes.hsl[2];
          const numFeatures = p.floor(numFeaturesMax * factorFeatures);
          const vertices = this.generateFlowerVertices(numFeatures, numVertices, amp);
          p.push();
          p.translate(x, y);
          p.beginShape();
          for (let vtx of vertices) {
            p.vertex(vtx.x * colWidth, vtx.y * rowHeight);
          }
          p.endShape();
          p.pop();
        } else if (options.pixelationStyle === 5) {
          // customization
          const numFeaturesMax = options.numFeaturesMax ?? 16;
          const numVertices = 64;
          const amp = 0.4;

          const factorFeatures = p.lightness(colorPixel) / colorPixel.maxes.hsl[2];
          const numFeatures = p.floor(numFeaturesMax * factorFeatures);
          const vertices = this.generateStarVertices(numFeatures, numVertices, amp);
          p.push();
          p.translate(x, y);
          p.beginShape();
          for (let vtx of vertices) {
            p.vertex(vtx.x * colWidth, vtx.y * rowHeight);
          }
          p.endShape();
          p.pop();
        } else {
          p.rectMode(p.CENTER);
          p.rect(x, y, p.ceil(colWidth), p.ceil(rowHeight));
        }
      }
    }
    p.fill(options.overlayColor);
    p.rect(0, 0, p.width, p.height);
  },

  generateFlowerVertices: function (numPeriods, numVertices, amp) {
    const vertices = [];
    const angleOffest = 0;
    for (let k = 0; k < numVertices; k++) {
      const angle = (k / numVertices) * p.TWO_PI + angleOffest;
      const radius = p.map(p.sin(angle * numPeriods), -1, 1, 0.5 - amp / 2, 0.5);
      const vtx = p.createVector(radius * p.sin(angle), radius * p.cos(angle));
      vertices.push(vtx);
    }
    return vertices;
  },

  generateStarVertices: function (numPoints, numVertices, amp = 1) {
    const vertices = [];
    const angleOffset = 0;
    for (let k = 0; k < numVertices; k++) {
      const numSegments = numPoints * 2;
      const index = p.constrain(p.floor(k / p.floor(numVertices / numSegments)), 0, numSegments - 1);
      const radius = p.map(index % 2, 0, 1, 0.5 - amp / 2, 0.5);
      const angle = (index / numSegments) * p.TWO_PI + angleOffset;
      const vtx = p.createVector(radius * p.sin(angle), radius * p.cos(angle));
      vertices.push(vtx);
    }
    return vertices;
  },
};
