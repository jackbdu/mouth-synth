const soundManager = {
  synth: undefined,
  effect: undefined,
  notes: undefined,
  baseVolume: undefined,
  volumeAmount: undefined,
  startPercentage: undefined,
  detuneAmount: undefined,
  effectFrequencyAmount: undefined,
  harmonicityAmount: undefined,
  harmoncity: undefined,
  modulationAmount: undefined,
  modulationIndex: undefined,
  loaded: false,
  started: false,

  preload: function (options) {
    Tone.loaded().then(() => {
      this.loaded = true;
    });
  },

  setup: function (options) {
    this.synth = new Tone.FMSynth(options.synth).toDestination();
    this.baseVolume = options?.synth?.volume ?? -3;
    this.volumeAmount = options?.volumeAmount ?? 8;
    this.effect = new Tone.Vibrato(options.effect).toDestination();
    // this.effect = new Tone.Tremolo(options.effect).toDestination();
    this.synth.connect(this.effect);
    this.notes = options.noteIndices.map((index) => Tone.Frequency(options.midiScale[index], "midi"));
    this.detuneAmount = options?.detuneAmount ?? 256;
    this.effectFrequencyAmount = options?.effectFrequencyAmount ?? 8;
    this.harmoncity = options?.synth?.harmoncity ?? 3;
    this.harmonicityAmount = options?.harmonicityAmount ?? 16;
    this.modulationIndex = options?.modulationIndex ?? 10;
    this.modulationAmount = options?.modulationAmount ?? 10;
  },

  mousePressed: function () {
    if (this.loaded === true && this.started !== true) {
      Tone.start().then(() => {
        this.started = true;
        Tone.Transport.start();
      });
    }
  },

  getElementAtPercentage: function (elements, percentage) {
    const constrainedPercentage = p.constrain(percentage, 0, 1);
    const index = Math.floor(constrainedPercentage * (this.notes.length - 1));
    return elements[index];
  },

  triggerStart: function (percentage = 0.1) {
    this.startPercentage = percentage;
    const note = this.getElementAtPercentage(this.notes, percentage);
    if (this.started) this.synth.triggerAttack(note);
  },

  triggerEnd: function () {
    if (this.started) this.synth.triggerRelease();
  },

  changeVolume: function (percentage = 1) {
    const constrainedPercentage = p.constrain(percentage, 0, 1);
    // volume gain must be negative
    const volumeGain = -Math.abs(this.volumeAmount * p.log(constrainedPercentage));
    const volume = this.baseVolume + volumeGain;
    this.synth.volume.value = volume;
  },

  detune: function (percentage = 0) {
    const percentageOffset = percentage - this.startPercentage;
    const newDetune = percentageOffset * this.detuneAmount;
    this.synth.set({
      detune: newDetune,
    });
  },

  changeEffectFrequency: function (percentage = 0) {
    const percentageOffset = percentage - this.startPercentage;
    const newFrequency = Math.abs(percentageOffset * this.effectFrequencyAmount) + 1;
    this.effect.set({
      frequency: newFrequency,
    });
  },

  moveHarmonicity: function (percentage = 0) {
    const newHarmonicity = Math.abs(this.harmoncity + percentage * this.harmonicityAmount);
    this.synth.set({
      harmonicity: newHarmonicity,
    });
  },

  changeModulationIndex: function (percentage = 0) {
    const newModulationIndex = Math.abs(this.modulationIndex - percentage * this.modulationAmount);
    this.synth.set({
      modulationIndex: newModulationIndex,
    });
  },
};
