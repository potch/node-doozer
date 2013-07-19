var fs = require('fs');
var http = require('http');
var jsdom = require('jsdom');
var path = require('path');
var uglifyjs = require('uglify-js');
var cleancss = require('clean-css');

exports.build = function build(file) {
  fs.readFile(file, {encoding: 'utf8'}, function(err, content) {
    if (err) {
      console.error('error loading document:');
      console.log(err);
      return;
    }
    content = content.toString();
    jsdom.env(content, function(err, win) {
      if (err) {
        console.error('error loading document:');
        console.log(err);
        return;
      }

      var doc = win.document;
      var concat = '';
      var rootPath = path.dirname(file) + '/';

      if (!fs.existsSync(rootPath + 'build')) {
        fs.mkdirSync(rootPath + 'build');
      }
      var buildPath = rootPath + '/build/';

      var scripts = doc.querySelectorAll('script');
      var styles = doc.querySelectorAll('style, link[rel="stylesheet"]');

      scripts = Array.prototype.slice.call(scripts);
      scripts.forEach(function (tag) {
        var src = tag.getAttribute('src');
        if (src) {
          concat += fs.readFileSync(rootPath + src);
        } else {
          concat += tag.innerHTML;
        }
        cleanRemove(tag);
      });
      minified = uglifyjs.minify(concat, {fromString: true, mangle: true});
      fs.writeFileSync(buildPath + 'app.min.js', minified.code);
      var script = doc.createElement('script');
      script.setAttribute('src', 'app.min.js');
      prettyAppend(doc.body, script);

      concat = '';
      styles = Array.prototype.slice.call(styles);
      styles.forEach(function (tag) {
        if (tag.nodeName === 'STYLE') {
          concat += tag.innerHTML;
        } else if (tag.nodeName === 'LINK') {
          concat += fs.readFileSync(rootPath + tag.href);
        }
        cleanRemove(tag);
      });
      minified = cleancss.process(concat);
      fs.writeFileSync(buildPath + 'app.min.css', minified);
      var style = doc.createElement('link');
      style.setAttribute('href', 'app.min.css');
      style.setAttribute('rel', 'stylesheet');
      prettyAppend(doc.head, style);

      fs.writeFileSync(buildPath + path.basename(file), doc._doctype._fullDT + doc.outerHTML);
      console.log('wrote ' + buildPath + path.basename(file));
    });
  });
}

function findIndent(node) {
  for (var i=0; i<node.childNodes.length; i++) {
    var n = node.childNodes[i];
    if (n.nodeType === 3) {
      if (n.nodeValue.match(/^\n[ \t]+$/)) {
        return n.nodeValue;
      }
    }
    if (n.nodeType === 1) {
      return findIndent(n);
    }
  }
  return '';
}

function text(node, text) {
  return node.ownerDocument.createTextNode(text);
}

function cleanRemove(node) {
  if (node.previousSibling.nodeType === 3) {
    node.parentNode.removeChild(node.previousSibling)
  }
  node.parentNode.removeChild(node);
}

function prettyAppend(node, child) {
  var indent = findIndent(node);
  if (node.lastChild.nodeType === 3) {
    node.insertBefore(text(node, indent), node.lastChild);
    node.insertBefore(child, node.lastChild);
  } else {
    node.appendChild(text(node, indent));
    node.appendChild(child);
    node.appendChild(text(node, '\n'));
  }
}
