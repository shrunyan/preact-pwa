(function () {
	'use strict';

	var VNode = function VNode() {};

	var options = {};
	var stack = [];
	var EMPTY_CHILDREN = [];

	function h(nodeName, attributes) {
	  var children = EMPTY_CHILDREN,
	      lastSimple,
	      child,
	      simple,
	      i;

	  for (i = arguments.length; i-- > 2;) {
	    stack.push(arguments[i]);
	  }

	  if (attributes && attributes.children != null) {
	    if (!stack.length) stack.push(attributes.children);
	    delete attributes.children;
	  }

	  while (stack.length) {
	    if ((child = stack.pop()) && child.pop !== undefined) {
	      for (i = child.length; i--;) {
	        stack.push(child[i]);
	      }
	    } else {
	      if (typeof child === 'boolean') child = null;

	      if (simple = typeof nodeName !== 'function') {
	        if (child == null) child = '';else if (typeof child === 'number') child = String(child);else if (typeof child !== 'string') simple = false;
	      }

	      if (simple && lastSimple) {
	        children[children.length - 1] += child;
	      } else if (children === EMPTY_CHILDREN) {
	        children = [child];
	      } else {
	        children.push(child);
	      }

	      lastSimple = simple;
	    }
	  }

	  var p = new VNode();
	  p.nodeName = nodeName;
	  p.children = children;
	  p.attributes = attributes == null ? undefined : attributes;
	  p.key = attributes == null ? undefined : attributes.key;
	  if (options.vnode !== undefined) options.vnode(p);
	  return p;
	}

	function extend(obj, props) {
	  for (var i in props) {
	    obj[i] = props[i];
	  }

	  return obj;
	}

	function applyRef(ref, value) {
	  if (ref != null) {
	    if (typeof ref == 'function') ref(value);else ref.current = value;
	  }
	}

	var defer = typeof Promise == 'function' ? Promise.resolve().then.bind(Promise.resolve()) : setTimeout;

	function cloneElement(vnode, props) {
	  return h(vnode.nodeName, extend(extend({}, vnode.attributes), props), arguments.length > 2 ? [].slice.call(arguments, 2) : vnode.children);
	}

	var IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i;
	var items = [];

	function enqueueRender(component) {
	  if (!component._dirty && (component._dirty = true) && items.push(component) == 1) {
	    (options.debounceRendering || defer)(rerender);
	  }
	}

	function rerender() {
	  var p;

	  while (p = items.pop()) {
	    if (p._dirty) renderComponent(p);
	  }
	}

	function isSameNodeType(node, vnode, hydrating) {
	  if (typeof vnode === 'string' || typeof vnode === 'number') {
	    return node.splitText !== undefined;
	  }

	  if (typeof vnode.nodeName === 'string') {
	    return !node._componentConstructor && isNamedNode(node, vnode.nodeName);
	  }

	  return hydrating || node._componentConstructor === vnode.nodeName;
	}

	function isNamedNode(node, nodeName) {
	  return node.normalizedNodeName === nodeName || node.nodeName.toLowerCase() === nodeName.toLowerCase();
	}

	function getNodeProps(vnode) {
	  var props = extend({}, vnode.attributes);
	  props.children = vnode.children;
	  var defaultProps = vnode.nodeName.defaultProps;

	  if (defaultProps !== undefined) {
	    for (var i in defaultProps) {
	      if (props[i] === undefined) {
	        props[i] = defaultProps[i];
	      }
	    }
	  }

	  return props;
	}

	function createNode(nodeName, isSvg) {
	  var node = isSvg ? document.createElementNS('http://www.w3.org/2000/svg', nodeName) : document.createElement(nodeName);
	  node.normalizedNodeName = nodeName;
	  return node;
	}

	function removeNode(node) {
	  var parentNode = node.parentNode;
	  if (parentNode) parentNode.removeChild(node);
	}

	function setAccessor(node, name, old, value, isSvg) {
	  if (name === 'className') name = 'class';

	  if (name === 'key') ; else if (name === 'ref') {
	    applyRef(old, null);
	    applyRef(value, node);
	  } else if (name === 'class' && !isSvg) {
	    node.className = value || '';
	  } else if (name === 'style') {
	    if (!value || typeof value === 'string' || typeof old === 'string') {
	      node.style.cssText = value || '';
	    }

	    if (value && typeof value === 'object') {
	      if (typeof old !== 'string') {
	        for (var i in old) {
	          if (!(i in value)) node.style[i] = '';
	        }
	      }

	      for (var i in value) {
	        node.style[i] = typeof value[i] === 'number' && IS_NON_DIMENSIONAL.test(i) === false ? value[i] + 'px' : value[i];
	      }
	    }
	  } else if (name === 'dangerouslySetInnerHTML') {
	    if (value) node.innerHTML = value.__html || '';
	  } else if (name[0] == 'o' && name[1] == 'n') {
	    var useCapture = name !== (name = name.replace(/Capture$/, ''));
	    name = name.toLowerCase().substring(2);

	    if (value) {
	      if (!old) node.addEventListener(name, eventProxy, useCapture);
	    } else {
	      node.removeEventListener(name, eventProxy, useCapture);
	    }

	    (node._listeners || (node._listeners = {}))[name] = value;
	  } else if (name !== 'list' && name !== 'type' && !isSvg && name in node) {
	    try {
	      node[name] = value == null ? '' : value;
	    } catch (e) {}

	    if ((value == null || value === false) && name != 'spellcheck') node.removeAttribute(name);
	  } else {
	    var ns = isSvg && name !== (name = name.replace(/^xlink:?/, ''));

	    if (value == null || value === false) {
	      if (ns) node.removeAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase());else node.removeAttribute(name);
	    } else if (typeof value !== 'function') {
	      if (ns) node.setAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase(), value);else node.setAttribute(name, value);
	    }
	  }
	}

	function eventProxy(e) {
	  return this._listeners[e.type](options.event && options.event(e) || e);
	}

	var mounts = [];
	var diffLevel = 0;
	var isSvgMode = false;
	var hydrating = false;

	function flushMounts() {
	  var c;

	  while (c = mounts.shift()) {
	    if (options.afterMount) options.afterMount(c);
	    if (c.componentDidMount) c.componentDidMount();
	  }
	}

	function diff(dom, vnode, context, mountAll, parent, componentRoot) {
	  if (!diffLevel++) {
	    isSvgMode = parent != null && parent.ownerSVGElement !== undefined;
	    hydrating = dom != null && !('__preactattr_' in dom);
	  }

	  var ret = idiff(dom, vnode, context, mountAll, componentRoot);
	  if (parent && ret.parentNode !== parent) parent.appendChild(ret);

	  if (! --diffLevel) {
	    hydrating = false;
	    if (!componentRoot) flushMounts();
	  }

	  return ret;
	}

	function idiff(dom, vnode, context, mountAll, componentRoot) {
	  var out = dom,
	      prevSvgMode = isSvgMode;
	  if (vnode == null || typeof vnode === 'boolean') vnode = '';

	  if (typeof vnode === 'string' || typeof vnode === 'number') {
	    if (dom && dom.splitText !== undefined && dom.parentNode && (!dom._component || componentRoot)) {
	      if (dom.nodeValue != vnode) {
	        dom.nodeValue = vnode;
	      }
	    } else {
	      out = document.createTextNode(vnode);

	      if (dom) {
	        if (dom.parentNode) dom.parentNode.replaceChild(out, dom);
	        recollectNodeTree(dom, true);
	      }
	    }

	    out['__preactattr_'] = true;
	    return out;
	  }

	  var vnodeName = vnode.nodeName;

	  if (typeof vnodeName === 'function') {
	    return buildComponentFromVNode(dom, vnode, context, mountAll);
	  }

	  isSvgMode = vnodeName === 'svg' ? true : vnodeName === 'foreignObject' ? false : isSvgMode;
	  vnodeName = String(vnodeName);

	  if (!dom || !isNamedNode(dom, vnodeName)) {
	    out = createNode(vnodeName, isSvgMode);

	    if (dom) {
	      while (dom.firstChild) {
	        out.appendChild(dom.firstChild);
	      }

	      if (dom.parentNode) dom.parentNode.replaceChild(out, dom);
	      recollectNodeTree(dom, true);
	    }
	  }

	  var fc = out.firstChild,
	      props = out['__preactattr_'],
	      vchildren = vnode.children;

	  if (props == null) {
	    props = out['__preactattr_'] = {};

	    for (var a = out.attributes, i = a.length; i--;) {
	      props[a[i].name] = a[i].value;
	    }
	  }

	  if (!hydrating && vchildren && vchildren.length === 1 && typeof vchildren[0] === 'string' && fc != null && fc.splitText !== undefined && fc.nextSibling == null) {
	    if (fc.nodeValue != vchildren[0]) {
	      fc.nodeValue = vchildren[0];
	    }
	  } else if (vchildren && vchildren.length || fc != null) {
	    innerDiffNode(out, vchildren, context, mountAll, hydrating || props.dangerouslySetInnerHTML != null);
	  }

	  diffAttributes(out, vnode.attributes, props);
	  isSvgMode = prevSvgMode;
	  return out;
	}

	function innerDiffNode(dom, vchildren, context, mountAll, isHydrating) {
	  var originalChildren = dom.childNodes,
	      children = [],
	      keyed = {},
	      keyedLen = 0,
	      min = 0,
	      len = originalChildren.length,
	      childrenLen = 0,
	      vlen = vchildren ? vchildren.length : 0,
	      j,
	      c,
	      f,
	      vchild,
	      child;

	  if (len !== 0) {
	    for (var i = 0; i < len; i++) {
	      var _child = originalChildren[i],
	          props = _child['__preactattr_'],
	          key = vlen && props ? _child._component ? _child._component.__key : props.key : null;

	      if (key != null) {
	        keyedLen++;
	        keyed[key] = _child;
	      } else if (props || (_child.splitText !== undefined ? isHydrating ? _child.nodeValue.trim() : true : isHydrating)) {
	        children[childrenLen++] = _child;
	      }
	    }
	  }

	  if (vlen !== 0) {
	    for (var i = 0; i < vlen; i++) {
	      vchild = vchildren[i];
	      child = null;
	      var key = vchild.key;

	      if (key != null) {
	        if (keyedLen && keyed[key] !== undefined) {
	          child = keyed[key];
	          keyed[key] = undefined;
	          keyedLen--;
	        }
	      } else if (min < childrenLen) {
	        for (j = min; j < childrenLen; j++) {
	          if (children[j] !== undefined && isSameNodeType(c = children[j], vchild, isHydrating)) {
	            child = c;
	            children[j] = undefined;
	            if (j === childrenLen - 1) childrenLen--;
	            if (j === min) min++;
	            break;
	          }
	        }
	      }

	      child = idiff(child, vchild, context, mountAll);
	      f = originalChildren[i];

	      if (child && child !== dom && child !== f) {
	        if (f == null) {
	          dom.appendChild(child);
	        } else if (child === f.nextSibling) {
	          removeNode(f);
	        } else {
	          dom.insertBefore(child, f);
	        }
	      }
	    }
	  }

	  if (keyedLen) {
	    for (var i in keyed) {
	      if (keyed[i] !== undefined) recollectNodeTree(keyed[i], false);
	    }
	  }

	  while (min <= childrenLen) {
	    if ((child = children[childrenLen--]) !== undefined) recollectNodeTree(child, false);
	  }
	}

	function recollectNodeTree(node, unmountOnly) {
	  var component = node._component;

	  if (component) {
	    unmountComponent(component);
	  } else {
	    if (node['__preactattr_'] != null) applyRef(node['__preactattr_'].ref, null);

	    if (unmountOnly === false || node['__preactattr_'] == null) {
	      removeNode(node);
	    }

	    removeChildren(node);
	  }
	}

	function removeChildren(node) {
	  node = node.lastChild;

	  while (node) {
	    var next = node.previousSibling;
	    recollectNodeTree(node, true);
	    node = next;
	  }
	}

	function diffAttributes(dom, attrs, old) {
	  var name;

	  for (name in old) {
	    if (!(attrs && attrs[name] != null) && old[name] != null) {
	      setAccessor(dom, name, old[name], old[name] = undefined, isSvgMode);
	    }
	  }

	  for (name in attrs) {
	    if (name !== 'children' && name !== 'innerHTML' && (!(name in old) || attrs[name] !== (name === 'value' || name === 'checked' ? dom[name] : old[name]))) {
	      setAccessor(dom, name, old[name], old[name] = attrs[name], isSvgMode);
	    }
	  }
	}

	var recyclerComponents = [];

	function createComponent(Ctor, props, context) {
	  var inst,
	      i = recyclerComponents.length;

	  if (Ctor.prototype && Ctor.prototype.render) {
	    inst = new Ctor(props, context);
	    Component.call(inst, props, context);
	  } else {
	    inst = new Component(props, context);
	    inst.constructor = Ctor;
	    inst.render = doRender;
	  }

	  while (i--) {
	    if (recyclerComponents[i].constructor === Ctor) {
	      inst.nextBase = recyclerComponents[i].nextBase;
	      recyclerComponents.splice(i, 1);
	      return inst;
	    }
	  }

	  return inst;
	}

	function doRender(props, state, context) {
	  return this.constructor(props, context);
	}

	function setComponentProps(component, props, renderMode, context, mountAll) {
	  if (component._disable) return;
	  component._disable = true;
	  component.__ref = props.ref;
	  component.__key = props.key;
	  delete props.ref;
	  delete props.key;

	  if (typeof component.constructor.getDerivedStateFromProps === 'undefined') {
	    if (!component.base || mountAll) {
	      if (component.componentWillMount) component.componentWillMount();
	    } else if (component.componentWillReceiveProps) {
	      component.componentWillReceiveProps(props, context);
	    }
	  }

	  if (context && context !== component.context) {
	    if (!component.prevContext) component.prevContext = component.context;
	    component.context = context;
	  }

	  if (!component.prevProps) component.prevProps = component.props;
	  component.props = props;
	  component._disable = false;

	  if (renderMode !== 0) {
	    if (renderMode === 1 || options.syncComponentUpdates !== false || !component.base) {
	      renderComponent(component, 1, mountAll);
	    } else {
	      enqueueRender(component);
	    }
	  }

	  applyRef(component.__ref, component);
	}

	function renderComponent(component, renderMode, mountAll, isChild) {
	  if (component._disable) return;
	  var props = component.props,
	      state = component.state,
	      context = component.context,
	      previousProps = component.prevProps || props,
	      previousState = component.prevState || state,
	      previousContext = component.prevContext || context,
	      isUpdate = component.base,
	      nextBase = component.nextBase,
	      initialBase = isUpdate || nextBase,
	      initialChildComponent = component._component,
	      skip = false,
	      snapshot = previousContext,
	      rendered,
	      inst,
	      cbase;

	  if (component.constructor.getDerivedStateFromProps) {
	    state = extend(extend({}, state), component.constructor.getDerivedStateFromProps(props, state));
	    component.state = state;
	  }

	  if (isUpdate) {
	    component.props = previousProps;
	    component.state = previousState;
	    component.context = previousContext;

	    if (renderMode !== 2 && component.shouldComponentUpdate && component.shouldComponentUpdate(props, state, context) === false) {
	      skip = true;
	    } else if (component.componentWillUpdate) {
	      component.componentWillUpdate(props, state, context);
	    }

	    component.props = props;
	    component.state = state;
	    component.context = context;
	  }

	  component.prevProps = component.prevState = component.prevContext = component.nextBase = null;
	  component._dirty = false;

	  if (!skip) {
	    rendered = component.render(props, state, context);

	    if (component.getChildContext) {
	      context = extend(extend({}, context), component.getChildContext());
	    }

	    if (isUpdate && component.getSnapshotBeforeUpdate) {
	      snapshot = component.getSnapshotBeforeUpdate(previousProps, previousState);
	    }

	    var childComponent = rendered && rendered.nodeName,
	        toUnmount,
	        base;

	    if (typeof childComponent === 'function') {
	      var childProps = getNodeProps(rendered);
	      inst = initialChildComponent;

	      if (inst && inst.constructor === childComponent && childProps.key == inst.__key) {
	        setComponentProps(inst, childProps, 1, context, false);
	      } else {
	        toUnmount = inst;
	        component._component = inst = createComponent(childComponent, childProps, context);
	        inst.nextBase = inst.nextBase || nextBase;
	        inst._parentComponent = component;
	        setComponentProps(inst, childProps, 0, context, false);
	        renderComponent(inst, 1, mountAll, true);
	      }

	      base = inst.base;
	    } else {
	      cbase = initialBase;
	      toUnmount = initialChildComponent;

	      if (toUnmount) {
	        cbase = component._component = null;
	      }

	      if (initialBase || renderMode === 1) {
	        if (cbase) cbase._component = null;
	        base = diff(cbase, rendered, context, mountAll || !isUpdate, initialBase && initialBase.parentNode, true);
	      }
	    }

	    if (initialBase && base !== initialBase && inst !== initialChildComponent) {
	      var baseParent = initialBase.parentNode;

	      if (baseParent && base !== baseParent) {
	        baseParent.replaceChild(base, initialBase);

	        if (!toUnmount) {
	          initialBase._component = null;
	          recollectNodeTree(initialBase, false);
	        }
	      }
	    }

	    if (toUnmount) {
	      unmountComponent(toUnmount);
	    }

	    component.base = base;

	    if (base && !isChild) {
	      var componentRef = component,
	          t = component;

	      while (t = t._parentComponent) {
	        (componentRef = t).base = base;
	      }

	      base._component = componentRef;
	      base._componentConstructor = componentRef.constructor;
	    }
	  }

	  if (!isUpdate || mountAll) {
	    mounts.push(component);
	  } else if (!skip) {
	    if (component.componentDidUpdate) {
	      component.componentDidUpdate(previousProps, previousState, snapshot);
	    }

	    if (options.afterUpdate) options.afterUpdate(component);
	  }

	  while (component._renderCallbacks.length) {
	    component._renderCallbacks.pop().call(component);
	  }

	  if (!diffLevel && !isChild) flushMounts();
	}

	function buildComponentFromVNode(dom, vnode, context, mountAll) {
	  var c = dom && dom._component,
	      originalComponent = c,
	      oldDom = dom,
	      isDirectOwner = c && dom._componentConstructor === vnode.nodeName,
	      isOwner = isDirectOwner,
	      props = getNodeProps(vnode);

	  while (c && !isOwner && (c = c._parentComponent)) {
	    isOwner = c.constructor === vnode.nodeName;
	  }

	  if (c && isOwner && (!mountAll || c._component)) {
	    setComponentProps(c, props, 3, context, mountAll);
	    dom = c.base;
	  } else {
	    if (originalComponent && !isDirectOwner) {
	      unmountComponent(originalComponent);
	      dom = oldDom = null;
	    }

	    c = createComponent(vnode.nodeName, props, context);

	    if (dom && !c.nextBase) {
	      c.nextBase = dom;
	      oldDom = null;
	    }

	    setComponentProps(c, props, 1, context, mountAll);
	    dom = c.base;

	    if (oldDom && dom !== oldDom) {
	      oldDom._component = null;
	      recollectNodeTree(oldDom, false);
	    }
	  }

	  return dom;
	}

	function unmountComponent(component) {
	  if (options.beforeUnmount) options.beforeUnmount(component);
	  var base = component.base;
	  component._disable = true;
	  if (component.componentWillUnmount) component.componentWillUnmount();
	  component.base = null;
	  var inner = component._component;

	  if (inner) {
	    unmountComponent(inner);
	  } else if (base) {
	    if (base['__preactattr_'] != null) applyRef(base['__preactattr_'].ref, null);
	    component.nextBase = base;
	    removeNode(base);
	    recyclerComponents.push(component);
	    removeChildren(base);
	  }

	  applyRef(component.__ref, null);
	}

	function Component(props, context) {
	  this._dirty = true;
	  this.context = context;
	  this.props = props;
	  this.state = this.state || {};
	  this._renderCallbacks = [];
	}

	extend(Component.prototype, {
	  setState: function setState(state, callback) {
	    if (!this.prevState) this.prevState = this.state;
	    this.state = extend(extend({}, this.state), typeof state === 'function' ? state(this.state, this.props) : state);
	    if (callback) this._renderCallbacks.push(callback);
	    enqueueRender(this);
	  },
	  forceUpdate: function forceUpdate(callback) {
	    if (callback) this._renderCallbacks.push(callback);
	    renderComponent(this, 2);
	  },
	  render: function render() {}
	});

	function render(vnode, parent, merge) {
	  return diff(merge, vnode, {}, false, parent, false);
	}

	function createRef() {
	  return {};
	}

	var preact = {
	  h: h,
	  createElement: h,
	  cloneElement: cloneElement,
	  createRef: createRef,
	  Component: Component,
	  render: render,
	  rerender: rerender,
	  options: options
	};

	var preact$1 = /*#__PURE__*/Object.freeze({
		'default': preact,
		h: h,
		createElement: h,
		cloneElement: cloneElement,
		createRef: createRef,
		Component: Component,
		render: render,
		rerender: rerender,
		options: options
	});

	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

	function getCjsExportFromNamespace (n) {
		return n && n['default'] || n;
	}

	var require$$0 = getCjsExportFromNamespace(preact$1);

	var preact$2 = createCommonjsModule(function (module, exports) {
	var t = require$$0;

	function n(t, n) {
	  for (var r in n) t[r] = n[r];

	  return t;
	}

	function r(t) {
	  this.getChildContext = function () {
	    return {
	      store: t.store
	    };
	  };
	}

	r.prototype.render = function (t) {
	  return t.children && t.children[0] || t.children;
	}, exports.connect = function (r, e) {
	  var o;
	  return "function" != typeof r && ("string" == typeof (o = r || {}) && (o = o.split(/\s*,\s*/)), r = function (t) {
	    for (var n = {}, r = 0; r < o.length; r++) n[o[r]] = t[o[r]];

	    return n;
	  }), function (o) {
	    function i(i, u) {
	      var c = this,
	          f = u.store,
	          s = r(f ? f.getState() : {}, i),
	          a = e ? function (t, n) {
	        "function" == typeof t && (t = t(n));
	        var r = {};

	        for (var e in t) r[e] = n.action(t[e]);

	        return r;
	      }(e, f) : {
	        store: f
	      },
	          p = function () {
	        var t = r(f ? f.getState() : {}, i);

	        for (var n in t) if (t[n] !== s[n]) return s = t, c.setState({});

	        for (var e in s) if (!(e in t)) return s = t, c.setState({});
	      };

	      this.componentWillReceiveProps = function (t) {
	        i = t, p();
	      }, this.componentDidMount = function () {
	        f.subscribe(p);
	      }, this.componentWillUnmount = function () {
	        f.unsubscribe(p);
	      }, this.render = function (r) {
	        return t.h(o, n(n(n({}, a), r), s));
	      };
	    }

	    return (i.prototype = new t.Component()).constructor = i;
	  };
	}, exports.Provider = r;
	});
	var preact_1 = preact$2.connect;
	var preact_2 = preact$2.Provider;

	function n(n, t) {
	  for (var r in t) n[r] = t[r];

	  return n;
	}

	function createStore (t) {
	  var r = [];

	  function u(n) {
	    for (var t = [], u = 0; u < r.length; u++) r[u] === n ? n = null : t.push(r[u]);

	    r = t;
	  }

	  function e(u, e, f) {
	    t = e ? u : n(n({}, t), u);

	    for (var i = r, o = 0; o < i.length; o++) i[o](t, f);
	  }

	  return t = t || {}, {
	    action: function (n) {
	      function r(t) {
	        e(t, !1, n);
	      }

	      return function () {
	        for (var u = arguments, e = [t], f = 0; f < arguments.length; f++) e.push(u[f]);

	        var i = n.apply(this, e);
	        if (null != i) return i.then ? i.then(r) : r(i);
	      };
	    },
	    setState: e,
	    subscribe: function (n) {
	      return r.push(n), function () {
	        u(n);
	      };
	    },
	    unsubscribe: u,
	    getState: function () {
	      return t;
	    }
	  };
	}

	var devtools = function unistoreDevTools(store) {
	  var extension = window.__REDUX_DEVTOOLS_EXTENSION__ || window.top.__REDUX_DEVTOOLS_EXTENSION__;
	  var ignoreState = false;

	  if (!extension) {
	    console.warn('Please install/enable Redux devtools extension');
	    store.devtools = null;
	    return store;
	  }

	  if (!store.devtools) {
	    store.devtools = extension.connect();
	    store.devtools.subscribe(function (message) {
	      if (message.type === 'DISPATCH' && message.state) {
	        ignoreState = message.payload.type === 'JUMP_TO_ACTION' || message.payload.type === 'JUMP_TO_STATE';
	        store.setState(JSON.parse(message.state), true);
	      }
	    });
	    store.devtools.init(store.getState());
	    store.subscribe(function (state, action) {
	      var actionName = action && action.name || 'setState';

	      if (!ignoreState) {
	        store.devtools.send(actionName, state);
	      } else {
	        ignoreState = false;
	      }
	    });
	  }

	  return store;
	};

	const initialState = {
	  posts: [],
	  user: {
	    name: "stuart",
	    email: "shrunyan@gmail.com"
	  }
	};
	const store = devtools(createStore(initialState));

	function _defineProperty(obj, key, value) {
	  if (key in obj) {
	    Object.defineProperty(obj, key, {
	      value: value,
	      enumerable: true,
	      configurable: true,
	      writable: true
	    });
	  } else {
	    obj[key] = value;
	  }

	  return obj;
	}

	var EMPTY$1 = {};

	function assign(obj, props) {
	  // eslint-disable-next-line guard-for-in
	  for (var i in props) {
	    obj[i] = props[i];
	  }

	  return obj;
	}

	function exec(url, route, opts) {
	  var reg = /(?:\?([^#]*))?(#.*)?$/,
	      c = url.match(reg),
	      matches = {},
	      ret;

	  if (c && c[1]) {
	    var p = c[1].split('&');

	    for (var i = 0; i < p.length; i++) {
	      var r = p[i].split('=');
	      matches[decodeURIComponent(r[0])] = decodeURIComponent(r.slice(1).join('='));
	    }
	  }

	  url = segmentize(url.replace(reg, ''));
	  route = segmentize(route || '');
	  var max = Math.max(url.length, route.length);

	  for (var i$1 = 0; i$1 < max; i$1++) {
	    if (route[i$1] && route[i$1].charAt(0) === ':') {
	      var param = route[i$1].replace(/(^\:|[+*?]+$)/g, ''),
	          flags = (route[i$1].match(/[+*?]+$/) || EMPTY$1)[0] || '',
	          plus = ~flags.indexOf('+'),
	          star = ~flags.indexOf('*'),
	          val = url[i$1] || '';

	      if (!val && !star && (flags.indexOf('?') < 0 || plus)) {
	        ret = false;
	        break;
	      }

	      matches[param] = decodeURIComponent(val);

	      if (plus || star) {
	        matches[param] = url.slice(i$1).map(decodeURIComponent).join('/');
	        break;
	      }
	    } else if (route[i$1] !== url[i$1]) {
	      ret = false;
	      break;
	    }
	  }

	  if (opts.default !== true && ret === false) {
	    return false;
	  }

	  return matches;
	}

	function pathRankSort(a, b) {
	  return a.rank < b.rank ? 1 : a.rank > b.rank ? -1 : a.index - b.index;
	} // filter out VNodes without attributes (which are unrankeable), and add `index`/`rank` properties to be used in sorting.


	function prepareVNodeForRanking(vnode, index) {
	  vnode.index = index;
	  vnode.rank = rankChild(vnode);
	  return vnode.attributes;
	}

	function segmentize(url) {
	  return url.replace(/(^\/+|\/+$)/g, '').split('/');
	}

	function rankSegment(segment) {
	  return segment.charAt(0) == ':' ? 1 + '*+?'.indexOf(segment.charAt(segment.length - 1)) || 4 : 5;
	}

	function rank(path) {
	  return segmentize(path).map(rankSegment).join('');
	}

	function rankChild(vnode) {
	  return vnode.attributes.default ? 0 : rank(vnode.attributes.path);
	}

	var customHistory = null;
	var ROUTERS = [];
	var subscribers = [];
	var EMPTY = {};

	function isPreactElement(node) {
	  return node.__preactattr_ != null || typeof Symbol !== 'undefined' && node[Symbol.for('preactattr')] != null;
	}

	function setUrl(url, type) {
	  if (type === void 0) type = 'push';

	  if (customHistory && customHistory[type]) {
	    customHistory[type](url);
	  } else if (typeof history !== 'undefined' && history[type + 'State']) {
	    history[type + 'State'](null, null, url);
	  }
	}

	function getCurrentUrl() {
	  var url;

	  if (customHistory && customHistory.location) {
	    url = customHistory.location;
	  } else if (customHistory && customHistory.getCurrentLocation) {
	    url = customHistory.getCurrentLocation();
	  } else {
	    url = typeof location !== 'undefined' ? location : EMPTY;
	  }

	  return "" + (url.pathname || '') + (url.search || '');
	}

	function route(url, replace) {
	  if (replace === void 0) replace = false;

	  if (typeof url !== 'string' && url.url) {
	    replace = url.replace;
	    url = url.url;
	  } // only push URL into history if we can handle it


	  if (canRoute(url)) {
	    setUrl(url, replace ? 'replace' : 'push');
	  }

	  return routeTo(url);
	}
	/** Check if the given URL can be handled by any router instances. */


	function canRoute(url) {
	  for (var i = ROUTERS.length; i--;) {
	    if (ROUTERS[i].canRoute(url)) {
	      return true;
	    }
	  }

	  return false;
	}
	/** Tell all router instances to handle the given URL.  */


	function routeTo(url) {
	  var didRoute = false;

	  for (var i = 0; i < ROUTERS.length; i++) {
	    if (ROUTERS[i].routeTo(url) === true) {
	      didRoute = true;
	    }
	  }

	  for (var i$1 = subscribers.length; i$1--;) {
	    subscribers[i$1](url);
	  }

	  return didRoute;
	}

	function routeFromLink(node) {
	  // only valid elements
	  if (!node || !node.getAttribute) {
	    return;
	  }

	  var href = node.getAttribute('href'),
	      target = node.getAttribute('target'); // ignore links with targets and non-path URLs

	  if (!href || !href.match(/^\//g) || target && !target.match(/^_?self$/i)) {
	    return;
	  } // attempt to route, if no match simply cede control to browser


	  return route(href);
	}

	function handleLinkClick(e) {
	  if (e.button == 0) {
	    routeFromLink(e.currentTarget || e.target || this);
	    return prevent(e);
	  }
	}

	function prevent(e) {
	  if (e) {
	    if (e.stopImmediatePropagation) {
	      e.stopImmediatePropagation();
	    }

	    if (e.stopPropagation) {
	      e.stopPropagation();
	    }

	    e.preventDefault();
	  }

	  return false;
	}

	function delegateLinkHandler(e) {
	  // ignore events the browser takes care of already:
	  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.button !== 0) {
	    return;
	  }

	  var t = e.target;

	  do {
	    if (String(t.nodeName).toUpperCase() === 'A' && t.getAttribute('href') && isPreactElement(t)) {
	      if (t.hasAttribute('native')) {
	        return;
	      } // if link is handled by the router, prevent browser defaults


	      if (routeFromLink(t)) {
	        return prevent(e);
	      }
	    }
	  } while (t = t.parentNode);
	}

	var eventListenersInitialized = false;

	function initEventListeners() {
	  if (eventListenersInitialized) {
	    return;
	  }

	  if (typeof addEventListener === 'function') {
	    if (!customHistory) {
	      addEventListener('popstate', function () {
	        routeTo(getCurrentUrl());
	      });
	    }

	    addEventListener('click', delegateLinkHandler);
	  }

	  eventListenersInitialized = true;
	}

	var Router = function (Component$$1) {
	  function Router(props) {
	    Component$$1.call(this, props);

	    if (props.history) {
	      customHistory = props.history;
	    }

	    this.state = {
	      url: props.url || getCurrentUrl()
	    };
	    initEventListeners();
	  }

	  if (Component$$1) Router.__proto__ = Component$$1;
	  Router.prototype = Object.create(Component$$1 && Component$$1.prototype);
	  Router.prototype.constructor = Router;

	  Router.prototype.shouldComponentUpdate = function shouldComponentUpdate(props) {
	    if (props.static !== true) {
	      return true;
	    }

	    return props.url !== this.props.url || props.onChange !== this.props.onChange;
	  };
	  /** Check if the given URL can be matched against any children */


	  Router.prototype.canRoute = function canRoute(url) {
	    return this.getMatchingChildren(this.props.children, url, false).length > 0;
	  };
	  /** Re-render children with a new URL to match against. */


	  Router.prototype.routeTo = function routeTo(url) {
	    this._didRoute = false;
	    this.setState({
	      url: url
	    }); // if we're in the middle of an update, don't synchronously re-route.

	    if (this.updating) {
	      return this.canRoute(url);
	    }

	    this.forceUpdate();
	    return this._didRoute;
	  };

	  Router.prototype.componentWillMount = function componentWillMount() {
	    ROUTERS.push(this);
	    this.updating = true;
	  };

	  Router.prototype.componentDidMount = function componentDidMount() {
	    var this$1 = this;

	    if (customHistory) {
	      this.unlisten = customHistory.listen(function (location) {
	        this$1.routeTo("" + (location.pathname || '') + (location.search || ''));
	      });
	    }

	    this.updating = false;
	  };

	  Router.prototype.componentWillUnmount = function componentWillUnmount() {
	    if (typeof this.unlisten === 'function') {
	      this.unlisten();
	    }

	    ROUTERS.splice(ROUTERS.indexOf(this), 1);
	  };

	  Router.prototype.componentWillUpdate = function componentWillUpdate() {
	    this.updating = true;
	  };

	  Router.prototype.componentDidUpdate = function componentDidUpdate() {
	    this.updating = false;
	  };

	  Router.prototype.getMatchingChildren = function getMatchingChildren(children, url, invoke) {
	    return children.filter(prepareVNodeForRanking).sort(pathRankSort).map(function (vnode) {
	      var matches = exec(url, vnode.attributes.path, vnode.attributes);

	      if (matches) {
	        if (invoke !== false) {
	          var newProps = {
	            url: url,
	            matches: matches
	          };
	          assign(newProps, matches);
	          delete newProps.ref;
	          delete newProps.key;
	          return cloneElement(vnode, newProps);
	        }

	        return vnode;
	      }
	    }).filter(Boolean);
	  };

	  Router.prototype.render = function render(ref, ref$1) {
	    var children = ref.children;
	    var onChange = ref.onChange;
	    var url = ref$1.url;
	    var active = this.getMatchingChildren(children, url, true);
	    var current = active[0] || null;
	    this._didRoute = !!current;
	    var previous = this.previousUrl;

	    if (url !== previous) {
	      this.previousUrl = url;

	      if (typeof onChange === 'function') {
	        onChange({
	          router: this,
	          url: url,
	          previous: previous,
	          active: active,
	          current: current
	        });
	      }
	    }

	    return current;
	  };

	  return Router;
	}(Component);

	var Link = function (props) {
	  return h('a', assign({
	    onClick: handleLinkClick
	  }, props));
	};

	var Route = function (props) {
	  return h(props.component, props);
	};

	Router.subscribers = subscribers;
	Router.getCurrentUrl = getCurrentUrl;
	Router.route = route;
	Router.Router = Router;
	Router.Route = Route;
	Router.Link = Link;

	var classnames = createCommonjsModule(function (module) {
	/*!
	  Copyright (c) 2017 Jed Watson.
	  Licensed under the MIT License (MIT), see
	  http://jedwatson.github.io/classnames
	*/

	/* global define */
	(function () {

	  var hasOwn = {}.hasOwnProperty;

	  function classNames() {
	    var classes = [];

	    for (var i = 0; i < arguments.length; i++) {
	      var arg = arguments[i];
	      if (!arg) continue;
	      var argType = typeof arg;

	      if (argType === 'string' || argType === 'number') {
	        classes.push(arg);
	      } else if (Array.isArray(arg) && arg.length) {
	        var inner = classNames.apply(null, arg);

	        if (inner) {
	          classes.push(inner);
	        }
	      } else if (argType === 'object') {
	        for (var key in arg) {
	          if (hasOwn.call(arg, key) && arg[key]) {
	            classes.push(key);
	          }
	        }
	      }
	    }

	    return classes.join(' ');
	  }

	  if (module.exports) {
	    classNames.default = classNames;
	    module.exports = classNames;
	  } else {
	    window.classNames = classNames;
	  }
	})();
	});

	var style = {"AppFooter":"app-footer_AppFooter__2uHyF"};

	const AppFooter = () => h("footer", {
	  class: classnames(style.AppFooter)
	}, "~ PWA 2019 ~");

	const NotFound = () => h("div", null, h("h1", null, "This page doesn't exist"));

	var style$1 = {"Home":"home_Home__15ZTn"};

	const posts = store => ({
	  fetchPosts: () => {
	    return fetch(`https://ff0a866f76673cb912624bff98a414d2-dev.preview.zestyio.localdev:3020/-/instant/6-5aa1f33-h2z6pc.json`).then(res => res.json).then(json => store.setState("posts", json.data)).catch(err => {
	      console.log(err); // store.setState("error:posts", err)
	    });
	  }
	});

	var Home = preact_1("posts", posts)(({
	  posts,
	  fetchPosts
	}) => {
	  fetchPosts().then(() => {
	    console.log(posts);
	  });
	  return h("div", {
	    class: style$1.Home
	  }, h("article", {
	    class: "demo-card-wide mdl-card mdl-shadow--2dp"
	  }, h("div", {
	    class: "mdl-card__title"
	  }, h("h2", {
	    class: "mdl-card__title-text"
	  }, "Welcome Home")), h("div", {
	    class: "mdl-card__supporting-text"
	  }, "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sagittis pellentesque lacus eleifend lacinia..."), h("div", {
	    class: "mdl-card__actions mdl-card--border"
	  }, h("a", {
	    class: "mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect"
	  }, "Get Started")), h("div", {
	    class: "mdl-card__menu"
	  }, h("button", {
	    class: "mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect"
	  }, h("i", {
	    class: "material-icons"
	  }, "share")))), h("article", {
	    class: "demo-card-wide mdl-card mdl-shadow--2dp"
	  }, h("div", {
	    class: "mdl-card__title"
	  }, h("h2", {
	    class: "mdl-card__title-text"
	  }, "Card 2")), h("div", {
	    class: "mdl-card__supporting-text"
	  }, "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sagittis pellentesque lacus eleifend lacinia..."), h("div", {
	    class: "mdl-card__actions mdl-card--border"
	  }, h("a", {
	    class: "mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect"
	  }, "Get Started")), h("div", {
	    class: "mdl-card__menu"
	  }, h("button", {
	    class: "mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect"
	  }, h("i", {
	    class: "material-icons"
	  }, "share")))), h("article", {
	    class: "demo-card-wide mdl-card mdl-shadow--2dp"
	  }, h("div", {
	    class: "mdl-card__title"
	  }, h("h2", {
	    class: "mdl-card__title-text"
	  }, "Card 3")), h("div", {
	    class: "mdl-card__supporting-text"
	  }, "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sagittis pellentesque lacus eleifend lacinia..."), h("div", {
	    class: "mdl-card__actions mdl-card--border"
	  }, h("a", {
	    class: "mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect"
	  }, "Get Started")), h("div", {
	    class: "mdl-card__menu"
	  }, h("button", {
	    class: "mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect"
	  }, h("i", {
	    class: "material-icons"
	  }, "share")))), h("article", {
	    class: "demo-card-wide mdl-card mdl-shadow--2dp"
	  }, h("div", {
	    class: "mdl-card__title"
	  }, h("h2", {
	    class: "mdl-card__title-text"
	  }, "Card 4")), h("div", {
	    class: "mdl-card__supporting-text"
	  }, "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sagittis pellentesque lacus eleifend lacinia..."), h("div", {
	    class: "mdl-card__actions mdl-card--border"
	  }, h("a", {
	    class: "mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect"
	  }, "Get Started")), h("div", {
	    class: "mdl-card__menu"
	  }, h("button", {
	    class: "mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect"
	  }, h("i", {
	    class: "material-icons"
	  }, "share")))), h("article", {
	    class: "demo-card-wide mdl-card mdl-shadow--2dp"
	  }, h("div", {
	    class: "mdl-card__title"
	  }, h("h2", {
	    class: "mdl-card__title-text"
	  }, "Card 5")), h("div", {
	    class: "mdl-card__supporting-text"
	  }, "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sagittis pellentesque lacus eleifend lacinia..."), h("div", {
	    class: "mdl-card__actions mdl-card--border"
	  }, h("a", {
	    class: "mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect"
	  }, "Get Started")), h("div", {
	    class: "mdl-card__menu"
	  }, h("button", {
	    class: "mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect"
	  }, h("i", {
	    class: "material-icons"
	  }, "share")))), h("article", {
	    class: "demo-card-wide mdl-card mdl-shadow--2dp"
	  }, h("div", {
	    class: "mdl-card__title"
	  }, h("h2", {
	    class: "mdl-card__title-text"
	  }, "Card 6")), h("div", {
	    class: "mdl-card__supporting-text"
	  }, "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sagittis pellentesque lacus eleifend lacinia..."), h("div", {
	    class: "mdl-card__actions mdl-card--border"
	  }, h("a", {
	    class: "mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect"
	  }, "Get Started")), h("div", {
	    class: "mdl-card__menu"
	  }, h("button", {
	    class: "mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect"
	  }, h("i", {
	    class: "material-icons"
	  }, "share")))));
	});

	var style$2 = {"Post":"post_Post__18CRe"};

	class Post extends Component {
	  render(props, state) {
	    return h("div", {
	      class: style$2.Post
	    }, h("article", {
	      class: "demo-card-wide mdl-card mdl-shadow--2dp"
	    }, h("div", {
	      class: "mdl-card__title"
	    }, h("h2", {
	      class: "mdl-card__title-text"
	    }, "Post One")), h("div", {
	      class: "mdl-card__supporting-text"
	    }, "POST DESCRIPTION"), h("div", {
	      class: "mdl-card__actions mdl-card--border"
	    }, h("a", {
	      class: "mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect"
	    }, "Get Started")), h("div", {
	      class: "mdl-card__menu"
	    }, h("button", {
	      class: "mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect"
	    }, h("i", {
	      class: "material-icons"
	    }, "share")))));
	  }

	}

	var style$3 = {"Shell":"shell_Shell__1ZDtv","AppMenuBtn":"shell_AppMenuBtn__1bKp-","AppMenu":"shell_AppMenu__1VC8e"};

	class Shell extends Component {
	  constructor(...args) {
	    super(...args);

	    _defineProperty(this, "handleRoute", e => {
	      this.currentUrl = e.url;
	    });
	  }

	  render(props, state, store) {
	    console.log("Shell:render", props, state, store);
	    return h("section", {
	      class: classnames(style$3.Shell, "mdl-layout mdl-js-layout")
	    }, h("main", {
	      class: "mdl-layout__content"
	    }, h(Router, {
	      onChange: this.handleRoute
	    }, h(Home, {
	      path: "/"
	    }), h(Post, {
	      path: "/posts/:id"
	    }), h(NotFound, {
	      default: true
	    })), h("button", {
	      id: "menu-lower-right",
	      class: classnames(style$3.AppMenuBtn, "mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored")
	    }, h("i", {
	      class: "material-icons"
	    }, "more_vert")), h("div", {
	      class: style$3.AppMenu
	    }, h("ul", {
	      class: classnames("mdl-menu mdl-menu--top-right mdl-js-menu mdl-js-ripple-effect"),
	      for: "menu-lower-right"
	    }, h("li", {
	      class: "mdl-menu__item"
	    }, "Some Action"), h("li", {
	      class: "mdl-menu__item"
	    }, "Another Action"), h("li", {
	      disabled: true,
	      class: "mdl-menu__item"
	    }, "Disabled Action"), h("li", {
	      class: "mdl-menu__item"
	    }, "Yet Another Action"))), h(AppFooter, null)));
	  }

	}

	render(h(preact_2, {
	  store: store
	}, h(Shell, null)), document.body);

}());
