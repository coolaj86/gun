'use strict';

var PromiseA = require('bluebird').Promise
  , _p
  ;

function Gun(opts) {
  opts = opts || {};
  var me = this
    ;

  if (!(me instanceof Gun)) {
    return new Gun(opts);
  }

  me.init(opts);
}
Gun.create = Gun
_p = Gun.prototype

_p.util = {};
_p.util.now = function (nodes, now) {
  var context = {};
  context.nodes = nodes;
  context.now = now = (now === 0)? now : now || Gun.time.is();
  Gun.obj.map(context.nodes, function(node, id){
    if(!node || !id || !node._ || !node._[Gun._sym.id] || node._[Gun._sym.id] !== id){
      context.err = {err: "There is a corruption of nodes and or their ids", corrupt: true};
      return true;
    }
    var states = node._[Gun._sym.HAM] = node._[Gun._sym.HAM] || {};
    Gun.obj.map(node, function(val, field){
      if(field == Gun._sym.meta){ return }
      val = states[field];
      states[field] = (val === 0)? val : val || now;
    });
  });
  return context;
}

_p.util.union = function(prime){
  var gun = Gun.is(this)? this : null
  ,	context = {nodes: {}};
  if(!gun){
    context.err = {err: "No gun instance!", corrupt: true};
    return context;
  }
  Gun.obj.map(prime, function(node){
    var set = Gun.ify.call(gun, node);
    if(set.err){
      context.err = set.err;
      return true;
    }
    Gun.obj.map(set.nodes, function(node, id){
      context.nodes[id] = node;
    });
  });
  if(context.err){ return context }
  Gun.union(gun._nodes, context.nodes); // need to move good primes onto context.nodes;
  return context;
}

_p.init = function (opts) {
  var me = this
    ;

  me._ = {};
  me.__ = me.__ || { keys: {} };
  me._nodes = {};
  //me._copies = {};

  me._opts = opts || {};

  me._storage = opts.storage;
};

Gun._sym = {
  id: '#'
, meta: '_'
, HAM: '>'
};
_p.loadHelper = function (data, loaded) {
  var me = this
    , ps = []
    , id
    ;

  if (!data) {
    return PromiseA.resolve(null);
  }

  id = data._[Gun._sym.id];
  loaded[id] = Gun.obj.copy(data);

  Object.keys(data).forEach(function (k) {
    var v
      , sid
      ;

    if (Gun._sym.meta === k) {
      return;
    }

    v = data[k];
    sid = v && v[Gun._sym.id]

    if (!sid) {
      ps.push(PromiseA.resolve(v));
      return;
    }

    if (loaded[sid]) {
      // TODO don't traverse this twice
      ps.push(PromiseA.resolve(loaded[sid]));
      return;
    }

    // TODO loading state
    ps.push(me.get(sid).then(function (sidData) {
      return me.loadHelper(sidData, loaded).then(function (subSub) {
        data[k] = subSub;
      });
    }));
  });

  return Promise.all(ps).then(function () {
    return data;
  });
};

_p.load = function (key) {
  var me = this
    ;

  return me._storage.enter(key).then(function (data) {
    return me.loadHelper(data, {}).then(function () {
      return data;
    });
  });
};
_p.enter = function (key) {
  var me = this
    ;

  if (me._keys[key]) {
    return PromiseA.resolve(me._keys[key]);
  }

  return me._storage.enter(key);
};
_p.key = function (key, root) {
  var me = this
    ;

  return me._storage.key(key, root._[Gun._sym.id]);
};


