'use strict';

var PromiseA = require('bluebird').Promise
  , gateS3 = require(__dirname+'/gate/s3') // redis has been removed, can be replaced with a disk system
  , _p
  ;

function S3(opts, Gun) {
  var me = this
    ;

  if (!(me instanceof S3)) {
    return new S3(opts);
  }

  // All options to shotgun-s3 get passed to the s3 module
	me._s3 = gateS3.create(opts);
  me._gun = Gun;
  me._prefix = me._prefix || opts._prefix || '';
  me._prenode = me._prenode || opts._prenode || '_/nodes/';
  me._prekey = me._prekey || opts._prekey || '_/keys/';
  me.idKey = opts.idKey;
}
S3.create = S3;

_p = S3.prototype;

_p.key = function (key, id, errcount) {
  errcount = errcount || 0;

  var me = this
    ;

  if(!id) {
    return PromiseA.reject({err: "No ID!"});
  }

  return new PromiseA(function (resolve, reject) {
    me._s3.put(me._prefix + me._prekey + key, '', function (err, reply) {
      if (!err && reply) {
        resolve();
        return;
      }

      // retry
      if (errcount < 3) {
        me._key(key, id, errcount + 1).then(resolve).catch(reject);
        return;
      }

      reject(err);
    }, {Metadata: {'#': id}});
  });
};

_p.put = function (id, val) {
  var me = this
    ;

  return new PromiseA(function (resolve, reject) {
    me._s3.put(me._prefix + me._prenode + id, val, function (err, reply) {
      if (err) { 
        console.error('gun put i');
        console.error(err);
        reject(err);
        return;
      }

      //resolve(reply);
      resolve(val);
    });
  });
};

_p.get = function (id) {
  var me = this
    ;

  return me._loadEither(id, { id: true });
};

_p.enter = function (key, opt) {
  var me = this
    ;

  return me._loadEither(key);
};

_p._loadEither = function (key, opt) {
  var me = this
    ;

  opt = opt || {};

  if (opt.id) { 
    key = me._prefix + me._prenode + key;
  } else { 
    key = me._prefix + me._prekey + key;
  }

  return new PromiseA(function (resolve, reject) {
    me._s3.get(key, function (err, data, text, headerMeta) {
      var id
        ;

      if (headerMeta && (id = headerMeta[me.idKey])) {
        return me.get(id).then(resolve).catch(reject);
      }

      if (err && err.statusCode == 404) {
        err = null; // we want a difference between 'unfound' (data is null) and 'error' (auth is wrong).
      }

      if (err) {
        console.error('loadeither ');
        console.error(err);

        reject(err);
        return;
      }

      resolve(data);
    });
  });
}

module.exports = S3.S3 = S3;
