'use strict';

var PromiseA = require('bluebird').Promise
  , Gun = require('./shotgun')
  , gun
  , now
  ;

gun = require('./shotgun').create({
  storage: require('./shotgun-s3').create({
    key: 'AKIAIN6RTSL3VDEDXNLA' // AWS Access Key
  , secret: 'H0ZDMctiELkh5IIxfprMRBAk+EK+CTHgwz4y/OvF' // AWS Secret Token
  , bucket: 'gun-example' // The bucket you want to save into
  , idKey: Gun._sym.id
  })
});

now = Date.now();
console.log('Starting Timer');
gun.load('blob/data').then(function (data) {
  var obj = { foo: 'bar', bar: 'baz', awesome: { sauce: 'x11', catsup: { ketchup: 'sauce' } } }
    ;

  if (data) {
    console.log('AWESOME!!!');
    console.log(data);
    console.log('Timed at', ((Date.now() - now) / 1000).toFixed(2) + 's');
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
