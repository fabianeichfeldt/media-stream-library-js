import { EventEmitter } from "events"
import * as _ from "lodash"
import { connect, Socket } from "net"
import { Readable, Writable } from "stream"
import { parse } from "url"

import { Source } from '../component'
import { Message, MessageType } from "../message"

type callback = () => void

export class TcpComponent extends Source {
  events: EventEmitter
  hostname?: string
  port?: number
  path?: string
  socket?: Socket

  // Create a HTTP(S) component.
  // A HTTP(S) connection will be created from parsing the URL of the first outgoing message.
  constructor(connectionTimeout: number) {
    const incoming = new Readable({
      objectMode: true,
      read: () => { return },
    })

    const outgoing: Writable = new Writable({
      objectMode: true,
      write: () => { return },
    })

    super(incoming, outgoing)

    outgoing.on("error", (e) => {
      console.error(`TCPComponent ${this.hostname}:${this.port}: error during TCP send, ignoring:`, e)
    })

    this.events = new EventEmitter()

    outgoing.on("finish", () => {
      if (!_.isNil(this.socket))
        this.socket.end()
    })

    incoming.on("error", (e) => {
      console.error(`TCPComponent ${this.hostname}:${this.port}: closing HTTP connection due to incoming error`, e)
      if (this.socket) this.socket.end()
    })

    outgoing.write = (msg: Message, callback: any) => {
      const dataBuffer = msg.data
      console.debug(Buffer.from(dataBuffer).toString())
      if (_.isNil(this.socket)) {
        // Create socket on first outgoing message
        // `OPTIONS rtsp://192.168.0.3:554/axis-media/media.amp?resolution=176x144&fps=1 RTSP/1.0
        // CSeq: 1
        // Date: Wed, 03 Jun 2015 14:26:16 GMT
        // `
        const firstSpace = dataBuffer.indexOf(" ")
        const secondSpace = dataBuffer.indexOf(" ", firstSpace + 1)
        const url = dataBuffer.slice(firstSpace, secondSpace).toString("ascii")
        const parsedUrl = parse(url)
        this.hostname = parsedUrl.hostname!
        this.port = _.isNil(parsedUrl.port) ? 554 : _.parseInt(parsedUrl.port)
        this.path = parsedUrl.path

        try {
          this.socket = connect(this.port, this.hostname)
        } catch (error) {
          console.error("refused ", error)
          if (!_.isNil(this.events))
            this.events.emit("error", error)
          return false
        }

        this.socket.on("error", (e) => {
          if (!_.isNil(this.events))
            this.events.emit("error", e)
        })

        // use this to detect the disconnect earlier than 80 seconds to disconnect event
        this.socket.setTimeout(connectionTimeout, () => {
          console.warn(`Timeout when connecting to ${this.hostname}:${this.port}`)
          if (!_.isNil(this.events)) {
            this.events.emit("timeout")
            this.incoming.emit("end")
          }
        })

        this.socket.on("data", (buffer) => {
          incoming.push({ data: buffer, type: MessageType.RAW })
        })
      }
      try {
        const encoding = undefined
        this.socket.write(msg.data, encoding, () => callback())
      } catch (error) {
        console.warn("message lost during send:", msg)
      }
      return true
    }
  }

  /**
   * Destroys all socket connections of this component and disables events
   */
  end(cb: callback) {
    console.debug("destroy tcpComponent")
    this.incoming.emit("end")
    if (!_.isNil(this.socket)) {
      this.socket.destroy()
      this.socket.end()
      this.socket.once("end", cb)
      this.socket.emit("end")
    } else
      cb()

    delete this.events
    delete this.socket
  }
}
