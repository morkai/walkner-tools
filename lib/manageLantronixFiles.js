var path = require('path');
var step = require('step');
var FTP = require('ftp');
var util = require('./util');
var ProcessTasks = require('./ProcessTasks');
var LantronixTelnetTasks = require('./LantronixTelnetTasks');
var rebootLantronix = require('./rebootLantronix');

module.exports = manageLantronixFiles;

var ROOT_DIR = '/mnt/flash';
var DEFAULT_FTP_USER = 'root';
var DEFAULT_FTP_PASS = 'root';

/**
 * @param {object} options
 * @param {string} options.host
 * @param {string=} options.user
 * @param {string=} options.pass
 * @param {number=} options.reboot
 * @param {Array.<string>=} options.kill
 * @param {Array.<string>=} options.delete
 * @param {object.<string, string>=} options.upload
 * @param {Object.<string, string>=} options.chmod
 * @param {boolean=} options.pipe
 * @param {function(?Error)=} done
 */
function manageLantronixFiles(options, done)
{
  setUpOptions(options);

  var telnet = new LantronixTelnetTasks({
    host: options.host,
    user: options.user,
    pass: options.pass
  });

  if (options.pipe)
  {
    telnet.pipeStdio();
  }

  telnet.on('timeout', function(task)
  {
    telnet.kill();

    done && done(new Error("Telnet task timed out: " + task.name));
  });

  options.kill.forEach(function(processName)
  {
    telnet.add({
      name: "Kill process " + processName,
      expect: "/ #",
      action: "killall " + processName + "\n"
    })
  });

  options.delete.forEach(function(remoteFile)
  {
    telnet.add({
      name: "Delete file " + remoteFile,
      expect: "/ #",
      action: util.format('rm -r "%s/%s"\n', ROOT_DIR, remoteFile)
    });
  });

  getDirectories(options.upload).forEach(function(dirname)
  {
    telnet.add({
      name: "Create directory " + dirname,
      expect: "/ #",
      action: util.format('mkdir -p "%s"\n', dirname)
    });
  });

  telnet.addExitTask(function()
  {
    connectToFtp(options, done);
  });
}

function setUpOptions(options)
{
  if (typeof options.reboot !== 'number')
  {
    options.reboot = -1;
  }

  if (!Array.isArray(options.kill))
  {
    options.delete = [];
  }

  if (!Array.isArray(options.delete))
  {
    options.delete = [];
  }

  options.delete = options.delete
    .map(normalizeRemoteFile)
    .filter(function(file) { return file.length > 0; });

  if (typeof options.upload !== 'object' || options.upload === null)
  {
    options.upload = {};
  }

  for (var localFile in options.upload)
  {
    if (options.upload.hasOwnProperty(localFile))
    {
      var remoteFile = normalizeRemoteFile(options.upload[localFile]);

      if (remoteFile.length === 0)
      {
        remoteFile = path.basename(remoteFile);
      }

      options.upload[localFile] = remoteFile;
    }
  }

  if (typeof options.chmod !== 'object' || options.chmod === null)
  {
    options.chmod = {};
  }

  var newChmod = {};

  for (var oldRemoteFile in options.chmod)
  {
    if (options.chmod.hasOwnProperty(oldRemoteFile))
    {
      var newRemoteFile = normalizeRemoteFile(oldRemoteFile);

      newChmod[newRemoteFile] = options.chmod[oldRemoteFile];
    }
  }

  options.chmod = newChmod;
}

/**
 * @private
 * @param {string} file
 * @return {string}
 */
function normalizeRemoteFile(file)
{
  return file[0] === '/' ? file.substr(1) : file;
}

/**
 * @private
 * @param {object.<string, string>} uploads
 * @return {Array.<string>}
 */
function getDirectories(uploads)
{
  var dirs = [];

  for (var localFile in uploads)
  {
    if (!uploads.hasOwnProperty(localFile))
    {
      continue;
    }

    var remoteFile = uploads[localFile];

    if (remoteFile.indexOf('/') === -1)
    {
      continue;
    }

    dirs.push(ROOT_DIR + '/' + path.dirname(remoteFile));
  }

  return dirs;
}

/**
 * @private
 * @param {object} options
 * @param {function(?Error)=} done
 */
function connectToFtp(options, done)
{
  if (Object.keys(options.upload).length === 0)
  {
    chmodFiles(options, done);
    return;
  }

  var ftp = new FTP();

  ftp.on('error', function(err)
  {
    done && done(err);
  });

  ftp.on('greeting', function(msg)
  {
    if (options.pipe)
    {
      process.stdout.write(msg);
      process.stdout.write('\n');
    }
  });

  ftp.on('ready', function()
  {
    uploadFiles(ftp, options, done);
  });

  ftp.connect({
    host: options.host,
    user: options.user || DEFAULT_FTP_USER,
    password: options.pass || DEFAULT_FTP_PASS
  });
}

/**
 * @private
 * @param {FTP} ftp
 * @param {object} options
 * @param {function(?Error)=} done
 */
function uploadFiles(ftp, options, done)
{
  var steps = [
    function cwdStep()
    {
      if (options.pipe)
      {
        console.log("Changing current directory to: %s", ROOT_DIR);
      }

      ftp.cwd(ROOT_DIR, this);
    }
  ];

  for (var localFile in options.upload)
  {
    if (!options.upload.hasOwnProperty(localFile))
    {
      continue;
    }

    (function(local, remote)
    {
      steps.push(function putStep(err)
      {
        if (err)
        {
          throw err;
        }

        if (options.pipe)
        {
          console.log("Uploading [%s] to: %s", local, remote);
        }

        ftp.put(local, remote, this);
      });
    })(localFile, options.upload[localFile]);
  }

  steps.push(function finishStep(err)
  {
    ftp.end();

    process.nextTick(function()
    {
      if (err)
      {
        done && done(err);
        return;
      }

      chmodFiles(options, done);
    });
  });

  step.apply(step, steps);
}

/**
 * @private
 * @param {object} options
 * @param {function(?Error)=} done
 */
function chmodFiles(options, done)
{
  if (Object.keys(options.chmod).length === 0)
  {
    process.nextTick(function()
    {
      reboot(options, done);
    });

    return;
  }

  var telnet = new LantronixTelnetTasks({
    host: options.host,
    user: options.user,
    pass: options.pass
  });

  if (options.pipe)
  {
    telnet.pipeStdio();
  }

  telnet.on('timeout', function(task)
  {
    telnet.kill();

    done && done(new Error("Telnet task timed out: " + task.name));
  });

  for (var remoteFile in options.chmod)
  {
    if (!options.chmod.hasOwnProperty(remoteFile))
    {
      continue;
    }

    (function(file, mode)
    {
      telnet.add({
        name: util.format("Change mode of %s to %s", file, mode),
        expect: "/ #",
        action: util.format('chmod %s "%s/%s"\n', mode, ROOT_DIR, file)
      });
    })(remoteFile, options.chmod[remoteFile]);
  }

  telnet.addExitTask(function()
  {
    reboot(options, done);
  });
}

/**
 * @private
 * @param {object} options
 * @param {function(?Error)=} done
 */
function reboot(options, done)
{
  if (options.reboot === -1)
  {
    done && done();
  }
  else
  {
    rebootLantronix({
      host: options.host,
      user: options.user,
      pass: options.pass,
      pipe: options.pipe,
      ping: options.reboot
    }, done);
  }
}