Gun.is = function(gun){ return (gun instanceof Gun)? true : false }
Gun.fns = {};
Gun.fns.is = function(fn){ return (fn instanceof Function)? true : false }
Gun.bi = {};
Gun.bi.is = function(b){ return (b instanceof Boolean || typeof b == 'boolean')? true : false }
Gun.num = {};
Gun.num.is = function(n){
  return ((n===0)? true : (!isNaN(n) && !Gun.bi.is(n) && !Gun.list.is(n) && !Gun.text.is(n))? true : false );
}
Gun.text = {};
Gun.text.is = function(t){ return typeof t == 'string'? true : false }
Gun.text.ify = function(t){
  if(Gun.text.is(t)){ return t }
  if(JSON){ return JSON.stringify(t) }
  return (t && t.toString)? t.toString() : t;
}
Gun.text.random = function(l, c){
  var s = '';
  l = l || 24; // you are not going to make a 0 length random number, so no need to check type
  c = c || '0123456789ABCDEFGHIJKLMNOPQRSTUVWXZabcdefghiklmnopqrstuvwxyz';
  while(l > 0){ s += c.charAt(Math.floor(Math.random() * c.length)); l-- }
  return s;
}
Gun.list = {};
Gun.list.is = function(l){ return (l instanceof Array)? true : false }
Gun.list.slit = Array.prototype.slice;
Gun.list.sort = function(k){ // create a new sort function
  return function(A,B){
    if(!A || !B){ return 0 } A = A[k]; B = B[k];
    if(A < B){ return -1 }else if(A > B){ return 1 }
    else { return 0 }
  }
}
Gun.list.map = function(l, c, _){ return Gun.obj.map(l, c, _) }
Gun.list.index = 1; // change this to 0 if you want non-logical, non-mathematical, non-matrix, non-convenient array notation
Gun.obj = {};
Gun.obj.is = function(o){ return (o instanceof Object && !Gun.list.is(o) && !Gun.fns.is(o))? true : false }
Gun.obj.del = function(o, k){
  if(!o){ return }
  o[k] = null;
  delete o[k]; 
  return true;
}
Gun.obj.ify = function(o){
  if(Gun.obj.is(o)){ return o }
  try{o = JSON.parse(o);
  }catch(e){o={}}
  return o;
}
Gun.obj.copy = function(o){ // because http://web.archive.org/web/20140328224025/http://jsperf.com/cloning-an-object/2
  return !o? o : JSON.parse(JSON.stringify(o)); // is shockingly faster than anything else, and our data has to be a subset of JSON anyways!
}
Gun.obj.has = function(o, t){ return Object.prototype.hasOwnProperty.call(o, t) }
Gun.obj.map = function(l, c, _){
  var u, i = 0, ii = 0, x, r, rr, f = Gun.fns.is(c),
  t = function(k,v){
    if(v !== u){
      rr = rr || {};
      rr[k] = v;
      return;
    } rr = rr || [];
    rr.push(k);
  };
  if(Gun.list.is(l)){
    x = l.length;
    for(;i < x; i++){
      ii = (i + Gun.list.index);
      if(f){
        r = _? c.call(_, l[i], ii, t) : c(l[i], ii, t);
        if(r !== u){ return r }
      } else {
        //if(gun.test.is(c,l[i])){ return ii } // should implement deep equality testing!
        if(c === l[i]){ return ii } // use this for now
      }
    }
  } else {
    for(i in l){
      if(f){
        if(Gun.obj.has(l,i)){
          r = _? c.call(_, l[i], i, t) : c(l[i], i, t);
          if(r !== u){ return r }
        }
      } else {
        //if(a.test.is(c,l[i])){ return i } // should implement deep equality testing!
        if(c === l[i]){ return i }
      }
    }
  }
  return f? rr : Gun.list.index? 0 : -1;
}
Gun.time = {};
Gun.time.is = function(t){ return t? t instanceof Date : (+new Date().getTime()) }


Gun.roulette = function(l, c){
  var gun = Gun.is(this)? this : {};
  if(gun._ && gun.__.opt && gun.__.opt.uuid){
    if(Gun.fns.is(gun.__.opt.uuid)){
      return gun.__.opt.uuid(l, c);
    }
    l = l || gun.__.opt.uuid.length;
  }
  return Gun.text.random(l, c);
}
Gun.union = function(graph, prime){
  var context = { nodes: {} }
    ;

  Gun.obj.map(prime, function(node, id){
    var vertex = graph[id]
      ;

    if(!vertex){ // disjoint
      context.nodes[node._[Gun._sym.id]] = graph[node._[Gun._sym.id]] = node;
      return;
    }

    Gun.HAM(vertex, node, function(current, field, deltaValue){ // partial
      vertex[field] = deltaValue; // vertex and current are the same
      vertex._[Gun._sym.HAM][field] = node._[Gun._sym.HAM][field];
    });
  });
}

