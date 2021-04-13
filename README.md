# Media Stream Library JS

[![Travis CI][travis-image]][travis-url]
[![NPM][npm-image]][npm-url]

[travis-image]: https://travis-ci.com/AxisCommunications/media-stream-library-js.svg?branch=master
[travis-url]: https://travis-ci.com/AxisCommunications/media-stream-library-js
[npm-image]: https://img.shields.io/npm/v/media-stream-library.svg
[npm-url]: https://www.npmjs.com/package/media-stream-library

Media Stream Library JS is an open-source JavaScript library to handle media
stream transforms for Node & the Web.
The primary purpose is to deal with RTP streams in a browser without
the need to use plugins or Flash, but relying on the [Media Source Extensions](https://www.w3.org/TR/media-source/) standard, which is supported in all modern browsers.

## Investigate browser memory consumption
This is a special branch for investigating and provoking memory leaks, like described here:
https://bugs.chromium.org/p/chromium/issues/detail?id=1174675&q=&can=5

### Installation and build
- install yarn as global tool:
```
npm i -g yarn
```  
- install dependencies  
```
yarn install
```  
- build repository  
```
yarn build
```  

### Run backend with rtsp video sources  
```
yarn rtsp
```

### Run http server to host frontend code
```
yarn examples
```
visit http://localhost:8080/test/h264.html and observe memory consumption over time  

  
# Original Readme
## Structure

The library contains a collection of components that can be connected
together to form media pipelines.
The components are a low-level abstraction on top of Node streams to allow two-way
communication, while media pipelines are sets of connected components with methods
that allow you to control the pipeline, and easily add/remove components.

Components can be categorized as:

- sources (socket, file, ...)
- transforms (parsers, depay, muxers, ...)
- sinks (HTML5 element, file, ...)

## Installation

Make sure you have Node installed on your machine.

Then, to install the library:

```
npm install media-stream-library
```

or if you are using `yarn`:

```
yarn add media-stream-library
```

## Usage

This library is not a full media player: the framework provides
no video controls, progress bar, or other features typically
associated with a media player. However, getting video to play
in the browser is quite easy (check the browser example).
There are currently no codecs included either, we rely on
browser support for that.

Although RTP streams is the main focus, the library is not limited
to handling RTP streams. Contributions of new components/pipelines are
always welcome.

You can directly include the `media-stream-library.min.js` file in your browser
(check the browser example):

```
<script src="media-stream-library.min.js"></script>
```

or import it into your javascript code:

```
import {components, pipelines} from 'media-stream-library';
```

Check the `examples` section to see how these can be used in practice.
To use the browser example, run:

```
npm run examples
```

or

```
yarn examples
```

## Contributing

Please read our [contributing guidelines](CONTRIBUTING.md) before making pull requests.

## Debugging

The easiest way to debug is to use a Node CLI pipeline (see examples) and
log what is happening to your component(s).

## Continuous integration

Automated tests are run on the master branch and pull requests with Travis CI.
When tags are pushed, an automated deploy will release to both Github and NPM.
Any tags that are prereleases will be tagged `next` for NPM.
Releases depend on access tokens that are encrypted.
In order to use a new access token, you can create one using the Github or NPM
web interface, and then encrypt it using the `travis` command line tool:

```sh
cd path/to/git/repo
travis encrypt <token>
```

and then copy-paste the secure string to the appropriate place in `.travis.yml`.
