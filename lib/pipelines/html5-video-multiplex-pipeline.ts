import { RtspMp4Pipeline } from './rtsp-mp4-pipeline'
import { RtspConfig } from '../components/rtsp-session'
import { WSConfig } from '../components/ws-source/openwebsocket'
import { Multiplexer } from '../components/multiplexer'
import { WSSource } from '../components/ws-source'
import { AuthConfig, Auth } from '../components/auth'
import { Sink } from '../components/component';

export interface Html5VideoMultiplexConfig {
  ws?: WSConfig
  rtsp?: RtspConfig
  auth?: AuthConfig
  sinks: Sink[]
}

/**
 * Pipeline that can receive H264/AAC video over RTP
 * over WebSocket and pass it to a video element.
 *
 * @class Html5VideoMultiplexPipeline
 * @extends {RtspMp4Pipeline}
 */
export class Html5VideoMultiplexPipeline extends RtspMp4Pipeline {
  public onServerClose?: () => void
  public ready: Promise<void>

  public src?: WSSource
  public sink: Multiplexer

  /**
   * Creates an instance of Html5VideoMultiplexPipeline.
   * @param {any} [config={}] Component options
   * @memberof Html5VideoMultiplexPipeline
   */
  constructor(config: Html5VideoMultiplexConfig) {
    const {
      ws: wsConfig,
      rtsp: rtspConfig,
      auth: authConfig,
    } = config

    super(rtspConfig)

    if (authConfig) {
      const auth = new Auth(authConfig)
      this.insertBefore(this.rtsp, auth)
    }

    this.sink = new Multiplexer()
    this.sink.sinks = config.sinks;
    this.append(this.sink)

    const waitForWs = WSSource.open(wsConfig)
    this.ready = waitForWs.then(wsSource => {
      wsSource.onServerClose = () => {
        this.onServerClose && this.onServerClose()
      }
      this.prepend(wsSource)
      this.src = wsSource
    })
  }

  close() {
    this.src && this.src.outgoing.end()
  }
}
