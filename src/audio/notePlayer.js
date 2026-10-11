export class NotePlayer {
  constructor() { this.context=null; }
  async play(notes,volume=.15) {
    if(!this.context) this.context=new (window.AudioContext||window.webkitAudioContext)();
    await this.context.resume();
    if(this.context.state==='closed') return;
    const now=this.context.currentTime;
    for(const midi of notes) {
      const voice=this.context.createOscillator(),gain=this.context.createGain();
      voice.type='triangle';voice.frequency.value=440*2**((midi-69)/12);
      gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume/Math.max(1,notes.length)),now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+.7);
      voice.connect(gain).connect(this.context.destination);voice.start(now);voice.stop(now+.75);
    }
  }
  close() {this.context?.close();}
}
