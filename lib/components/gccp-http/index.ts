import * as events from "events"
import { Readable, Writable } from "stream"
import { parse } from "url"

import { Source } from '../component'
import { HttpRtspTunnel } from './tunnel'
import { Message, MessageType } from "../message"

type callback = () => void

export class HttpComponent extends Source {
  httpConnection: HttpRtspTunnel | null
  events: events.EventEmitter
  hostname: string
  port: number
  path: string
  connectionTimeout: number

  // Create a HTTP(S) component.
  // A HTTP(S) connection will be created from parsing the URL of the first outgoing message.
  constructor(connectionTimeout: number) {
    const incoming = new Readable({
      objectMode: true,
      read: () => { return },
    })
    const outgoing: any = new Writable({
      objectMode: true,
      write: () => { return },
    })
    super(incoming, outgoing)
    this.connectionTimeout = connectionTimeout
    this.hostname = ""
    this.port = 0
    this.path = ""
    this.httpConnection = null

    this.events = new events.EventEmitter()

    this.setupComponentEventHandlers()

    outgoing.write = (msg: Message, encoding: string, callback: Function) => {
      const dataBuffer = msg.data
      console.debug(Buffer.from(dataBuffer).toString())

      if (!this.httpConnection) {
        this.httpConnection = this.createHttpConnection(dataBuffer)
        this.initHttpConnection(msg, callback)
      } else
        this.httpConnection.sendCommand(msg.data).then(() => {
          if (callback) callback()
        }).catch((e: Error) => {
          console.error(`HTTPComponent ${this.hostname}:${this.port}: message lost during send:`, msg, e)
        })
    }
  }

  /**
   * Ends the http connection
   */
  // tslint:disable-next-line: newspaper-order
  end(cb: callback) {
    if (this.events) this.events.removeAllListeners()
    if (this.httpConnection)
      this.httpConnection.end(cb)
    else
      cb()
  }

  private createHttpConnection(firstRtspRequest: Buffer): HttpRtspTunnel {
    // Create httpConnection on first rtsp message, which looks like this:
    // `OPTIONS rtsp://192.168.0.3:554/axis-media/media.amp?resolution=176x144&fps=1 RTSP/1.0
    // CSeq: 1
    // Date: Wed, 03 Jun 2015 14:26:16 GMT
    // `
    const defaultHttpPort = 80
    const firstSpace = firstRtspRequest.indexOf(" ")
    const secondSpace = firstRtspRequest.indexOf(" ", firstSpace + 1)
    const url = firstRtspRequest.slice(firstSpace, secondSpace).toString("ascii")

    const parsedUrl = parse(url)
    this.hostname = parsedUrl.hostname!
    this.port = (parsedUrl.port) ? parseInt(parsedUrl.port) : defaultHttpPort
    this.path = parsedUrl.path!

    return new HttpRtspTunnel(this.hostname, this.port, this.path, this.connectionTimeout)
  }

  private setupComponentEventHandlers() {
    this.outgoing.on("error", (e: any) => {
      console.error(`HTTPComponent ${this.hostname}:${this.port}: error during TCP send, ignoring:`, e)
    })

    this.outgoing.on("finish", () => {
      if (this.httpConnection)
        this.httpConnection.end(() => { return })
    })

    this.incoming.on("error", (e: any) => {
      console.error(`HTTPComponent ${this.hostname}:${this.port}: closing HTTP connection due to incoming error`, e)
      this.httpConnection!.end(() => { return })
    })
  }

  private initHttpConnection(msg: Message, callback: Function) {
    this.httpConnection!.init().then(() => {
      this.setupHttpConnectionEvents()
      this.httpConnection!.sendCommand(msg.data).then(() => {
        typeof callback === "function" ? callback() : void 0
      }).catch((e: Error) => {
        console.error(`HTTPComponent ${this.hostname}:${this.port}:  message lost during send:`, msg, e)
      })
    }).catch((e: Error) => {
      console.error("connection refused", e)
      if (this.events)
        this.events.emit("error", e)
    })
  }

  private setupHttpConnectionEvents() {
    this.httpConnection!.once("disconnect", () => {
      if (this.events)
        this.events.emit("disconnect")
    })
    this.httpConnection!.on("timeout", () => {
      if (this.events)
        this.events.emit("timeout")
    })

    this.httpConnection!.onData((buffer: Buffer) => this.onData(buffer))
  }

  private onData(buffer: Buffer) {
    try {
      if (!this.incoming.push({ data: buffer, type: MessageType.RAW }))
        console.warn(`HTTPComponent ${this.hostname}:${this.port}: internal error: not allowed to push more data`)
    } catch (error) {
      if (this.events)
        this.events.emit("error", error)
    }
  }
}
