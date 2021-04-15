const { pipelines, components } = window.mediaStreamLibrary

const play = (host) => {

  const grid = document.querySelector(".grid")
  for (let i = 0; i < 25; i++) {
    const div = document.createElement("div")
    div.setAttribute("class", "container")
    const video = document.createElement("video")
    video.setAttribute("class", "player")
    div.append(video)
    video.muted = true;
    video.autoplay = true;
    grid.append(div)
  }

  const mediaElements = document.querySelectorAll('video')
  const sinks = []
  for (let mediaElement of mediaElements)
    sinks.push(new components.MseSink(mediaElement));

  const initialPipeline = new pipelines.Html5VideoMultiplexPipeline({
    ws: { uri: `ws://${host}:${8854}/` },
    rtsp: { uri: `rtsp://rtsp-source:${8554}/test` },
    sinks: sinks
  })
  initialPipeline.ready.then(() => {
    initialPipeline.rtsp.play()
  })
}

play(window.location.hostname)
