const { pipelines, components } = window.mediaStreamLibrary

const play = host => {
  // Grab a reference to the video element
  const mediaElements = document.querySelectorAll('video')
  const sinks = []
  for(let mediaElement of mediaElements)
    sinks.push(new components.MseSink(mediaElement));

  const initialPipeline = new pipelines.Html5VideoMultiplexPipeline({
    ws: { uri: `ws://${host}:${8854}/` },
    rtsp: { uri: `rtsp://localhost:${8554}/test` },
    sinks: sinks
  })
  initialPipeline.ready.then(() => {
    initialPipeline.rtsp.play()
  })
}

play(window.location.hostname)
