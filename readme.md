walkner-tools
=============

Helper tools for building custom devices based on Lantronix XPort Pro
and Jennic Wireless Microcontrollers.

## Requirements

### Linux

Tested on Ubuntu 10.04:

    Linux server 2.6.32-24-generic #43-Ubuntu SMP Thu Sep 16 14:58:24 UTC 2010 x86_64 GNU/Linux

### Lantronix XPort Pro Linux SDK

Tested on v2.0.0.2.

Available at: [http://lantronix.com/](http://lantronix.com/device-networking/embedded-device-servers/xport-pro-linux-dev-kit.html)

### `stdbuf`

`stdbuf` from [coreutils](http://www.gnu.org/software/coreutils/) must be
available in `$PATH`.

For older version of Ubuntu, one must manually download the sources,
uncompress, `./configure`, `make` and `make install`, because `stdbuf` might
not be available in `coreutils` package provided by the package manager.

### node.js

Version: v0.8.x

Available at: http://nodejs.org/

## Installation

Clone the repository, cd to its directory and execute `npm install`:

    git clone git://github.com/morkai/walkner-tools.git
    cd walkner-tools
    npm install

Optionally, all `.js` files in the root directory may be executables:

    cd walkner-tools
    chmod +x *.js

so the tools can be used without prefixing them with `node`
(i.e. `./lantronix-burn-image.js` instead of `node lantronix-burn-image.js`).

## Usage

Before using some tools (e.g. lantronix-burn-image), the Lantronix Linux SDK
environment must be set up:

    cd <path/to/lantronix/linux/sdk>
    . env_m68k-uclinux

Execute any of the tools with no arguments to display help, e.g.:

    node walkner-tools/lantronix-burn-image.js

## License

MIT License. See [license.md](https://raw.github.com/morkai/walkner-tools/master/license.md).
