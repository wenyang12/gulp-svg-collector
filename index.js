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

// 搜索img加载的svg图片
const REG_SVG = /<img.*\s+src=["|'](.+\.svg)["|'][^>]*>/gi;
// 匹配className属性
const REG_CLASSNAME = /class=["|']([^"']+)["|']/i;

const getMatchs = (data, reg) => {
  let matchs = [];
  let match = null;
  while ((match = reg.exec(data))) {
    matchs.push(match);
  }
  return matchs;
};

const collect = (html) => {
  let matchs = getMatchs(html, REG_SVG);
  return matchs.map(match => {
    return match[1];
  });
};

const getSVG = (svg, attrs) => (
  `<svg role="img" class="${attrs.className} ${attrs.id}">
  <use xlink:href="${svg}#${attrs.id}" />
</svg>`);

const replace = (html, options) => {
  let matchs = getMatchs(html, REG_SVG);
  matchs.forEach(match => {
    let img = match[0];
    let svg = match[1];

    let id = path.basename(svg, '.svg');
    let classNameMatch = img.match(REG_CLASSNAME);
    let className = classNameMatch ? classNameMatch[1] : '';

    html = html.replace(img, getSVG(options.svgPath, {
      id: id,
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

    let pathname = file.path;
    let base = path.dirname(pathname);
    let files = collect(file.contents.toString()).map(svg => {
      let contents = fs.readFileSync(base + svg);
      return new File({
        cwd: './',
        base: './',
        path: path.basename(svg),
        contents: contents
      });
    });

    files.forEach(file => this.push(file));
    cb(null);
  });
};

module.exports.replace = (dest) => {
  return through2.obj((file, enc, cb) => {
    if (file.isNull()) {
      return cb(null, file);
    }

    let base = path.dirname(file.path);
    let page = path.basename(file.path, '.html');
    let html = file.contents.toString();

    html = replace(html, {
      svgPath: `${dest}/${page}.svg`,
      base: base
    });

    file.contents = new Buffer(html);
    cb(null, file);
  });
}
