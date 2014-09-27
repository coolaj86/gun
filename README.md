Gunshot
=======

A graph cache engine using Amazon S3 as the persistence layer.

```javascript
'use strict';

var PromiseA = require('bluebird').Promise
  , Gun = require('./shotgun')
  , gun
  ;

gun = require('./shotgun').create({
  storage: require('./shotgun-s3').create({
    key: 'XXXXXXXXXXXXXXXXXXXX' // AWS Access Key
  , secret: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' // AWS Secret Token
  , bucket: 'XXX' // The bucket you want to save into
  , idKey: Gun._sym.id
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
        console.log('SUCCESS: created key for root node (and saved all subnodes)');
      });
    });
  }
});
