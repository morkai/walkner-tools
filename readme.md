# walkner-tools

Helper tools for building custom devices based on Lantronix XPort Pro
and Jennic Wireless Microcontrollers.

## Requirements

### Linux

Tested on Ubuntu 10.04:

```
Linux server 2.6.32-24-generic #43-Ubuntu SMP Thu Sep 16 14:58:24 UTC 2010 x86_64 GNU/Linux
```

### Lantronix XPort Pro Linux SDK

The XPort Pro Linux Software Developer’s Kit (SDK) is an embedded hardware and
software suite that allows Linux developers to easily create value-added
applications on Lantronix’ embedded networking module.

  * __Version__: 2.0.0.x
  * __Website__: http://lantronix.com/
  * __Download__: http://lantronix.com/device-networking/embedded-device-servers/xport-pro-linux-dev-kit.html
  * __Installation guide__: http://www.lantronix.com/support/downloads/?p=XPORTPRO

### stdbuf

`stdbuf` from [coreutils](http://www.gnu.org/software/coreutils/) must be
available in `$PATH`.

For older version of Ubuntu, one must manually download the sources,
uncompress, `./configure`, `make` and `make install`, because `stdbuf` might
not be available in `coreutils` package provided by the package manager.

### node.js

Node.js is a server side software system designed for writing scalable
Internet applications in JavaScript.

  * __Version__: 0.8.x
  * __Website__: http://nodejs.org/
  * __Download__: http://nodejs.org/download/
  * __Installation guide__: https://github.com/joyent/node/wiki/Installation

## Installation

Clone the repository, cd to its directory and execute `npm install`:

```
git clone git://github.com/morkai/walkner-tools.git
cd walkner-tools
npm install
```

Optionally, all `.js` files in the root directory may be executables:

```
cd walkner-tools
chmod +x *.js
```

so the tools can be used without prefixing them with `node`
(i.e. `./lantronix-burn-image.js` instead of `node lantronix-burn-image.js`).

## Usage

Before using some tools (e.g. lantronix-burn-image), the Lantronix Linux SDK
environment must be set up:

```
cd <path/to/lantronix/linux/sdk>
. env_m68k-uclinux
```

Execute any of the tools with no arguments to display help, e.g.:

```
node walkner-tools/lantronix-burn-image.js
```

## License

walkner-tools is released under the [MIT License](https://github.com/morkai/walkner-tools/blob/master/license.md).

Copyright (c) 2014, Łukasz Walukiewicz (lukasz@walukiewicz.eu).
