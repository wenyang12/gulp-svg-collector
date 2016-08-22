# gulp-svg-collector

> 搜寻页面中通过img加载的svg图片，适配为svg symbol加载方式和老IE fallback


适配前：
```html
<img class="icon" src="/assets/images/icon-test.svg">
```

适配后：
```html
<svg role="img" class="icon icon-test">
  <defs><img class="icon" src="/assets/images/icon-test.png"></defs>
  <use xlink:href="/assets/svgs/xxx.svg#icon-test"></use>
</svg>
```

`defs`标签内的`img`是老IE的fallback，不能识别svg的浏览器会认识defs内的img，并渲染出来。
