var fs = require('fs');
var util = require('./util');
var ProcessTasks = require('./ProcessTasks');
var LantronixTelnetTasks = require('./LantronixTelnetTasks');
var manageLantronixFiles = require('./manageLantronixFiles');

module.exports = burnJennicImage;

var BURNING_TIMEOUT = 5 * 60 * 1000;
var REMOTE_IMAGE_FILE = 'jennic-burner-image.bin';
var BURNER_DIRECTORY = __dirname + '/../data/jennic-burner';
var BURNER_START_SCRIPT = 'jennic-burner.sh';

/**
 * @param {object} options
 * @param {string} options.host
 * @param {string} options.image
 * @param {string=} options.user
 * @param {string=} options.pass
 * @param {string=} options.kill
 * @param {string=} options.burner
 * @param {number=} options.reboot
 * @param {boolean=} options.pipe
 * @param {function(?Error)=} done
 */
function burnJennicImage(options, done)
{
  var kill = Array.isArray(options.kill) ? options.kill : [options.kill];
  var upload = {};
  var chmod = {};
  var burnerFiles;
  var burnerDirectory = options.burner || BURNER_DIRECTORY;

  if (burnerDirectory[burnerDirectory.length - 1] !== '/')
  {
    burnerDirectory += '/';
  }

  try
  {
    burnerFiles = fs.readdirSync(burnerDirectory);
    burnerFiles.forEach(function(burnerFile)
    {
      upload[burnerDirectory + burnerFile] = burnerFile;
      chmod[burnerFile] = '0700';
    });

    if (burnerFiles.indexOf(BURNER_START_SCRIPT) === -1)
    {
      return done(new Error(
        "No jennic-burner.sh script in the burner directory: %s",
        burnerDirectory
      ));
    }
  }
  catch (err)
  {
    return done(err);
  }

  upload[options.image] = REMOTE_IMAGE_FILE;

  manageLantronixFiles({
    host: options.host,
    user: options.user,
    pass: options.pass,
    pipe: options.pipe,
    kill: kill,
    upload: upload,
    chmod: chmod
  }, function(err)
  {
    if (err)
    {
      return done(err);
    }

    burnImage(options, done, burnerFiles);
  });
}

function burnImage(options, done, burnerFiles)
{
  var telnet = new LantronixTelnetTasks({
    host: options.host,
    user: options.user,
    pass: options.pass
  });

  telnet.on('timeout', function(task)
  {
    telnet.kill();

    done && done(new Error(util.format(
      "Telnet task timed out: %s", task.name
    )));
  });

  if (options.pipe)
  {
    telnet.pipeStdio();
  }

  telnet.add({
    name: "Burn image",
    expect: "/ #",
    timeout: BURNING_TIMEOUT,
    action: util.format(
      "/mnt/flash/%s /mnt/flash/%s\n",
      BURNER_START_SCRIPT,
      REMOTE_IMAGE_FILE
    )
  });

  telnet.add({
    name: "Check status",
    expect: /(end of programming|\/ #)/,
    action: "\n"
  });

  telnet.addExitTask(function()
  {
    cleanUp(options, done, burnerFiles);
  });
}

function cleanUp(options, done, burnerFiles)
{
  manageLantronixFiles({
    host: options.host,
    user: options.user,
    pass: options.pass,
    pipe: options.pipe,
    delete: [REMOTE_IMAGE_FILE].concat(burnerFiles),
    reboot: options.reboot
  }, done);
}
