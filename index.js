/**
 * 搜寻页面中通过img加载的svg图片，适配为svg symbol加载方式和老IE fallback
 * 1.适配前：
 * <img src="/assets/images/icon-test.svg">
 * 2.适配后：
 * <svg>
 *  <defs><img src="/assets/images/icon-test.png"></defs>
 *  <use xlink:href="/assets/svgs/xxx.svg#icon-test"></use>
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

// 搜索img加载的svg图片
const REG_SVG = /<img.*\s+src=["|'](.+\.svg)["|'][^>]*>/gi;
// 匹配className属性
const REG_CLASSNAME = /class=["|']([^"']+)["|']/i;

const collect = (html) => {
  let matchs = getMatchs(html, REG_SVG);
  return matchs.map(match => match[1]);
};

const getSVGXML = (svg, fallback, attrs) => (
  `<svg role="img" class="${attrs.className} ${attrs.id}">
  <defs><!--[if lte IE 8]><img class="${attrs.className} ${attrs.id}" src="${fallback}" _nowebp><![endif]--></defs>
  <use xlink:href="${svg}#${attrs.id}"></use>
</svg>`);

const replace = (html, options) => {
  let matchs = getMatchs(html, REG_SVG);
  matchs.forEach(match => {
    let img = match[0];
    let svg = match[1];

    let basename = path.basename(svg, '.svg');
    let id = options.id || basename;
    let fallback = svg.replace('.svg', options.fallbackExt);
    let classNameMatch = img.match(REG_CLASSNAME);
    let className = classNameMatch ? classNameMatch[1] : '';

    html = html.replace(img, getSVGXML(options.svg, fallback, {
      id: typeof id === 'function' ? id(path.dirname(svg), basename) : id,
      className: className
    }));
  });
  return html;
};

module.exports.collect = () => {
  return through2.obj(function(file, enc, cb) {
    if (file.isNull()) return cb(null, file);

    let dirname = path.dirname(file.path);
    let svgs = collect(file.contents.toString());

    for (let svg of svgs) {
      let pathname = dirname + svg;
      let file = new File({
        path: pathname,
        contents: fs.readFileSync(pathname)
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

  return through2.obj((file, enc, cb) => {
    if (file.isNull()) return cb(null, file);

    let page = path.basename(file.path, '.html');
    let html = file.contents.toString();

    html = replace(html, {
      svg: path.join(options.dirname, `${page}.svg`),
      id: options.id,
      fallbackExt: options.fallbackExt
    });

    file.contents = new Buffer(html);
    cb(null, file);
  });
}
