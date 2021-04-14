import { Sink } from '../component'
import { Writable, Readable } from 'stream'
import { Message } from '../message'

export class Multiplexer extends Sink {
  public sinks: Sink[]

  constructor() {
    /**
     * Set up an incoming stream and attach it to the sourceBuffer.
     * @type {Writable}
     */
    const incoming = new Writable({
      objectMode: true,
      write: (msg: Message, encoding, callback) => {
        for(let sink of this.sinks) {
          sink.incoming.write(msg, encoding)
        }
        callback()
      },
    })

    /**
     * Set up outgoing stream.
     * @type {Writable}
     */
    const outgoing = new Readable({
      objectMode: true,
      read: function() {
        //
      },
    })

    // When an error is sent on the outgoing stream, whine about it.
    outgoing.on('error', () => {
      console.warn('outgoing stream broke somewhere')
    })

    /**
     * initialize the component.
     */
    super(incoming, outgoing)
    this.sinks = [];
  }
}
