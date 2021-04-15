#!/bin/bash

# This script launches an RTSP server (using docker) and
# a WebSocket proxy for it.
# The script will stay in the foreground and when it exits
# the docker container will be killed too. The easiest way
# is to press Ctrl-c to exit the script (and docker container).

#
# launch the RTSP server
#
# To use the webcam, add the following options to the docker run command:
#   --privileged --device=/dev/video0:/dev/video0
# and then use the following RTSP launch pipeline to access the webcam:
#   'v4l2src ! videoconvert ! video/x-raw,width=1280,height=720 ! x264enc ! rtph264pay name=pay0 pt=96'
# It might be necessary to keep the webcam open by using e.g.
# VLC to play from it (to prevent the webcam from turning off).
#
# To use a different resolution, use a caps filter in the launch pipeline, e.g.:
#   'videotestsrc ! video/x-raw,width=1280,height=720 ! x264enc ! rtph264pay name=pay0 pt=96'

h264_pipeline="videotestsrc ! video/x-raw,width=1024,height=768 ! timeoverlay text='H.264' valignment=top halignment=left ! x264enc ! rtph264pay name=pay0 pt=96"
h264_port="8554"
mjpeg_pipeline="videotestsrc pattern=ball ! video/x-raw,width=1280,height=720 ! timeoverlay text='MJPEG' valignment=top halignment=left ! jpegenc ! rtpjpegpay name=pay0 pt=96"
mjpeg_port="8555"

if [ -z "$1" ]; then
  echo "serving H.264 video on rtsp://0.0.0.0:${h264_port}/test"
  h264_container1=$(docker run -d --rm -p ${h264_port}:8554 steabert/gst-rtsp-launch "$h264_pipeline")
#  h264_container2=$(docker run -d --rm -p 8555:8554 steabert/gst-rtsp-launch "$h264_pipeline")
#  h264_container3=$(docker run -d --rm -p 8556:8554 steabert/gst-rtsp-launch "$h264_pipeline")
#  h264_container4=$(docker run -d --rm -p 8557:8554 steabert/gst-rtsp-launch "$h264_pipeline")
#  h264_container5=$(docker run -d --rm -p 8558:8554 steabert/gst-rtsp-launch "$h264_pipeline")
#  h264_container6=$(docker run -d --rm -p 8559:8554 steabert/gst-rtsp-launch "$h264_pipeline")
#  h264_container7=$(docker run -d --rm -p 8560:8554 steabert/gst-rtsp-launch "$h264_pipeline")
#  h264_container8=$(docker run -d --rm -p 8561:8554 steabert/gst-rtsp-launch "$h264_pipeline")
#  h264_container9=$(docker run -d --rm -p 8562:8554 steabert/gst-rtsp-launch "$h264_pipeline")
#  container="${h264_container1} ${h264_container2} ${h264_container3} ${h264_container4} ${h264_container5} ${h264_container6} ${h264_container7} ${h264_container8} ${h264_container9}"
   container="${h264_container1}"
elif [ "$1" = "docker" ]; then
  echo "using default pipeline configured inside the docker container (port 8554)"
  container=$(docker run -d --rm -p 8554:8554 steabert/gst-rtsp-launch)
else
  echo "using user-specified launch pipeline: $1 (port 8554)"
  container=$(docker run -d --rm -p 8554:8554 steabert/gst-rtsp-launch "$1")
fi

if [ -z "${container}" ]; then
  echo "couldn't start docker container, make sure docker is running!"
  exit 1
fi

trap "docker kill ${container} >& /dev/null" EXIT

#
# launch the WebSocket proxy server
#
node $(dirname $0)/tcp-ws-proxy.js --port 8854 >& tcp-ws-proxy.log &

#
# print some usage information
#
cat <<EOF

To test if everything works, you can visit the above RTSP URI(s) with
a program like VLC or mpv (e.g. vlc rtsp://0.0.0.0:8554/test)

To use the servers with WsRtsp... type pipelines, use the config:
{ws: {uri: 'ws://hostname:8854'}, rtsp: {uri: rtsp://localhost:8554/test}}
(note: modify the port number of the RTSP URI as needed.)

If you are running the examples on the same computer, use localhost
as hostname for the websocket configuration, otherwise use e.g.
window.location.host to connect to the websocket server.
Note that the RTSP URI should always be localhost, since that connection
is made on this computer, where the proxy pipeline is running.
EOF

# Don't exit for 1000 hours
sleep 3600000
