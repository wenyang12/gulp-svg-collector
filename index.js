/**
 * 收集页面中的svg图片，替换为svg sprite，并兼容老IE fallback
 * 1.替换前：
 * <!--# include file="./images/test.svg" -->
 * 2.替换后：
 * <svg>
 *  <defs><!--[if lte IE 8]><img src="/assets/images/test.png"><![endif]--></defs>
 *  <use xlink:href="#test"></use>
 * </svg>
 * @author luoying
 */

'use strict';

const fs = require('fs');
const path = require('path');
const through2 = require('through2');
const gutil = require('gulp-util');
const File = gutil.File;
const getMatchs = require('@tools/matchs');

// 搜索svg图片
const REG_SVG = /<!\-\-\#\s*include\s+(file|virtual)=["|'](.+)["|']\s*\-\->/gi;

const collect = (html, options) => {
  let res = [];
  let matchs = getMatchs(html, REG_SVG);

  matchs.forEach(m => {
    let url = m[2];
    let ext = path.extname(url);
    url = m[1] === 'virtual' ? path.join(options.root, url) : path.resolve(options.base, url);

    if (ext === '.svg') {
      res.push({
        parent: options.path,
        path: url,
        include: m[0]
      });
      return;
    }

    let content = fs.readFileSync(url, 'utf8');
    let next = collect(content, {
      path: url,
      base: path.dirname(url),
      root: options.root
    });
    res.push.apply(res, next);
  });

  return res;
};

// 去重，重复图标只需要存入一次即可
const unique = (svgs) => {
  let map = {};
  let uniqArr = [];
  for (let svg of svgs) {
    if (!map[svg.path]) {
      map[svg.path] = 1;
      uniqArr.push(svg);
    }
  }
  return uniqArr;
};

const getSVGXML = (id, fallback) => (
  `<svg role="img" class="${id}">
  <defs><!--[if lte IE 8]><img class="${id}" src="${fallback}" _nowebp><![endif]--></defs>
  <use xlink:href="#${id}"></use>
</svg>`);

const replace = (html, options) => {
  let svg = options.svg;
  let dirname = path.dirname(svg);
  let basename = path.basename(svg, '.svg');
  let id = options.id || basename;
  id = typeof id === 'function' ? id(dirname, basename) : id;

  let fallback = svg.replace('.svg', options.fallbackExt);
  let xml = getSVGXML(id, fallback);
  html = html.replace(options.include, xml);

  return html;
};

module.exports.collect = () => {
  return through2.obj(function(file, enc, cb) {
    if (file.isNull()) return cb(null, file);

    let base = file.base;
    let html = file.contents.toString();

    // 收集svg元素，并去重
    let svgs = unique(collect(html, {
      path: file.path,
      base: base,
      root: base
    }));

    for (let svg of svgs) {
      let file = new File({
        base: base,
        path: svg.path,
        contents: fs.readFileSync(svg.path)
      });
      this.push(file);
    }

    cb();
  });
};

module.exports.replace = (options) => {
  options = Object.assign({
    dirname: './',
    id: null,
    fallbackExt: '.png'
  }, options || {});

  return through2.obj(function(file, enc, cb) {
    if (file.isNull()) return cb(null, file);

    let base = file.base
    let html = file.contents.toString();

    let svgs = collect(html, {
      path: file.path,
      base: base,
      root: base
    });

    let parents = {};
    for (let svg of svgs) {
      let parent = svg.parent;
      if (!parents[parent]) parents[parent] = [];
      parents[parent].push({
        path: svg.path,
        include: svg.include
      });
    }

    for (let parent in parents) {
      let svgs = parents[parent];
      let content = fs.readFileSync(parent, 'utf8');

      for (let svg of svgs) {
        content = replace(content, {
          svg: svg.path.replace(base, '/'),
          include: svg.include,
          id: options.id,
          fallbackExt: options.fallbackExt
        });
      }

      let file = new File({
        base: base,
        path: parent,
        contents: new Buffer(content)
      });
      this.push(file);
    }

    let page = path.basename(file.path, '.html');
    let sprite = `${options.dirname}/${page}.svg`;

    html = html.replace(/<body>/, `<body data-svg-src="${sprite}">`);
    file.contents = new Buffer(html);

    cb(null, file);
  });
}