Gun.HAM = function(current, delta, some){ // TODO: BUG! HAM on sub-graphs has not yet been put into code, thus divergences could occur - this is alpha!
  function HAM(machineState, incomingState, currentState, incomingValue, currentValue){ // TODO: Lester's comments on roll backs could be vulnerable to divergence, investigate!
    if(machineState < incomingState){
      // the incoming value is outside the boundary of the machine's state, it must be reprocessed in another state.
      return {amnesiaQuarantine: true}; 
    }
    if(incomingState < currentState){
      // the incoming value is within the boundary of the machine's state, but not within the range.
      return {quarantineState: true};
    }
    if(currentState < incomingState){
      // the incoming value is within both the boundary and the range of the machine's state.
      return {converge: true, incoming: true};
    }
    if(incomingState === currentState){
      if(incomingValue === currentValue){ // Note: while these are practically the same, the deltas could be technically different
        return {state: true};
      }
      /*
        The following is a naive implementation, but will always work.
        Never change it unless you have specific needs that absolutely require it.
        If changed, your data will diverge unless you guarantee every peer's algorithm has also been changed to be the same.
        As a result, it is highly discouraged to modify despite the fact that it is naive,
        because convergence (data integrity) is generally more important.
        Any difference in this algorithm must be given a new and different name.
      */
      if(String(incomingValue) < String(currentValue)){ // String only works on primitive values!
        return {converge: true, current: true};
      }
      if(String(currentValue) < String(incomingValue)){ // String only works on primitive values!
        return {converge: true, incoming: true};
      }
    }
    return {err: "you have not properly handled recursion through your data or filtered it as JSON"};
  }
  var states = current._[Gun._sym.HAM] = current._[Gun._sym.HAM] || {} // TODO: need to cover the state of the node itself, not just the fields?
  , deltaStates = delta._[Gun._sym.HAM];
  Gun.obj.map(delta, function update(deltaValue, field){
    if(field === Gun.sym.meta){ return }
    if(!Gun.obj.has(current, field)){
      some(current, field, deltaValue);
      return;
    }
    var serverState = Gun.time.is();
    // add more checks?
    var state = HAM(serverState, deltaStates[field], states[field], deltaValue, current[field]);
    // Gun.log("HAM:", field, deltaValue, deltaStates[field], current[field], 'the', state, (deltaStates[field] - serverState));
    if(state.err){
      Gun.log(".!HYPOTHETICAL AMNESIA MACHINE ERR!.", state.err);
      return;
    }
    if(state.state || state.quarantineState || state.current){ return }
    if(state.incoming){
      some(current, field, deltaValue);
      return;
    }
    if(state.amnesiaQuarantine){
      Gun.schedule(deltaStates[field], function(){
        update(deltaValue, field);
      });
    }
  });
}

;(function(schedule){
  schedule.waiting = [];
  schedule.soonest = Infinity;
  schedule.sort = Gun.list.sort('when');
  schedule.set = function(future){
    var now = Gun.time.is();
    future = (future <= now)? 0 : (future - now);
    clearTimeout(schedule.id);
    schedule.id = setTimeout(schedule.check, future);
  }
  schedule.check = function(){
    var now = Gun.time.is(), soonest = Infinity;
    schedule.waiting.sort(schedule.sort);
    schedule.waiting = Gun.list.map(schedule.waiting, function(wait, i, map){
      if(!wait){ return }
      if(wait.when <= now){
        if(Gun.fns.is(wait.event)){
          wait.event();
        }
      } else {
        soonest = (soonest < wait.when)? soonest : wait.when;
        map(wait);
      }
    }) || [];
    schedule.set(soonest);
  }
  Gun.schedule = function(state, cb){
    schedule.waiting.push({when: state, event: cb});
    if(schedule.soonest < state){ return }
    schedule.set(state);
  }
}({}));

