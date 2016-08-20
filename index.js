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
  return matchs.map(match => {
    return match[1];
  });
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

    let id = options.id || path.basename(svg, '.svg');
    let fallback = svg.replace('.svg', options.fallbackExt);
    let classNameMatch = img.match(REG_CLASSNAME);
    let className = classNameMatch ? classNameMatch[1] : '';

    html = html.replace(img, getSVGXML(options.svg, fallback, {
      id: typeof id === 'function' ? id(path.dirname(svg), path.basename(svg, '.svg')) : id,
      className: className
    }));
  });
  return html;
};

module.exports.collect = () => {
  return through2.obj(function(file, enc, cb) {
    if (file.isNull()) {
      return cb(null, file);
    }

    let dirname = path.dirname(file.path);

    let files = collect(file.contents.toString()).map(svg => {
      let pathname = dirname + svg;
      return new File({
        path: pathname,
        contents: fs.readFileSync(pathname)
      });
    });

    files.forEach(file => this.push(file));
    cb(null);
  });
};

module.exports.replace = (dest, options) => {
  return through2.obj((file, enc, cb) => {
    if (file.isNull()) {
      return cb(null, file);
    }

    let page = path.basename(file.path, '.html');
    let html = file.contents.toString();

    html = replace(html, Object.assign({
      svg: `${dest}/${page}.svg`,
      fallbackExt: '.png'
    }, options || {}));

    file.contents = new Buffer(html);
    cb(null, file);
  });
}
