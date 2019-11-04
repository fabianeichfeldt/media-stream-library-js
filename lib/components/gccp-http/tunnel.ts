import { EventEmitter } from "events"
import { connect, Socket } from "net"
import * as tls from "tls"
import * as uuid from "uuid/v4"

type onDataType = (buffer: any) => void
type callback = () => void

export class HttpRtspTunnel extends EventEmitter {
  ip: string
  port: number
  path: string
  connectionTimeout: number
  socketPost: tls.TLSSocket | Socket | null = null
  socketGet: tls.TLSSocket | Socket | null = null
  sessionId: string = ""
  onData: onDataType = () => { }

  constructor(ip: string, port: number, path: string, connectionTimeout: number) {
    super()
    this.ip = ip
    this.port = port
    this.path = path
    this.connectionTimeout = connectionTimeout
  }

  /**
   * Initializes the http connection to the camera to tunnel the rtsp data   *
   */
  init() {
    this.sessionId = uuid.default()
    return this.initGet().then(() => {
      return this.initPost()
    })
  }

  /**
   * Sends a rtsp command to the camera.
   * @example OPTIONS rtsp://192.168.0.3:554/axis-media/media.amp?resolution=176x144&fps=1 RTSP/1.0
   * @param command
   */
  // tslint:disable-next-line: newspaper-order
  sendCommand(command: Buffer) {
    const buffer = Buffer.from(command)
    const encodedCommand = buffer.toString("base64")
    if (this.socketPost)
      this.socketPost.write(encodedCommand)
    return new Promise((resolve, reject) => {
      if (this.socketGet)
        this.socketGet.once("data", (data) => {
          resolve()
        })
      else
        reject()
    })
  }

  /**
   * Closes and destroys the httpConnections to the camera properly
   */
  end(cb: callback) {
    console.debug("destroy httpRtpsTunnel")
    const postPromise = new Promise((resolve, reject) => {
      if (this.socketPost != null) {
        this.socketPost.end(resolve)
        this.socketPost.destroy()
      }
      resolve()
    })

    const getPromise = new Promise((resolve, reject) => {
      if (this.socketGet != null) {
        this.socketGet.end(resolve)
        this.socketGet.destroy()
      }
      resolve()
    })

    Promise.all([getPromise, postPromise]).then(cb)
  }

  private initGet() {
    return new Promise((resolve, reject) => {
      this.socketGet = this.connect()
      this.socketGet.once("error", (e) => {
        this.socketGet!.destroy()
        reject(e)
      })

      // timeout must be set only for this channel,
      // because the POST channel is just used for commands to the cam, which don't need to send regularly
      this.socketGet.setTimeout(this.connectionTimeout, () => {
        console.warn(`timeout @${this.ip}:${this.port}`)
        this.emit("timeout")
      })
      this.socketGet.once("connect", () => {
        console.info(`HttpRtspTunnel ${this.ip}:${this.port} GET connection established`)
        this.socketGet!.once("data", (data) => {
          this.onData = (fn: onDataType) => {
            this.socketGet!.on("data", fn)
          }
          resolve()
        })
        const command =
          `GET ${this.path} HTTP/1.0\r\n` +
          "CSeq: 1\r\n" + "User-Agent: GCCP\r\n" +
          "Accept: application/x-rtsp-tunnelled\r\n" +
          `x-sessioncookie: ${this.sessionId}\r\n` +
          "Connection: keep-alive\r\n" +
          "Pragma: no-cache\r\n" +
          "Cache-Control: no-cache\r\n\r\n"
        this.socketGet!.write(command)
      })
    })
  }

  private initPost() {
    return new Promise((resolve, reject) => {
      this.socketPost = this.connect()
      this.socketPost.once("error", (e) => {
        this.socketPost!.destroy()
        reject(e)
      })
      this.socketPost.once("connect", () => {
        console.info("POST connection established ")
        const command =
          `POST ${this.path} HTTP/1.0\r\n` +
          "CSeq: 1\r\n" + "User-Agent: GCCP\r\n" +
          `x-sessioncookie: ${this.sessionId}\r\n` +
          "Content-Type: application/x-rtsp-tunnelled\r\n" +
          "Pragma: no-cache\r\n" +
          "Cache-Control: no-cache\r\n" +
          "Content-Length: 32767\r\n" +
          "Expires: Sun, 9 Jan 1972 00:00:00 GMT\r\n\r\n"

        this.socketPost!.write(command, resolve)
      })
    })
  }

  private connect() {
    const defaultHttpsPort = 443

    let socket: tls.TLSSocket | Socket
    if (this.port === defaultHttpsPort)
      socket = tls.connect(this.port, this.ip)
    else
      socket = connect(this.port, this.ip)

    socket.once("close", () => {
      socket.destroy()
      this.emit("disconnect")
    })
    return socket
  }
}