;(function(Serializer){
  Gun.ify = function(data){ // TODO: BUG: Modify lists to include HAM state
    var gun = Gun.is(this)? this : {}
    , context = {
      nodes: {}
      ,seen: []
      ,_seen: []
    }, nothing;
    function ify(data, context, sub){
      var err
        ;

      sub = sub || {};
      sub.path = sub.path || '';
      context = context || {};
      context.nodes = context.nodes || {};
      if((sub.simple = Gun.ify.is(data)) && !(sub._ && Gun.text.is(sub.simple))){
        return data;
      } else

      if(Gun.obj.is(data)){
        var value = {}, symbol = {}, seen;
        err = {err: "Metadata does not support external or circular references at " + sub.path, meta: true};
        context.root = context.root || value;

        seen = ify.seen(context._seen, data)
        if (seen) {
          //Gun.log("seen in _", sub._, sub.path, data);
          context.err = err;
          return;
        } else {
          seen = ify.seen(context.seen, data)
          if (seen) {
            //Gun.log("seen in data", sub._, sub.path, data);
            if(sub._){
              context.err = err;
              return;
            }
            symbol = Gun.ify.id.call(gun, symbol, seen);
            return symbol;
          } else {
            //Gun.log("seen nowhere", sub._, sub.path, data);
            if(sub._){
              context.seen.push({data: data, node: value});
            } else {
              value._ = Gun.ify.id.call(gun, {}, data);
              context.seen.push({data: data, node: value});
              context.nodes[value._[Gun._sym.id]] = value;
            }
          }
        }
        Gun.obj.map(data, function(val, field){
          var subs = {path: sub.path + field + '.', _: sub._ || (field == Gun._sym.meta)? true : false };
          val = ify(val, context, subs);
          //Gun.log('>>>>', sub.path + field, 'is', val);
          if(context.err){ return true }
          if(nothing === val){ return }
          // TODO: check field validity
          value[field] = val;
        });
        if(sub._){ return value }
        if(!value._ || !value._[Gun._sym.id]){ return }
        symbol[Gun._sym.id] = value._[Gun._sym.id];
        return symbol;
      } else
      if(Gun.list.is(data)){
        var unique = {}
          , edges
          ;

        err = {err: "Arrays cause data corruption at " + sub.path, array: true};
        edges = Gun.list.map(data, function(val, i, map){
          val = ify(val, context, sub);
          if(context.err){ return true }
          if(!Gun.obj.is(val)){
            context.err = err;
            return true;
          }
          return Gun.obj.map(val, function(id, field){
            if(field !== Gun._sym.id){
              context.err = err;
              return true;
            }					
            if(unique[id]){ return }
            unique[id] = 1;
            map(val);
          });
        });
        if(context.err){ return }
        return edges;
      } else {
        context.err = {err: "Data type not supported at " + sub.path, invalid: true};
      }
    }
    ify.seen = function(seen, data){
      // unfortunately, using seen[data] = true will cause false-positives for data's children
      return Gun.list.map(seen, function(check){
        if(check.data === data){ return check.node }
      });
    }
    ify(data, context);
    return context;
  }

  Gun.ify.id = function(to, from){
    var me = this
      ;

    to = to || {};
    if(Gun.ify.id.is(from)){
      to[Gun._sym.id] = from._[Gun._sym.id];
      return to;
    }
    to[Gun._sym.id] = Gun.roulette.call(me);
    return to;
  }		
  Gun.ify.id.is = function(o){
    if(o && o._ && o._[Gun._sym.id]){
      return true;
    }
  }
  Gun.ify.is = function(v){ // null, binary, number (!Infinity), text, or a ref.
    if(v === null){ return true } // deletes
    if(v === Infinity){ return false }
    if(Gun.bi.is(v) 
    || Gun.num.is(v) 
    || Gun.text.is(v)){
      return true; // simple values
    }
    var yes;
    yes = Gun.ify.is.id(v)
    if(yes){
      return yes;
    }
    return false;
  }
  Gun.ify.is.id = function(v){
    if (!Gun.obj.is(v)) {
      return false;
    }

    var yes
      ;

    Gun.obj.map(v, function(id, field){
      if (yes) {
        return (yes = false);
      }

      if (field === Gun._sym.id && Gun.text.is(id)) {
        yes = id;
      }
    });

    if (yes) {
      return yes;
    }
  }
}());

_p.get = function (id) {
  var me = this
    ;

  if (me._nodes[id]) {
    //if (!me._copies[id]) {
    //  me._copies[id] = Gun.obj.copy(me._nodes[id]);
    //}
    //return PromiseA.resolve(me._copies[id]);
    return PromiseA.resolve(me._nodes[id]);
  }

  return me._storage.get(id).then(function (data) {
    if (!data) {
      return null; // (gun._.blank||cb.fn)()
    }
    var context = { nodes: {} }
      ;

    context.nodes[data._[Gun._sym.id]] = data;
    context = me.util.union.call(me, context.nodes); // data safely transformed

    if (context.err) {
      console.error(context.err);
      throw context.err;
    }

    me._.node = me.__.keys[id] = me._nodes[data._[Gun._sym.id]];

    return Gun.obj.copy(me._.node);
  });
};

_p.put = function (obj) {
  var me = this
    , env
    , ps = []
    ;

  env = Gun.ify(obj);
  if (env.err) {
    console.error('gun put 1');
    console.error(env.err);
    throw env.err;
  }

  // How to get THAT node?

  Gun.union(me._nodes, env.nodes);
  Object.keys(env.nodes).forEach(function (id) {
    var val = env.nodes[id]
      ;

    //delete me._copies[id];
    // TODO update copy to new thing
    ps.push(me._storage.put(id, val));
  });

  return PromiseA.all(ps).then(function () {
    return env.root;
  });
};

_p.index = function () {
  var me = this
    , count = 0
    ;
};

module.exports = Gun.Gun = Gun;
