const { pipelines } = window.mediaStreamLibrary

const play = host => {
  // Grab a reference to the video element
  const mediaElements = document.querySelectorAll('video')

  let i=0;
  for(let mediaElement of mediaElements) {
    // Setup a new pipeline
    const pipeline = new pipelines.Html5VideoPipeline({
      ws: { uri: `ws://${host}:${8854 + i}/` },
      rtsp: { uri: `rtsp://localhost:${8554 + i}/test` },
      mediaElement,
    })
    i++;
    pipeline.ready.then(() => {
      pipeline.rtsp.play()
    })
  }
}

play(window.location.hostname)
