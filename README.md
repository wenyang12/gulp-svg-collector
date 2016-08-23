# gulp-svg-collector

> 收集页面中的svg图片，替换为svg sprite，并兼容老IE fallback


替换前：
```html
<!--# include file="./images/test.svg" -->
```

替换后：
```html
<svg role="img" class="icon-test">
  <defs><!--[if lte IE 8]><img src="/assets/images/test.png"><![endif]--></defs>
  <use xlink:href="#icon-test"></use>
</svg>
```

`defs`标签内的`img`是老IE的fallback，不能识别svg的浏览器会认识defs内的img，并渲染出来。
