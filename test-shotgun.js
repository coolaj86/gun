'use strict';

var PromiseA = require('bluebird').Promise
  , Gun = require('./shotgun')
  , gun
  , config = require('./config')
  ;

gun = require('./shotgun').create({
  storage: require('./shotgun-s3').create({
    key: config.s3.key // AWS Access Key
  , secret: config.s3.secret // AWS Secret Token
  , bucket: config.s3.bucket // The bucket you want to save into
  , idKey: Gun._sym.id // hack around short-sightedness in API
  })
});

gun.load('blob/data').then(function (data) {
  var obj = { foo: 'bar', bar: 'baz', awesome: { sauce: 'x11', catsup: { ketchup: 'sauce' } } }
    ;

  if (data) {
    console.log('AWESOME!!!');
    console.log(data);
    return;
  }

  if (!data) {
    return gun.put(obj).then(function (root) {
      gun.key('blob/data', root).then(function (node) {
        console.log('SUCCESS: created key for node');
      });
    });
  }
});