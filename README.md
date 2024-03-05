# Editor Extensions

The [toddle](https://toddle.dev?utm_source=github) editor previews a project in an iframe. In order to work with authenticated APIs, it's necessary to run a browser extension that helps setting cookies in the iframe. This is normally restricted by the browser since the editor and the iframe run on 2 different domains/origins.

This repository holds code for the 2 browser extensions - 1 for Chrome and 1 for Firefox.

## Features

The extension(s) are responsible for 2 things:

1. Copying cookies from the editor --> the iframe. This is useful when working with authenticated APIs where you're already logged in for instance.
2. Setting cookies in the iframe when (fetch) requests return [Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie) headers

## Contributing

Feel free to open an [issue](/issues) or a [PR](/pulls) if you find a bug/feature that you feel we should address. You can always reach out on [Discord](https://discord.com/invite/QcFjjXU3E7)
