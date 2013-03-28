#!/usr/bin/env node

var optimist = require('optimist');
var util = require('./lib/util');
var burnJennicImage = require('./lib/burnJennicImage');

var USAGE = [
  "Burn Jennic Image",
  "",
  "1. If the kill argument is specified, executes the killall command ",
  "   with the specified process names on the remote host through Telnet.",
  "2. Uploads the specified image file and all the files from the specified",
  "   burner directory.",
  "3. Changes a mode of the burner utility files to executable.",
  "4. Runs the burner utility with the image file as the first argument.",
  "5. Deletes the image file and the burner utility files.",
  "6. If the reboot option is specified, executes the reboot command on",
  "   the remote host through Telnet.",
  "7. If a numeric value was specified for the reboot option, then the host",
  "   will be pinged until it responds or up to the specified number of seconds.",
  "",
  "NOTE: The burner utility directory must contain a jennic-burner.sh file,",
  "      which should burn a Jennic image file specified as the first argument",
  "      and then exit.",
  "",
  "Usage: jennic-burn-image.js [options] host"
];

var argv = optimist
  .usage(USAGE.join('\n'))
  .describe("user",   "string Remote user (default: root)")
  .describe("pass",   "string Remote password (default: root)")
  .describe("reboot", "number Reboot the device after all ops (default: -1)")
  .describe("kill",   "string Process to kill before burning")
  .describe("burner", "string Path to the burner utility (default: data/jennic-burner/)")
  .describe("image",  "string Path to the Jennic image")
  .argv;

if (argv._.length === 0)
{
  optimist.showHelp();
  util.errit("Host is required.");
}

var reboot = -1;

if (argv.reboot === true)
{
  reboot = 0;
}
else if (/^[0-9]+$/.test(argv.reboot))
{
  reboot = parseInt(argv.reboot);
}

burnJennicImage({
  host: argv._[0],
  user: argv.user,
  pass: argv.pass,
  pipe: true,
  kill: argv.kill,
  burner: argv.burner,
  image: argv.image,
  reboot: reboot
}, function(err)
{
  console.log();

  if (err)
  {
    console.error(err.message);
  }
  else
  {
    console.log("Done, bye!");
  }
});
