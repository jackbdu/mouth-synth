const ml5Manager = {
  graphics: undefined,
  smoothness: undefined,
  loaded: undefined,
  faceMesh: undefined,
  faces: undefined,
  pfaces: undefined,
  upperLipIndex: undefined,
  lowerLipIndex: undefined,
  lipLeftIndex: undefined,
  lipRightIndex: undefined,
  lipInteriorLength: undefined,
  lipsDistance: undefined,
  lipsRotation: undefined,
  lipsTipHeadingX: undefined,
  lipsTipHeadingY: undefined,
  lipsStatus: undefined,
  plipsStatus: undefined,
  lipsIndices: undefined,
  lipsIndicesExterior: undefined,
  lipsIndicesInterior: undefined,
  lipsCloseThreshold: undefined,
  lipsOpenThreshold: undefined,
  refSize: undefined,
  placeholderFacesIsActive: undefined,
  idleVolumeFactor: undefined,
  // placeholderFaces: undefined,
  placeholderFaces: {
    sequence: [],
    frameCount: 0,
    framesPerFace: 5,
    index: 0,
    getNextFrame: function () {
      this.frameCount++;
      this.index = Math.floor(this.frameCount / this.framesPerFace);
      if (this.index >= Object.keys(this.sequence).length) {
        this.index = 0;
        this.frameCount = 0;
      }
      return this.sequence[this.index];
    },
  },

  preload: function (options) {
    this.placeholderFaces.sequence = p.loadJSON(options.placeholderFacesPath);
    // this.placeholderFaces = [p.loadJSON(options.placeholderFacePath)];
  },

  setup: function (canvasWidth, canvasHeight, options) {
    this.updateRefSize(canvasWidth, canvasHeight);
    this.lipsCloseThreshold = options?.lipsCloseThreshold ?? 8;
    this.lipsOpenThreshold = options?.lipsOpenThreshold ?? 16;
    this.idleVolumeFactor = options?.idleVolumeFactor ?? 0.5;
    // lips indices without repetition
    this.lipsIndices = [267, 312, 269, 311, 270, 310, 409, 415, 291, 308, 375, 324, 321, 318, 405, 402, 314, 317, 14, 17, 87, 84, 178, 181, 88, 91, 95, 146, 78, 61, 191, 185, 80, 40, 81, 39, 82, 37, 13, 0];
    // lips contour
    this.lipsIndicesExterior = [267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61, 185, 40, 39, 37, 0];
    this.lipsIndicesInterior = [13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 191, 80, 81, 82];
    this.upperLipIndex = 13;
    this.lowerLipIndex = 14;
    this.lipLeftIndex = 78;
    this.lipRightIndex = 308;
    this.lipInteriorLength = Infinity;
    this.loaded = false;
    this.faces = [];
    this.pfaces = [];
    this.lipsDistance = -Infinity;
    this.lipsRotation = 0;
    this.lipsStatus = "closed";
    this.plipsStatus = "closed";
    this.graphics = options.graphics;
    this.faceMesh = ml5.faceMesh(options.faceMesh, (faceMesh, error) => {
      if (error) {
        console.error(error);
      } else {
        this.loaded = true;
        faceMesh.detectStart(this.graphics, (results) => {
          this.updateFaces(results);
        });
      }
    });
    this.smoothness = options?.smoothness ?? 0.5;
    this.isDebugging = options?.isDebugging ?? false;
  },

  updateFaces: function (faces) {
    if (faces.length < 1) {
      this.placeholderFacesIsActive = true;
      const placeholderFaces = this.placeholderFaces.getNextFrame();
      faces = JSON.parse(JSON.stringify(placeholderFaces));
      // faces = JSON.parse(JSON.stringify(this.placeholderFaces));
    } else {
      this.placeholderFacesIsActive = false;
    }
    if (faces.length > 0 && this.faces.length > 0) {
      this.pfaces = this.faces;
      this.faces = this.smoothFaces(this.pfaces, faces, this.smoothness);
    } else if (faces.length > 0 && !this.faces.length > 0) {
      this.pfaces = faces;
      this.faces = this.smoothFaces(this.pfaces, faces, this.smoothness);
    }

    for (let face of this.faces) {
      face.lipsBox = this.getLipsBox(face.keypoints);
      face.lipsExterior = this.getKeypointsSubset(face.keypoints, this.lipsIndicesExterior);
      face.lipsInterior = this.getKeypointsSubset(face.keypoints, this.lipsIndicesInterior);
      if (this.isDebugging) this.drawKeypoints(face.keypoints);
      const upperLipKeypoint = face.keypoints[this.upperLipIndex];
      const lowerLipKeypoint = face.keypoints[this.lowerLipIndex];
      const upperLipVector3D = p.createVector(upperLipKeypoint.x, upperLipKeypoint.y, upperLipKeypoint.z);
      const lowerLipVector3D = p.createVector(lowerLipKeypoint.x, lowerLipKeypoint.y, lowerLipKeypoint.z);
      const lipsOpeningVector = upperLipVector3D.copy().sub(lowerLipVector3D);
      this.lipsDistance = lipsOpeningVector.mag();
      this.lipsRotation = lipsOpeningVector.heading() + Math.PI;
      if (this.lipsStatus === "closed" && this.lipsDistance > this.lipsOpenThreshold) {
        this.lipsStatus = "open";
        this.lipsOpened();
      } else if (this.lipsStatus === "open" && this.lipsDistance > this.lipsCloseThreshold) {
        this.lipsMovedWhileOpen();
      } else if (this.lipsStatus === "open" && this.lipsDistance < this.lipsCloseThreshold) {
        this.lipsStatus = "closed";
        this.lipsClosed();
      }

      const lipLeftKeypoint = face.keypoints[this.lipLeftIndex];
      const lipRightKeypoint = face.keypoints[this.lipRightIndex];
      const lipLeftVector3D = p.createVector(lipLeftKeypoint.x, lipLeftKeypoint.y, lipLeftKeypoint.z);
      const lipRightVector3D = p.createVector(lipRightKeypoint.x, lipRightKeypoint.y, lipRightKeypoint.z);
      const lipLengthVector = lipLeftVector3D.copy().sub(lipRightVector3D);
      this.lipInteriorLength = lipLengthVector.mag();

      const lipsCenterReferenceVector = p5.Vector.lerp(lipLeftVector3D, lipRightVector3D, 0.5);
      const lipsTipVector = p5.Vector.lerp(upperLipVector3D, lowerLipVector3D, 0.5);
      const LipsCenterRefToLipsTipVector = lipsTipVector.copy().sub(lipsCenterReferenceVector);
      this.lipsTipHeadingX = p.createVector(LipsCenterRefToLipsTipVector.x, LipsCenterRefToLipsTipVector.z).heading() + Math.PI / 2;
      this.lipsTipHeadingY = p.createVector(LipsCenterRefToLipsTipVector.y, LipsCenterRefToLipsTipVector.z).heading() + Math.PI / 2;
    }
  },

  update: function () {},

  display: function (options) {
    const meter = options?.meter ?? 0;
    const blurriness = options?.blurriness ?? 0;
    for (let face of this.faces) {
      p.push();
      const scaleX = (this.refSize / face.lipsBox.width) * options.lipsSize;
      const scaleY = (this.refSize / face.lipsBox.height) * options.lipsSize;
      const scale = scaleX > scaleY ? scaleY : scaleX;
      p.scale(scale);
      p.translate(-face.lipsBox.x, -face.lipsBox.y);
      if (blurriness > 0) {
        const glowingStrokeWeight = options?.glowingStrokeWeight ?? 0.02;
        const glowingStrokeColor = options?.glowingStrokeColor ?? options?.strokeColor ?? "#fff";
        this.drawLips(face.lipsExterior, { ...options, strokeWeight: glowingStrokeWeight, strokeColor: glowingStrokeColor });
        this.drawLips(face.lipsInterior, { ...options, strokeWeight: glowingStrokeWeight, strokeColor: glowingStrokeColor });
        p.filter(p.BLUR, Math.round(blurriness * this.refSize));
      }
      this.drawLips(face.lipsExterior, options);
      this.drawLips(face.lipsInterior, options);
      p.pop();
    }
  },

  smoothData: function (prevData, newData, prevScore, newScore, smoothness) {
    return (prevData * smoothness * prevScore + newData * (1 - smoothness) * newScore) / ((prevScore + newScore) / 2);
  },

  // only smoothes lips
  smoothFaces: function (pfaces, faces, smoothness) {
    for (let i = 0; i < faces.length; i++) {
      const face = faces[i];
      const pface = pfaces[i];
      const score = 1;
      const pscore = 1;
      const keypoints = face.keypoints;
      const pkeypoints = pface.keypoints;
      for (let j of this.lipsIndices) {
        const keypoint = keypoints[j];
        const pkeypoint = pkeypoints[j];
        faces[i].keypoints[j].x = this.smoothData(pkeypoint.x, keypoint.x, pscore, score, smoothness);
        faces[i].keypoints[j].y = this.smoothData(pkeypoint.y, keypoint.y, pscore, score, smoothness);
      }
    }
    return faces;
  },

  drawKeypoints: function (keypoints) {
    p.push();
    p.translate(-p.width / 2, -p.height / 2);
    p.stroke(0, 255, 0);
    p.beginShape(p.POINTS);
    for (let i = 0; i < keypoints.length; i++) {
      const keypoint = keypoints[i];
      p.vertex(keypoint.x, keypoint.y);
      p.textSize(10);
      p.fill(255);
      p.text(i, keypoint.x, keypoint.y);
    }
    p.endShape();
    p.pop();
  },

  getKeypointsSubset: function (keypoints, indices) {
    const keypointsSubset = [];
    for (let index of indices) {
      const keypoint = keypoints[index];
      keypointsSubset.push(keypoint);
    }
    return keypointsSubset;
  },

  drawLips: function (keypoints, options) {
    p.push();
    p.stroke(options.strokeColor);
    p.strokeWeight(options.strokeWeight * this.refSize);
    p.strokeJoin(p.ROUND);
    p.noFill();
    p.beginShape();
    for (let i = 0; i < keypoints.length + 3; i++) {
      const keypoint = keypoints[i % keypoints.length];
      p.curveVertex(keypoint.x, keypoint.y);
    }
    p.endShape();
    p.pop();
  },

  getLipsBox: function (keypoints) {
    const lipsBox = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
    for (let index of this.lipsIndices) {
      const keypoint = keypoints[index];
      if (keypoint.x < lipsBox.minX) lipsBox.minX = keypoint.x;
      if (keypoint.y < lipsBox.minY) lipsBox.minY = keypoint.y;
      if (keypoint.x > lipsBox.maxX) lipsBox.maxX = keypoint.x;
      if (keypoint.y > lipsBox.maxY) lipsBox.maxY = keypoint.y;
    }
    lipsBox.width = lipsBox.maxX - lipsBox.minX;
    lipsBox.height = lipsBox.maxY - lipsBox.minY;
    lipsBox.x = lipsBox.minX + lipsBox.width / 2;
    lipsBox.y = lipsBox.minY + lipsBox.height / 2;
    return lipsBox;
  },

  updateRefSize: function (canvasWidth, canvasHeight) {
    const canvasShort = p.min(canvasWidth, canvasHeight);
    this.refSize = canvasShort;
  },

  getLipsRotationPercentage: function () {
    return this.lipsRotation / Math.PI;
  },

  getLipsOpeningPercentage: function () {
    const lipsOpeningPercentage = p.constrain((this.lipsDistance / this.lipInteriorLength) * 2, 0, this.placeholderFacesIsActive ? this.idleVolumeFactor : 1);
    return lipsOpeningPercentage;
  },

  getLipsTipHeadingXPercentage: function () {
    return this.lipsTipHeadingX / Math.PI;
  },

  getLipsTipHeadingYPercentage: function () {
    return this.lipsTipHeadingY / Math.PI;
  },

  lipsClosed: function (event) {
    console.log("lipsClosed");
  },

  lipsOpened: function (event) {
    console.log("lipsOpened");
  },

  lipsMovedWhileOpen: function (event) {
    console.log("lipsMovedWhileOpen");
  },
};
