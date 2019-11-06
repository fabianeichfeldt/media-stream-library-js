import * as _ from 'lodash'

import { RtspPipeline } from './rtsp-pipeline'
import { Auth, AuthConfig } from '../components/auth'
import { HttpComponent } from '../components/gccp-http'
import { TcpComponent } from '../components/gccp-tcp'

export class GccpRtspPipelineConfig {
  auth?: AuthConfig
  rtsp: { uri: string } = { uri: '' }
  reconnectInterval = 3000
  connectionTimeout = 10000
}

type callback = () => void

export class GccpRtspPipeline extends RtspPipeline {
  protected _reconnectInterval: number
  protected _connectionTimeout: number
  protected _tcpSource: HttpComponent | TcpComponent
  protected _stopped: boolean

  //  * Create a pipeline which is a linked list of components.
  //  * Works naturally with only a single component.
  //  * @param {Array} components The ordered components of the pipeline
  constructor(config: GccpRtspPipelineConfig) {
    const cloneConfig = _.cloneDeep(config)
    const originalUri = _.cloneDeep(config.rtsp.uri)
    // replace http or https with rtsp
    cloneConfig.rtsp.uri = _.replace(
      cloneConfig.rtsp.uri,
      /https?:\/\//,
      'rtsp://',
    )

    super(cloneConfig.rtsp)

    this._stopped = false
    // interval for trying to reconnect the cam
    this._reconnectInterval = cloneConfig.reconnectInterval
    // send timeout signal after this time when cam doesn't send data anymore
    this._connectionTimeout = cloneConfig.connectionTimeout

    this._tcpSource = this.createConnectionToCamera(originalUri)
    this.prepend(this._tcpSource)

    if (cloneConfig.auth) {
      const authComp = new Auth(cloneConfig.auth)
      this.insertBefore(this.rtsp, authComp)
    }
  }

  createConnectionToCamera(uri: string) {
    let tcpSource: HttpComponent | TcpComponent
    // if rtsp is tunneled over http, use http component,
    // but rtsp component still gets a rtsp uri
    if (uri.startsWith('http'))
      tcpSource = new HttpComponent(this._connectionTimeout)
    else if (uri.startsWith('rtsp'))
      tcpSource = new TcpComponent(this._connectionTimeout)
    else
      throw new Error(
        `Couldn't create a pipeline for stream ${uri}, no implementation for this protocol.`,
      )

    if (!_.isNil(tcpSource.events)) {
      tcpSource.events.on('error', () => this.handleConnectionError(uri))
      tcpSource.events.on('disconnect', () => this.handleConnectionError(uri))
      tcpSource.events.on('timeout', () => this.handleConnectionError(uri))
    }
    return tcpSource
  }

  end(cb: callback) {
    console.debug(`shutdown RtspWsServer pipline ${this.rtsp.uri}`)
    this._stopped = true
    this.rtsp.stop()

    const closeTcp = new Promise((resolve, reject) => {
      if (this._tcpSource) this._tcpSource.end(resolve)
      else resolve()
    })

    Promise.all([closeTcp]).then(cb)
  }

  protected handleConnectionError(uri: string): void {
    if (this._stopped) {
      this._tcpSource.end(() => {
        return
      })
      return
    }

    console.error('lost connection to camera... try to reconnect...')
    setTimeout(() => {
      this._tcpSource.end(() => {
        this.remove(this._tcpSource)
        this._tcpSource = this.createConnectionToCamera(uri)
        this.prepend(this._tcpSource)
        this.rtsp._reset()
        this.rtsp.play()
      })
    }, this._reconnectInterval)
  }
}
